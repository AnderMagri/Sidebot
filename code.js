// ═══════════════════════════════════════════════════════════
// SIDEBOT v2.0 - AI-Powered PRD Validation + Notion Integration
// Claude Desktop ↔ Bridge Server ↔ Figma Plugin
// ═══════════════════════════════════════════════════════════

console.log('🤖 Sidebot v2.0 initializing...');

figma.showUI(__html__, { width: 360, height: 600, themeColors: true });

// ─── STORAGE KEYS ───
const STORAGE = {
  PROJECTS:       'sidebot_projects',
  ACTIVE_PROJECT: 'sidebot_active',
  PLUGIN_STATE:   'sidebot_state',
  NOTION_TOKEN:   'sidebot_notion_token',
  AUDIT_RESULTS:  'sidebot_audit_results',
  CLAUDE_API_KEY: 'sidebot_claude_api_key'
};

let pluginState = {
  activeProjectId: null,
  lastUpdate: null,
  bridgeConnected: false
};

// ─── INIT ───
async function initPlugin() {
  try {
    const projects    = await figma.clientStorage.getAsync(STORAGE.PROJECTS)      || [];
    const activeId    = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
    const state       = await figma.clientStorage.getAsync(STORAGE.PLUGIN_STATE)  || pluginState;
    const notionToken  = await figma.clientStorage.getAsync(STORAGE.NOTION_TOKEN)  || '';
    const claudeApiKey = await figma.clientStorage.getAsync(STORAGE.CLAUDE_API_KEY) || '';
    const auditResults = await figma.clientStorage.getAsync(STORAGE.AUDIT_RESULTS) || null;

    pluginState = state;
    console.log('✓ Plugin initialized. Projects:', projects.length);

    figma.ui.postMessage({
      type: 'init-complete',
      projects,
      activeId,
      state: pluginState,
      notionToken,
      claudeApiKey,
      auditResults
    });

    updateBridgeStatus(false);
  } catch (e) {
    console.error('Init failed:', e);
  }
}

async function saveState() {
  pluginState.lastUpdate = new Date().toISOString();
  await figma.clientStorage.setAsync(STORAGE.PLUGIN_STATE, pluginState);
}

function updateBridgeStatus(connected) {
  pluginState.bridgeConnected = connected;
  figma.ui.postMessage({ type: 'bridge-status', connected });
}

initPlugin();

// ─── HELPERS ───

/** Recursively collect all nodes of given types */
function collectNodes(root, types = []) {
  const results = [];
  function walk(node) {
    if (types.length === 0 || types.includes(node.type)) results.push(node);
    if ('children' in node) node.children.forEach(walk);
  }
  walk(root);
  return results;
}

/** Serialize a node for Claude analysis */
function serializeNode(node) {
  const base = {
    id:     node.id,
    name:   node.name,
    type:   node.type,
    width:  Math.round(node.width  || 0),
    height: Math.round(node.height || 0),
    x:      Math.round(node.x     || 0),
    y:      Math.round(node.y     || 0)
  };

  if (node.type === 'TEXT') {
    base.characters = node.characters;
    base.fontSize   = typeof node.fontSize   === 'number' ? node.fontSize   : null;
    base.fontName   = typeof node.fontName   === 'object' ? node.fontName   : null;
    base.fontWeight = typeof node.fontWeight === 'number' ? node.fontWeight : null;
    base.textAlignHorizontal = node.textAlignHorizontal;
    // Extract fill color for contrast checking
    if (Array.isArray(node.fills) && node.fills.length > 0) {
      const f = node.fills[0];
      if (f.type === 'SOLID') base.fillColor = f.color;
    }
  }

  if ('fills' in node && Array.isArray(node.fills)) {
    base.fills = node.fills.filter(f => f.visible !== false).map(f => ({
      type:  f.type,
      color: f.type === 'SOLID' ? f.color : null,
      opacity: (f.opacity !== null && f.opacity !== undefined) ? f.opacity : 1
    }));
  }

  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    base.strokes = node.strokes.map(s => ({ type: s.type, color: s.type === 'SOLID' ? s.color : null }));
    base.strokeWeight = node.strokeWeight;
  }

  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'GROUP') {
    base.layoutMode   = node.layoutMode;
    base.paddingTop    = node.paddingTop;
    base.paddingBottom = node.paddingBottom;
    base.paddingLeft   = node.paddingLeft;
    base.paddingRight  = node.paddingRight;
    base.itemSpacing   = node.itemSpacing;
    base.cornerRadius  = node.cornerRadius;
  }

  return base;
}

