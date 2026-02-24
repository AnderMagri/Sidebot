#!/usr/bin/env node

/**
 * SIDEBOT BRIDGE SERVER
 * Connects Figma Plugin <-> Anthropic API (Claude)
 * Run: node bridge-server.js
 */

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WS_PORT = 3001;

// ─── CONFIG / API KEY PERSISTENCE ───
const CONFIG_DIR  = path.join(os.homedir(), '.sidebot');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

let anthropicApiKey = null;
let anthropic       = null;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (config.apiKey && config.apiKey.startsWith('sk-ant-')) {
        anthropicApiKey = config.apiKey;
        anthropic = new Anthropic({ apiKey: anthropicApiKey });
        console.log('[KEY] Loaded saved Anthropic API key');
      } else if (config.apiKey) {
        console.log('[KEY] Ignoring saved key — not a valid Anthropic key (sk-ant-...)');
      }
    }
  } catch (e) {
    // ignore — first run
  }
}

function saveConfig(key) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey: key }));
  } catch (e) {
    console.error('[KEY] Failed to save config:', e.message);
  }
}

loadConfig();

// ─── CRASH HANDLER (keeps window open on Windows so user can read the error) ───
process.on('uncaughtException', (err) => {
  console.error('');
  console.error('[ERR] FATAL ERROR: ' + err.message);
  console.error('');
  if (process.platform === 'win32') {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Press Enter to exit...', () => process.exit(1));
  } else {
    process.exit(1);
  }
});

// ─── STATE ───
let pluginSocket = null;
let pluginData = {
  connected: false,
  projects: [],
  activeProject: null,
  lastDesignData: null
};

// ─── AI ANALYSIS PROMPTS ───
const PROMPTS = {
  grammar: `Analyze the Figma design data below for grammar, spelling, and punctuation errors in all text nodes (including nested ones).
Return ONLY a valid JSON array. Each item must have exactly these fields:
[{"nodeId": "...", "nodeName": "...", "current": "original text", "corrected": "corrected text", "description": "brief explanation"}]
If no issues found, return [].`,

  autolayout: `Analyze the Figma design data below for auto-layout, spacing, and padding inconsistencies.
Return ONLY a valid JSON array. Each item must have exactly these fields:
[{"nodeId": "...", "nodeName": "...", "issue": "problem description", "suggestion": "how to fix it"}]
If no issues found, return [].`,

  alignment: `Analyze the Figma design data below for alignment and positioning issues between elements.
Return ONLY a valid JSON array. Each item must have exactly these fields:
[{"nodeId": "...", "nodeName": "...", "issue": "alignment problem", "suggestion": "recommended fix"}]
If no issues found, return [].`,

  contrast: `Analyze the Figma design data below for color contrast and accessibility issues.
Return ONLY a valid JSON array. Each item must have exactly these fields:
[{"nodeId": "...", "nodeName": "...", "issue": "contrast problem", "suggestion": "recommended color fix"}]
If no issues found, return [].`
};

