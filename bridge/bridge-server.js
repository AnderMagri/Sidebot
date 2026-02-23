#!/usr/bin/env node

/**
 * SIDEBOT BRIDGE SERVER
 * Connects Figma Plugin <-> Claude Desktop
 * Run: node bridge-server.js
 */

const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const PORT = 3000;
const WS_PORT = 3001;

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

// ─── EXPRESS SERVER (for Claude to send commands) ───
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
    activeProject: pluginData.activeProject?.name || 'None',
    timestamp: new Date().toISOString()
  });
});

// Get current plugin state
app.get('/state', (req, res) => {
  res.json(pluginData);
});

// Add goals to project (from Claude)
app.post('/add-goals', (req, res) => {
  const { projectName, goals, prdText } = req.body;

  if (!pluginSocket) {
    return res.status(503).json({ error: 'Plugin not connected' });
  }

  console.log(`[IN ] Claude sending ${goals.length} goals to project: ${projectName}`);

  pluginSocket.send(JSON.stringify({
    type: 'add-goals-from-claude',
    projectName,
    goals,
    prdText
  }));

  res.json({ success: true, message: `Sent ${goals.length} goals to plugin` });
});

// Add fixes to project (from Claude)
app.post('/add-fixes', (req, res) => {
  const { projectName, fixes } = req.body;

  if (!pluginSocket) {
    return res.status(503).json({ error: 'Plugin not connected' });
  }

  console.log(`[IN ] Claude sending ${fixes.length} fixes to project: ${projectName}`);

  pluginSocket.send(JSON.stringify({
    type: 'add-fixes-from-claude',
    projectName,
    fixes
  }));

  res.json({ success: true, message: `Sent ${fixes.length} fixes to plugin` });
});

// Get design data (for Claude to analyze)
app.get('/design-data', (req, res) => {
  if (!pluginData.lastDesignData) {
    return res.status(404).json({ error: 'No design data available' });
  }

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

  // Send confirmation
  ws.send(JSON.stringify({
    type: 'connection-established',
    message: 'Bridge server connected!'
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('[MSG] From plugin: ' + message.type);

      // Update plugin state
      if (message.type === 'state-update') {
        pluginData.projects = message.projects || [];
        pluginData.activeProject = message.activeProject || null;
      }

      // Store design data for Claude to fetch
      if (message.type === 'design-data') {
        pluginData.lastDesignData = message.data;
        console.log('[DATA] Design data stored: ' + message.data.mode);
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
  console.log('');
  console.log('Waiting for Figma plugin to connect...');
  console.log('');
  console.log('Steps:');
  console.log('  1. Open Figma');
  console.log('  2. Run the Sidebot plugin');
  console.log('  3. The plugin connects automatically');
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
  if (pluginSocket) {
    pluginSocket.close();
  }
  wss.close();
  httpServer.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
