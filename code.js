// ═══════════════════════════════════════════════════════════
// SIDEBOT v1.0 - AI-Powered PRD Validation
// Claude Desktop ↔ Bridge Server ↔ Figma Plugin
// ═══════════════════════════════════════════════════════════

console.log('🤖 Sidebot v1.0 initializing...');

figma.showUI(__html__, { width: 340, height: 560, themeColors: true });

// ─── BRIDGE CONNECTION ───
const BRIDGE_URL = 'ws://localhost:3001';
let bridgeConnected = false;

// Send message to UI about bridge status
function updateBridgeStatus(connected) {
  bridgeConnected = connected;
  figma.ui.postMessage({
    type: 'bridge-status',
    connected
  });
}

// ─── STORAGE KEYS ───
const STORAGE = {
  PROJECTS: 'sidebot_projects',
  ACTIVE_PROJECT: 'sidebot_active',
  PLUGIN_STATE: 'sidebot_state'
};

// ─── MCP STATE MANAGEMENT ───
// This stores plugin state that Claude can read/write via MCP
let pluginState = {
  activeProjectId: null,
  lastUpdate: null,
  claudeConnected: false
};

// Initialize and load state
async function initPlugin() {
  try {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
    const state = await figma.clientStorage.getAsync(STORAGE.PLUGIN_STATE) || pluginState;
    
    pluginState = state;
    
    console.log('✓ Plugin initialized. Projects:', projects.length);
    
    figma.ui.postMessage({
      type: 'init-complete',
      projects,
      activeId,
      state: pluginState
    });
    
    // Update bridge status
    updateBridgeStatus(false);
  } catch (e) {
    console.error('Init failed:', e);
  }
}

// Save plugin state (called after any change)
async function saveState() {
  pluginState.lastUpdate = new Date().toISOString();
  await figma.clientStorage.setAsync(STORAGE.PLUGIN_STATE, pluginState);
}

initPlugin();