// ─── AI ANALYSIS ───
async function analyzeDesignWithClaude(ws, designData, action) {
  const prompt = PROMPTS[action];
  if (!prompt) return;

  console.log(`[AI ] Analyzing "${action}" for: ${designData.projectName || 'unknown'}`);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nDesign data:\n${JSON.stringify(designData, null, 2)}`
      }]
    });

    const text = response.content[0].text.trim();
    // Extract JSON array (handles plain JSON and markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const fixes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const fixesWithAction = fixes.map(fix => ({ ...fix, action }));

    ws.send(JSON.stringify({
      type: 'add-fixes-from-claude',
      fixes: fixesWithAction,
      projectName: designData.projectName || ''
    }));

    console.log(`[AI ] Sent ${fixes.length} ${action} fix(es)`);

  } catch (err) {
    console.error('[AI ] Error:', err.message);
    ws.send(JSON.stringify({
      type: 'add-fixes-from-claude',
      fixes: [{
        action,
        nodeId: '',
        nodeName: 'Error',
        issue: `Analysis failed: ${err.message}`,
        description: 'Check your API key in the plugin Settings tab'
      }]
    }));
  }
}

// ─── EXPRESS SERVER (for Claude Desktop MCP access) ───
const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS for localhost
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    pluginConnected: pluginData.connected,
    hasApiKey: !!anthropicApiKey,
    activeProject: pluginData.activeProject?.name || 'None',
    timestamp: new Date().toISOString()
  });
});

// Get current plugin state
app.get('/state', (req, res) => {
  res.json(pluginData);
});

// Add goals to project (from Claude Desktop via MCP)
app.post('/add-goals', (req, res) => {
  const { projectName, goals, prdText } = req.body;
  if (!pluginSocket) return res.status(503).json({ error: 'Plugin not connected' });
  console.log(`[IN ] Claude sending ${goals.length} goals to project: ${projectName}`);
  pluginSocket.send(JSON.stringify({ type: 'add-goals-from-claude', projectName, goals, prdText }));
  res.json({ success: true, message: `Sent ${goals.length} goals to plugin` });
});

// Add fixes to project (from Claude Desktop via MCP)
app.post('/add-fixes', (req, res) => {
  const { projectName, fixes } = req.body;
  if (!pluginSocket) return res.status(503).json({ error: 'Plugin not connected' });
  console.log(`[IN ] Claude sending ${fixes.length} fixes to project: ${projectName}`);
  pluginSocket.send(JSON.stringify({ type: 'add-fixes-from-claude', projectName, fixes }));
  res.json({ success: true, message: `Sent ${fixes.length} fixes to plugin` });
});

// Get design data
app.get('/design-data', (req, res) => {
  if (!pluginData.lastDesignData) return res.status(404).json({ error: 'No design data available' });
  res.json(pluginData.lastDesignData);
});

// ─── WEBSOCKET SERVER (for Plugin connection) ───
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('[ERR] Port ' + WS_PORT + ' is already in use.');
    console.error('      Another copy of the bridge may already be running.');
    console.error('      Close it first, then try again.');
    console.error('');
    process.exit(1);
  }
});

wss.on('connection', (ws) => {
  console.log('[WS ] Plugin connected!');
  pluginSocket = ws;
  pluginData.connected = true;

  // Tell plugin we're connected + whether API key is already saved
  ws.send(JSON.stringify({
    type: 'connection-established',
    message: 'Bridge server connected!',
    hasApiKey: !!anthropicApiKey
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('[MSG] From plugin: ' + message.type);

      // ─ API key from Settings tab ─
      if (message.type === 'set-api-key') {
        const key = message.key;
        if (!key.startsWith('sk-ant-')) {
          console.log('[KEY] Rejected key — must start with sk-ant-');
          ws.send(JSON.stringify({ type: 'api-key-confirmed', success: false, error: 'Invalid key — Anthropic keys start with sk-ant-' }));
        } else {
          anthropicApiKey = key;
          anthropic = new Anthropic({ apiKey: key });
          saveConfig(key);
          console.log('[KEY] Anthropic API key updated and saved');
          ws.send(JSON.stringify({ type: 'api-key-confirmed', success: true }));
        }
      }

      // ─ Plugin state update ─
      if (message.type === 'state-update') {
        pluginData.projects      = message.projects      || [];
        pluginData.activeProject = message.activeProject || null;
      }

      // ─ Design data — auto-trigger AI if a Fixes action is attached ─
      if (message.type === 'design-data') {
        pluginData.lastDesignData = message.data;
        console.log('[DATA] Design data stored: ' + message.data.mode);

        const action = message.data.action;
        const fixesActions = ['grammar', 'autolayout', 'alignment', 'contrast'];

        if (action && fixesActions.includes(action)) {
          if (anthropic) {
            analyzeDesignWithClaude(ws, message.data, action);
          } else {
            console.log('[AI ] No API key configured — cannot analyze');
            ws.send(JSON.stringify({
              type: 'add-fixes-from-claude',
              fixes: [{
                action,
                nodeId: '',
                nodeName: 'No API Key',
                issue: 'No Anthropic API key configured',
                description: 'Go to Settings tab and paste your Anthropic API key from console.anthropic.com'
              }]
            }));
          }
        }
      }

    } catch (e) {
      console.error('[ERR] Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    console.log('[WS ] Plugin disconnected');
    pluginSocket = null;
    pluginData.connected = false;
  });

  ws.on('error', (error) => {
    console.error('[ERR] WebSocket error:', error);
  });
});

// ─── START HTTP SERVER ───
const httpServer = app.listen(PORT, () => {
  console.log('');
  console.log('===========================================');
  console.log('  SIDEBOT BRIDGE SERVER');
  console.log('===========================================');
  console.log('');
  console.log('[HTTP] http://localhost:' + PORT);
  console.log('[WS ] ws://localhost:' + WS_PORT);
  console.log('[AI ] ' + (anthropicApiKey ? 'Anthropic key configured' : 'no key — enter in plugin Settings tab'));
  console.log('');
  console.log('Waiting for Figma plugin to connect...');
  console.log('');
  console.log('Press Ctrl+C to stop  |  Close this window to stop');
  console.log('===========================================');
  console.log('');
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('[ERR] Port ' + PORT + ' is already in use.');
    console.error('      Another copy of the bridge may already be running.');
    console.error('      Close it first, then try again.');
    console.error('');
    process.exit(1);
  }
});

// ─── GRACEFUL SHUTDOWN ───
process.on('SIGINT', () => {
  console.log('\nShutting down bridge server...');
  if (pluginSocket) pluginSocket.close();
  wss.close();
  httpServer.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