/** Deep scan of selection for audit */
function deepScanSelection(nodes) {
  const allText   = [];
  const allFrames = [];
  const allImages = [];

  nodes.forEach(root => {
    collectNodes(root, ['TEXT']).forEach(n => allText.push(serializeNode(n)));
    collectNodes(root, ['FRAME', 'COMPONENT', 'INSTANCE']).forEach(n => allFrames.push(serializeNode(n)));
    collectNodes(root, ['RECTANGLE']).forEach(n => {
      if (Array.isArray(n.fills) && n.fills.some(f => f.type === 'IMAGE')) {
        allImages.push(serializeNode(n));
      }
    });
  });

  return {
    textNodes:   allText,
    frameNodes:  allFrames,
    imageNodes:  allImages,
    rootNames:   nodes.map(n => n.name),
    pageName:    figma.currentPage.name,
    fileKey:     figma.fileKey
  };
}

// ─── UTILS ───
function uint8ArrayToBase64(bytes) {
  // Pure JS base64 — Figma's sandbox has neither .subarray() nor btoa()
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var len = bytes.length;
  var out = '';
  for (var i = 0; i < len; i += 3) {
    var b0 = bytes[i];
    var b1 = i + 1 < len ? bytes[i + 1] : 0;
    var b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += chars[b0 >> 2];
    out += chars[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return out;
}

// ─── MESSAGE HANDLERS ───
figma.ui.onmessage = async (msg) => {
  console.log('📨', msg.type);

  // ── BRIDGE STATUS ──
  if (msg.type === 'connect-to-bridge') {
    updateBridgeStatus(msg.connected);
  }

  // ── SAVE NOTION TOKEN ──
  if (msg.type === 'save-notion-token') {
    await figma.clientStorage.setAsync(STORAGE.NOTION_TOKEN, msg.token);
    figma.notify('✓ Notion token saved');
    figma.ui.postMessage({ type: 'notion-token-saved' });
  }

  // ── CLEAR NOTION TOKEN ──
  if (msg.type === 'clear-notion-token') {
    await figma.clientStorage.setAsync(STORAGE.NOTION_TOKEN, '');
    figma.notify('Notion token cleared');
  }

  // ── LOAD PROJECTS ──
  if (msg.type === 'load-projects') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
    const activeProject = projects.find(p => p.id === activeId) || projects[0];
    figma.ui.postMessage({ type: 'projects-loaded', projects, activeProject });
  }

  // ── CREATE PROJECT ──
  if (msg.type === 'create-project') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const newProject = {
      id:          Date.now().toString(),
      name:        msg.name,
      createdAt:   new Date().toISOString(),
      goals:       [],
      fixes:       [],
      prdText:     '',
      notionPageId: msg.notionPageId || '',
      status:      'active'
    };
    projects.push(newProject);
    await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
    await figma.clientStorage.setAsync(STORAGE.ACTIVE_PROJECT, newProject.id);
    pluginState.activeProjectId = newProject.id;
    await saveState();
    figma.notify(`✓ Created: ${newProject.name}`);
    figma.ui.postMessage({ type: 'project-created', project: newProject, allProjects: projects });
  }

  // ── DELETE PROJECT ──
  if (msg.type === 'delete-project') {
    let projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    projects = projects.filter(p => p.id !== msg.projectId);
    await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
    const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
    if (activeId === msg.projectId) {
      const next = (projects[0] && projects[0].id) ? projects[0].id : null;
      await figma.clientStorage.setAsync(STORAGE.ACTIVE_PROJECT, next);
      pluginState.activeProjectId = next;
    }
    await saveState();
    figma.ui.postMessage({ type: 'project-deleted', allProjects: projects });
    figma.notify('✓ Project deleted');
  }

  // ── SET ACTIVE PROJECT ──
  if (msg.type === 'set-active-project') {
    await figma.clientStorage.setAsync(STORAGE.ACTIVE_PROJECT, msg.projectId);
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const activeProject = projects.find(p => p.id === msg.projectId);
    pluginState.activeProjectId = msg.projectId;
    await saveState();
    figma.ui.postMessage({ type: 'active-project-changed', project: activeProject });
  }

  // ── ADD GOALS ──
  if (msg.type === 'add-goals') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const project  = projects.find(p => p.id === msg.projectId);
    if (project) {
      project.goals   = msg.goals.map((text, i) => ({
        id:       `goal-${Date.now()}-${i}`,
        text,
        status:   'pending',
        addedAt:  new Date().toISOString(),
        category: msg.categories ? (msg.categories[i] || 'general') : 'general'
      }));
      project.prdText        = msg.prdText || project.prdText;
      project.notionPageId   = msg.notionPageId || project.notionPageId;
      project.notionTitle    = msg.notionTitle  || project.notionTitle;
      await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
      await saveState();
      figma.ui.postMessage({ type: 'goals-updated', project });
      figma.notify(`✓ ${msg.goals.length} requirements loaded`);
    }
  }

  // ── TOGGLE GOAL ──
  if (msg.type === 'toggle-goal') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const project  = projects.find(p => p.id === msg.projectId);
    if (project) {
      const goal = project.goals.find(g => g.id === msg.goalId);
      if (goal) {
        goal.status = goal.status === 'done' ? 'pending' : 'done';
        await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
        await saveState();
        figma.ui.postMessage({ type: 'goal-toggled', project });
      }
    }
  }

  // ── SAVE AUDIT RESULTS ──
  if (msg.type === 'save-audit-results') {
    await figma.clientStorage.setAsync(STORAGE.AUDIT_RESULTS, msg.results);
  }

  // ── ADD FIXES ──
  if (msg.type === 'add-fixes') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const project  = projects.find(p => p.id === msg.projectId);
    if (project) {
      const newFixes = msg.fixes.map((fix, i) => ({
        id:          `fix-${Date.now()}-${i}`,
        issue:       fix.issue       || '',
        description: fix.description || '',
        suggestion:  fix.suggestion  || '',
        current:     fix.current     || '',
        expected:    fix.expected    || '',
        category:    fix.category    || 'general',
        severity:    fix.severity    || 'medium',
        status:      'pending',
        createdAt:   new Date().toISOString()
      }));
      project.fixes = [...(project.fixes || []), ...newFixes];
      await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
      await saveState();
      figma.ui.postMessage({ type: 'fixes-updated', project });
      figma.notify(`✓ ${newFixes.length} issues found`);
    }
  }

  // ── GET SELECTION (deep scan for audit) ──
  if (msg.type === 'get-selection') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify('⚠️ Select a frame first');
      figma.ui.postMessage({ type: 'selection-empty' });
      return;
    }
    const scanData = deepScanSelection([...selection]);
    figma.ui.postMessage({ type: 'selection-data', data: scanData });
  }

  // ── FULL PAGE SCAN ──
  if (msg.type === 'scan-page') {
    const frames = figma.currentPage.children.filter(n =>
      ['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(n.type)
    );
    if (frames.length === 0) {
      figma.notify('⚠️ No frames on current page');
      return;
    }
    const scanData = deepScanSelection(frames);
    figma.ui.postMessage({ type: 'page-scan-data', data: scanData });
  }

  // ── GET DESIGN CONTEXT (for chat) ──
  if (msg.type === 'get-design-context') {
    try {
      var targets = figma.currentPage.selection.length > 0
        ? [...figma.currentPage.selection]
        : figma.currentPage.children.filter(function(n) {
            return ['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(n.type);
          });
      console.log('🔍 targets:', targets.length);
      var data = targets.length > 0 ? deepScanSelection(targets) : null;
      console.log('🔍 deepScan done');

      if (targets.length > 0) {
        try {
          console.log('🔍 starting exportAsync...');
          // Race exportAsync against a 5-second timeout — prevents hanging on complex frames
          var bytes = await Promise.race([
            targets[0].exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } }),
            new Promise(function(_, reject) {
              setTimeout(function() { reject(new Error('export-timeout')); }, 5000);
            })
          ]);
          console.log('🔍 export done, bytes:', bytes.length);
          var screenshot = uint8ArrayToBase64(bytes);
          console.log('🔍 posting design-context-ready WITH screenshot');
          figma.ui.postMessage({ type: 'design-context-ready', data: data, screenshot: screenshot });
        } catch (e) {
          console.log('🔍 export failed/timed out:', e.message, '— posting without screenshot');
          figma.ui.postMessage({ type: 'design-context-ready', data: data });
        }
      } else {
        console.log('🔍 no targets — posting design-context-ready without data');
        figma.ui.postMessage({ type: 'design-context-ready', data: data });
      }
    } catch (e) {
      console.log('🔍 outer catch:', e.message);
      figma.ui.postMessage({ type: 'design-context-ready', data: null });
    }
  }

  // ── SEND TO CLAUDE (bridge) ──
  if (msg.type === 'send-to-claude') {
    const targets = msg.mode === 'selection'
      ? [...figma.currentPage.selection]
      : figma.currentPage.children.filter(n => ['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(n.type));

    if (targets.length === 0) {
      figma.notify('⚠️ Nothing to send');
      return;
    }
    const scanData = deepScanSelection(targets);
    figma.ui.postMessage({
      type:     'claude-data-ready',
      mode:     msg.mode,
      data:     scanData,
      action:   msg.action
    });
    figma.notify('📤 Design data ready');
  }

  // ── APPLY TEXT FIX ──
  if (msg.type === 'apply-text-fix') {
    try {
      const node = figma.getNodeById(msg.nodeId);
      if (node && node.type === 'TEXT') {
        await figma.loadFontAsync(node.fontName);
        node.characters = msg.correctedText;
        figma.notify('✓ Text updated');
      } else {
        // Fallback search
        let found = false;
        function searchText(nodes) {
          for (const n of nodes) {
            if (n.type === 'TEXT' && n.characters === msg.originalText) {
              figma.loadFontAsync(n.fontName).then(() => { n.characters = msg.correctedText; });
              found = true;
              break;
            }
            if ('children' in n) searchText(n.children);
          }
        }
        searchText(figma.currentPage.children);
        figma.notify(found ? '✓ Text updated' : '⚠️ Node not found');
      }
    } catch (e) {
      figma.notify('⚠️ ' + e.message);
    }
  }

  // ── CHAT ADD GOAL ──
  if (msg.type === 'chat-add-goal') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
      const project  = projects.find(p => p.id === activeId);
      if (project) {
        project.goals = project.goals || [];
        project.goals.push({
          id:       `goal-${Date.now()}`,
          text:     msg.text || '',
          status:   'pending',
          addedAt:  new Date().toISOString(),
          category: msg.category || 'general'
        });
        await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
        await saveState();
        figma.ui.postMessage({ type: 'goals-updated', project });
        figma.notify('✓ Goal added to ' + project.name);
      } else {
        figma.notify('⚠️ No active project — create one in the Projects tab first');
      }
    } catch (e) {
      figma.notify('⚠️ ' + e.message);
    }
  }

  // ── ANNOTATE NODE ──
  if (msg.type === 'annotate-node') {
    try {
      const target = figma.getNodeById(msg.nodeId);
      let x = 100, y = 100;
      if (target && 'absoluteBoundingBox' in target && target.absoluteBoundingBox) {
        x = target.absoluteBoundingBox.x + target.absoluteBoundingBox.width + 16;
        y = target.absoluteBoundingBox.y;
      }
      const colorMap = {
        grammar:     { r: 0.98, g: 0.60, b: 0.09 },
        autolayout:  { r: 0.23, g: 0.51, b: 0.96 },
        alignment:   { r: 0.55, g: 0.36, b: 0.96 },
        contrast:    { r: 0.961, g: 0.620, b: 0.043 }, // yellow/amber
        consistency: { r: 0.961, g: 0.620, b: 0.043 }, // yellow/amber
        missing:     { r: 0.94, g: 0.27, b: 0.27 },
        ux:          { r: 0.13, g: 0.75, b: 0.56 }
      };
      const color = colorMap[(msg.actionType || '').toLowerCase()] || colorMap.autolayout;

      // For contrast/consistency use "ATTENTION" as category label
      const isAttention = msg.actionType === 'contrast' || msg.actionType === 'consistency';
      const labelText = isAttention
        ? '⚠️ ATTENTION: ' + msg.actionType.toUpperCase()
        : (msg.actionType || 'Issue').toUpperCase();

      const frame = figma.createFrame();
      frame.name = '📌 ' + labelText;
      frame.resize(240, 60);
      frame.x = x; frame.y = y;
      frame.fills = [{ type: 'SOLID', color, opacity: 0.12 }];
      frame.strokes = [{ type: 'SOLID', color }];
      frame.strokeWeight = 1.5;
      frame.cornerRadius = 6;
      frame.layoutMode = 'VERTICAL';
      frame.paddingLeft = frame.paddingRight = 10;
      frame.paddingTop = frame.paddingBottom = 8;
      frame.itemSpacing = 4;

      const label = figma.createText();
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      label.fontName = { family: 'Inter', style: 'Bold' };
      label.characters = labelText;
      label.fontSize = 9;
      label.fills = [{ type: 'SOLID', color }];
      frame.appendChild(label);

      const desc = figma.createText();
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      desc.fontName = { family: 'Inter', style: 'Regular' };
      desc.characters = (msg.description || '').slice(0, 140);
      desc.fontSize = 10;
      desc.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      desc.textAutoResize = 'HEIGHT';
      frame.appendChild(desc);
      frame.primaryAxisSizingMode = 'AUTO';
      figma.currentPage.appendChild(frame);
      figma.notify('📌 Annotation added');
    } catch (e) {
      figma.notify('⚠️ ' + e.message);
    }
  }

  // ── RENAME LAYERS ──
  if (msg.type === 'rename-layers') {
    try {
      const renameType = msg.renameType;
      const targets = figma.currentPage.selection.length > 0
        ? [...figma.currentPage.selection]
        : [...figma.currentPage.children];

      let count = 0;
      let skipped = 0;
      const renamedNodes = [];
      const renamedList = [];

      const renameNode = (node) => {
        try {
          if (renameType === 'from-content') {
            if (node.type === 'TEXT' && node.characters) {
              const newName = node.characters.slice(0, 40).trim();
              if (newName !== node.name) {
                renamedList.push({ from: node.name, to: newName });
                node.name = newName;
                renamedNodes.push(node);
                count++;
              }
            }
          } else if (renameType === 'clean') {
            const cleaned = node.name
              .replace(/^(Copy of\s+)+/gi, '')
              .replace(/\s+\d+$/, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
            if (cleaned && cleaned !== node.name) {
              renamedList.push({ from: node.name, to: cleaned });
              node.name = cleaned;
              renamedNodes.push(node);
              count++;
            }
          } else if (renameType === 'by-type') {
            const typeMap = { FRAME: 'Frame', GROUP: 'Group', TEXT: 'Label', RECTANGLE: 'Rectangle', ELLIPSE: 'Ellipse', VECTOR: 'Icon', COMPONENT: 'Component', INSTANCE: 'Instance', IMAGE: 'Image' };
            const mapped = typeMap[node.type];
            if (mapped && mapped !== node.name) {
              renamedList.push({ from: node.name, to: mapped });
              node.name = mapped;
              renamedNodes.push(node);
              count++;
            }
          }
        } catch (e) { skipped++; }
      };

      const walk = (nodes) => {
        for (const node of nodes) {
          renameNode(node);
          if ('children' in node && renameType !== 'number') walk(node.children);
        }
      };

      if (renameType === 'number') {
        targets.forEach((node, i) => {
          try {
            const base = node.name.replace(/^\d+\s*[—–-]\s*/, '').trim();
            const newName = String(i + 1).padStart(2, '0') + ' — ' + base;
            renamedList.push({ from: node.name, to: newName });
            node.name = newName;
            renamedNodes.push(node);
            count++;
          } catch (e) { skipped++; }
        });
      } else {
        walk(targets);
      }

      if (renamedNodes.length > 0) {
        figma.currentPage.selection = renamedNodes;
        figma.viewport.scrollAndZoomIntoView(renamedNodes);
      }

      const summary = count === 0
        ? (skipped > 0 ? `⚠️ All nodes locked or inside components` : '⚠️ No changes needed — names already match')
        : `✓ Renamed ${count} layer${count !== 1 ? 's' : ''}${skipped ? ` (${skipped} skipped)` : ''}`;
      figma.notify(summary);
      figma.ui.postMessage({ type: 'rename-done', count, skipped, renamedList: renamedList.slice(0, 8) });
    } catch (e) {
      figma.notify('⚠️ Rename failed: ' + e.message);
      figma.ui.postMessage({ type: 'rename-done', count: 0, skipped: 0, error: e.message });
    }
  }

  // ── CLAUDE API KEY ──
  if (msg.type === 'save-claude-api-key') {
    await figma.clientStorage.setAsync(STORAGE.CLAUDE_API_KEY, msg.key);
    figma.notify('✓ Claude API key saved');
  }
  if (msg.type === 'delete-claude-api-key') {
    await figma.clientStorage.setAsync(STORAGE.CLAUDE_API_KEY, '');
    figma.notify('Claude API key removed');
  }

  // ── REMOVE GOAL ──
  if (msg.type === 'remove-goal') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const project  = projects.find(p => p.id === msg.projectId);
    if (project) {
      project.goals = project.goals.filter(g => g.id !== msg.goalId);
      await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
      await saveState();
      figma.ui.postMessage({ type: 'goal-toggled', project });
      figma.notify('✓ Goal removed');
    }
  }

  // ── EDIT GOAL ──
  if (msg.type === 'edit-goal') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const project  = projects.find(p => p.id === msg.projectId);
    if (project) {
      const goal = project.goals.find(g => g.id === msg.goalId);
      if (goal && msg.text) {
        goal.text = msg.text;
        await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
        await saveState();
        figma.ui.postMessage({ type: 'goal-toggled', project });
        figma.notify('✓ Goal updated');
      }
    }
  }

  // ── REORDER GOALS ──
  if (msg.type === 'reorder-goals') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const project  = projects.find(p => p.id === msg.projectId);
    if (project && msg.goals) {
      project.goals = msg.goals;
      await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
      await saveState();
      figma.ui.postMessage({ type: 'goal-toggled', project });
    }
  }

  // ── CREATE EDGE CASES (sticky notes on canvas) ──
  if (msg.type === 'create-edge-cases') {
    try {
      const cases     = msg.cases || [];
      const frameName = msg.frameName || 'Screen';
      const selection = figma.currentPage.selection;

      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

      const CARD_W = 220;
      const CARD_GAP = 16;

      // Outer wrapper frame (transparent, just for grouping + placement)
      const container = figma.createFrame();
      container.name   = '🧪 Edge Cases — ' + frameName;
      container.fills  = [];
      container.clipsContent = false;
      container.layoutMode  = 'HORIZONTAL';
      container.itemSpacing = CARD_GAP;
      container.paddingLeft = container.paddingRight  = 0;
      container.paddingTop  = container.paddingBottom = 0;
      container.primaryAxisSizingMode  = 'AUTO';
      container.counterAxisSizingMode  = 'AUTO';

      // One black box per case
      for (let i = 0; i < cases.length; i++) {
        const card = figma.createFrame();
        card.name         = 'Edge case ' + (i + 1);
        card.fills        = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
        card.cornerRadius = 6;
        card.layoutMode   = 'VERTICAL';
        card.paddingLeft  = card.paddingRight  = 14;
        card.paddingTop   = card.paddingBottom = 12;
        card.itemSpacing  = 6;
        card.primaryAxisSizingMode  = 'AUTO';
        card.counterAxisSizingMode  = 'FIXED';
        card.resize(CARD_W, 60);

        // Title: "Edge case N"
        const titleNode = figma.createText();
        titleNode.fontName   = { family: 'Inter', style: 'Bold' };
        titleNode.characters = 'Edge case ' + (i + 1);
        titleNode.fontSize   = 10;
        titleNode.fills      = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
        titleNode.textAutoResize = 'HEIGHT';
        titleNode.resize(CARD_W - 28, 14);
        card.appendChild(titleNode);

        // Body: edge case text
        const bodyNode = figma.createText();
        bodyNode.fontName   = { family: 'Inter', style: 'Regular' };
        bodyNode.characters = cases[i];
        bodyNode.fontSize   = 11;
        bodyNode.fills      = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        bodyNode.textAutoResize = 'HEIGHT';
        bodyNode.resize(CARD_W - 28, 40);
        card.appendChild(bodyNode);

        container.appendChild(card);
      }

      // Place next to the current selection
      if (selection.length > 0 && selection[0].absoluteBoundingBox) {
        const bb = selection[0].absoluteBoundingBox;
        container.x = bb.x + bb.width + 48;
        container.y = bb.y;
      } else {
        container.x = figma.viewport.center.x;
        container.y = figma.viewport.center.y;
      }

      figma.currentPage.appendChild(container);
      figma.currentPage.selection = [container];
      figma.viewport.scrollAndZoomIntoView([container]);
      figma.notify('✓ ' + cases.length + ' edge case' + (cases.length !== 1 ? 's' : '') + ' added to canvas');
      figma.ui.postMessage({ type: 'edge-cases-created', count: cases.length });
    } catch (e) {
      figma.notify('⚠️ Edge cases: ' + e.message);
    }
  }

  // ── NOTIFY ──
  if (msg.type === 'notify') figma.notify(msg.message || '');
};

// ─── SELECTION CHANGE ───
figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  figma.ui.postMessage({ type: 'selection-changed', count: sel.length, names: sel.map(n => n.name) });
});

figma.on('documentchange', async () => {
  pluginState.lastUpdate = new Date().toISOString();
});