// ─── MESSAGE HANDLERS ───
figma.ui.onmessage = async (msg) => {
  console.log('📨 Message:', msg.type);

  // ─── BRIDGE: Connect to Bridge Server ───
  if (msg.type === 'connect-to-bridge') {
    updateBridgeStatus(msg.connected);
    console.log(msg.connected ? '✅ Bridge connected' : '❌ Bridge disconnected');
  }
  
  // ─── BRIDGE: Send State Update ───
  if (msg.type === 'send-state-to-bridge') {
    const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
    const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
    const activeProject = projects.find(p => p.id === activeId);
    
    figma.ui.postMessage({
      type: 'state-for-bridge',
      projects,
      activeProject
    });
  }

  // ─── CREATE PROJECT ───
  if (msg.type === 'create-project') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      
      const newProject = {
        id: Date.now().toString(),
        name: msg.name,
        createdAt: new Date().toISOString(),
        goals: [],
        fixes: [],
        prdText: '',
        status: 'active'
      };
      
      projects.push(newProject);
      await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
      await figma.clientStorage.setAsync(STORAGE.ACTIVE_PROJECT, newProject.id);
      
      pluginState.activeProjectId = newProject.id;
      await saveState();
      
      console.log('✓ Project created:', newProject.name);
      figma.notify(`✓ Created project: ${newProject.name}`);
      
      figma.ui.postMessage({
        type: 'project-created',
        project: newProject,
        allProjects: projects
      });
      
    } catch (e) {
      figma.notify(`⚠️ Error: ${e.message}`);
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── DELETE PROJECT ───
  if (msg.type === 'delete-project') {
    try {
      let projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      projects = projects.filter(p => p.id !== msg.projectId);
      
      await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
      
      const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
      if (activeId === msg.projectId && projects.length > 0) {
        await figma.clientStorage.setAsync(STORAGE.ACTIVE_PROJECT, projects[0].id);
        pluginState.activeProjectId = projects[0].id;
      } else if (projects.length === 0) {
        pluginState.activeProjectId = null;
      }
      
      await saveState();
      
      figma.ui.postMessage({
        type: 'project-deleted',
        allProjects: projects
      });
      
      figma.notify('✓ Project deleted');
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── LOAD PROJECTS ───
  if (msg.type === 'load-projects') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
      const activeProject = projects.find(p => p.id === activeId) || projects[0];
      
      figma.ui.postMessage({
        type: 'projects-loaded',
        projects,
        activeProject
      });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── SET ACTIVE PROJECT ───
  if (msg.type === 'set-active-project') {
    try {
      await figma.clientStorage.setAsync(STORAGE.ACTIVE_PROJECT, msg.projectId);
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const activeProject = projects.find(p => p.id === msg.projectId);
      
      pluginState.activeProjectId = msg.projectId;
      await saveState();
      
      figma.ui.postMessage({
        type: 'active-project-changed',
        project: activeProject
      });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── ADD GOALS (from Claude or UI) ───
  if (msg.type === 'add-goals') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const project = projects.find(p => p.id === msg.projectId);
      
      if (project) {
        project.goals = msg.goals.map((text, i) => ({
          id: `goal-${Date.now()}-${i}`,
          text,
          status: 'pending',
          addedAt: new Date().toISOString()
        }));
        project.prdText = msg.prdText || project.prdText;
        project.status = 'active';
        
        await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
        await saveState();
        
        figma.ui.postMessage({
          type: 'goals-updated',
          project
        });
        
        figma.notify(`✓ Added ${msg.goals.length} goals`);
      }
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── TOGGLE GOAL ───
  if (msg.type === 'toggle-goal') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const project = projects.find(p => p.id === msg.projectId);
      
      if (project) {
        const goal = project.goals.find(g => g.id === msg.goalId);
        if (goal) {
          goal.status = goal.status === 'done' ? 'pending' : 'done';
          await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
          await saveState();
          
          figma.ui.postMessage({
            type: 'goal-toggled',
            project
          });
        }
      }
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── ADD FIXES (from Claude) ───
  if (msg.type === 'add-fixes') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const project = projects.find(p => p.id === msg.projectId);
      
      if (project) {
        const newFixes = msg.fixes.map((fix, i) => ({
          id: `fix-${Date.now()}-${i}`,
          issue: fix.issue || '',
          description: fix.description || '',
          suggestion: fix.suggestion || '',
          current: fix.current || '',
          expected: fix.expected || '',
          status: 'pending',
          createdAt: new Date().toISOString()
        }));
        
        project.fixes = project.fixes || [];
        project.fixes.push(...newFixes);
        
        await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
        await saveState();
        
        figma.ui.postMessage({
          type: 'fixes-updated',
          project
        });
        
        figma.notify(`✓ Added ${newFixes.length} fixes`);
      }
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── MARK FIX DONE ───
  if (msg.type === 'mark-fix-done') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const project = projects.find(p => p.id === msg.projectId);
      
      if (project) {
        const fix = project.fixes.find(f => f.id === msg.fixId);
        if (fix) {
          fix.status = 'done';
          await figma.clientStorage.setAsync(STORAGE.PROJECTS, projects);
          await saveState();
          
          figma.ui.postMessage({
            type: 'fix-marked-done',
            project
          });
        }
      }
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── GET CURRENT STATE (for Claude MCP) ───
  if (msg.type === 'get-plugin-state') {
    try {
      const projects = await figma.clientStorage.getAsync(STORAGE.PROJECTS) || [];
      const activeId = await figma.clientStorage.getAsync(STORAGE.ACTIVE_PROJECT);
      const activeProject = projects.find(p => p.id === activeId);
      
      figma.ui.postMessage({
        type: 'plugin-state-response',
        state: {
          projects,
          activeProject,
          pluginState
        }
      });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── SEND TO CLAUDE (Selection or Page) ───
  if (msg.type === 'send-to-claude') {
    try {
      let nodesToAnalyze = [];
      
      if (msg.mode === 'selection') {
        const selection = figma.currentPage.selection;
        
        if (selection.length === 0) {
          figma.notify('⚠️ Please select a frame or element first');
          return;
        }
        
        nodesToAnalyze = selection;
      } else if (msg.mode === 'page') {
        // Get all top-level frames on current page
        nodesToAnalyze = figma.currentPage.children.filter(node => 
          node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
        );
        
        if (nodesToAnalyze.length === 0) {
          figma.notify('⚠️ No frames found on current page');
          return;
        }
      }
      
      // Gather data about nodes
      const analysisData = nodesToAnalyze.map(node => {
        const data = {
          id: node.id,
          name: node.name,
          type: node.type,
          width: node.width,
          height: node.height,
          x: node.x,
          y: node.y
        };
        
        // Add text content if text node
        if (node.type === 'TEXT') {
          data.characters = node.characters;
          data.fontSize = node.fontSize;
          data.fontName = node.fontName;
        }
        
        // Add fill colors if applicable
        if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
          data.fills = node.fills;
          data.strokes = node.strokes;
        }
        
        return data;
      });
      
      figma.ui.postMessage({
        type: 'claude-data-ready',
        mode: msg.mode,
        data: analysisData,
        fileKey: figma.fileKey,
        pageName: figma.currentPage.name
      });
      
      figma.notify('📤 Data ready! Paste in Claude Desktop for review.');
      
    } catch (e) {
      figma.notify(`⚠️ Error: ${e.message}`);
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── GET SELECTION DATA (for Claude to analyze) ───
  if (msg.type === 'get-selection') {
    try {
      const selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.notify('⚠️ Please select a frame or element first');
        figma.ui.postMessage({
          type: 'selection-empty'
        });
        return;
      }
      
      // Gather detailed selection data for Claude
      const selectionData = selection.map(node => {
        const data = {
          id: node.id,
          name: node.name,
          type: node.type,
          width: node.width,
          height: node.height,
          x: node.x,
          y: node.y
        };
        
        // Add type-specific details
        if (node.type === 'TEXT') {
          data.characters = node.characters;
          data.fontSize = node.fontSize;
          data.fontName = node.fontName;
        }
        
        if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
          data.fills = node.fills;
          data.strokes = node.strokes;
        }
        
        return data;
      });
      
      figma.ui.postMessage({
        type: 'selection-data',
        selection: selectionData
      });
      
      console.log('Selection data prepared for Claude');

    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    }
  }

  // ─── NOTIFY ───
  if (msg.type === 'notify') {
    figma.notify(msg.message || '');
  }

  // ─── APPLY TEXT FIX ───
  if (msg.type === 'apply-text-fix') {
    try {
      const node = figma.getNodeById(msg.nodeId);
      if (node && node.type === 'TEXT') {
        await figma.loadFontAsync(node.fontName);
        node.characters = msg.correctedText;
        figma.notify('✓ Text updated');
      } else {
        // Fallback: search all text nodes on current page
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
        figma.notify(found ? '✓ Text updated' : '⚠️ Node not found — select it and try again');
      }
    } catch (e) {
      figma.notify('⚠️ Could not apply fix: ' + e.message);
    }
  }

  // ─── ANNOTATE NODE ───
  if (msg.type === 'annotate-node') {
    try {
      const target = figma.getNodeById(msg.nodeId);
      const page   = figma.currentPage;

      // Determine position: near target node, or at viewport center
      let x = 100, y = 100;
      if (target && 'absoluteBoundingBox' in target && target.absoluteBoundingBox) {
        x = target.absoluteBoundingBox.x + target.absoluteBoundingBox.width + 16;
        y = target.absoluteBoundingBox.y;
      }

      const colors = { autolayout: { r:0.23, g:0.51, b:0.96 }, alignment: { r:0.55, g:0.36, b:0.96 }, contrast: { r:0.98, g:0.60, b:0.09 } };
      const color  = colors[msg.actionType] || { r:0.23, g:0.51, b:0.96 };

      // Annotation frame
      const frame = figma.createFrame();
      frame.name = '📌 ' + (msg.actionType || 'Annotation');
      frame.resize(220, 60);
      frame.x = x;
      frame.y = y;
      frame.fills = [{ type: 'SOLID', color, opacity: 0.12 }];
      frame.strokes = [{ type: 'SOLID', color }];
      frame.strokeWeight = 1.5;
      frame.cornerRadius = 6;
      frame.layoutMode = 'VERTICAL';
      frame.paddingLeft = frame.paddingRight = 10;
      frame.paddingTop  = frame.paddingBottom = 8;
      frame.itemSpacing = 4;

      // Label
      const label = figma.createText();
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      label.fontName = { family: 'Inter', style: 'Bold' };
      label.characters = (msg.actionType || 'Issue').toUpperCase();
      label.fontSize = 9;
      label.fills = [{ type: 'SOLID', color }];
      frame.appendChild(label);

      // Description
      const desc = figma.createText();
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      desc.fontName = { family: 'Inter', style: 'Regular' };
      desc.characters = (msg.description || 'See plugin for details').slice(0, 120);
      desc.fontSize = 10;
      desc.fills = [{ type: 'SOLID', color: { r:1, g:1, b:1 } }];
      desc.textAutoResize = 'HEIGHT';
      frame.appendChild(desc);

      // Resize frame to fit text
      frame.primaryAxisSizingMode = 'AUTO';
      page.appendChild(frame);

      figma.notify('📌 Annotation added to canvas');
    } catch (e) {
      figma.notify('⚠️ Annotation failed: ' + e.message);
    }
  }

  // ─── RENAME LAYERS ───
  if (msg.type === 'rename-layers') {
    try {
      const targets = figma.currentPage.selection.length > 0
        ? [...figma.currentPage.selection]
        : [...figma.currentPage.children];

      let count = 0;

      function walk(nodes) {
        for (const node of nodes) {
          if (msg.renameType === 'from-content') {
            if (node.type === 'TEXT' && node.characters) {
              node.name = node.characters.slice(0, 40).trim();
              count++;
            }
          } else if (msg.renameType === 'clean') {
            const cleaned = node.name
              .replace(/^(Copy of\s+)+/gi, '')
              .replace(/\s+\d+$/, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
            if (cleaned && cleaned !== node.name) { node.name = cleaned; count++; }
          } else if (msg.renameType === 'by-type') {
            const typeMap = { FRAME: 'Frame', GROUP: 'Group', TEXT: 'Label', RECTANGLE: 'Rectangle', ELLIPSE: 'Ellipse', VECTOR: 'Icon', COMPONENT: 'Component', INSTANCE: 'Instance', IMAGE: 'Image' };
            const mapped = typeMap[node.type];
            if (mapped) { node.name = mapped; count++; }
          }
          if ('children' in node && msg.renameType !== 'number') walk(node.children);
        }
      }

      if (msg.renameType === 'number') {
        targets.forEach((node, i) => {
          const base = node.name.replace(/^\d+\s*[—–-]\s*/, '').trim();
          node.name = String(i + 1).padStart(2, '0') + ' — ' + base;
          count++;
        });
      } else {
        walk(targets);
      }

      figma.notify('✓ Renamed ' + count + ' layer' + (count !== 1 ? 's' : ''));
      figma.ui.postMessage({ type: 'rename-done', count });
    } catch (e) {
      figma.notify('⚠️ Rename failed: ' + e.message);
    }
  }
};

// ─── SELECTION CHANGE → notify UI ───
figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-changed',
    count: sel.length
  });
});

// ─── EXPOSE PLUGIN DATA TO CLAUDE VIA COMMENTS ───
// Claude can read plugin data through special comment markers
// This allows Claude to understand plugin state without direct API access
figma.on('documentchange', async () => {
  // Update state timestamp on any document change
  pluginState.lastUpdate = new Date().toISOString();
});
