#!/usr/bin/env node

/**
 * SIDEBOT BRIDGE SERVER v2.0
 * Connects Figma Plugin <-> Claude Desktop
 * Proxies Notion API requests (CORS bypass)
 * Run: node bridge-server.js
 */

const WebSocket = require('ws');
const http      = require('http');
const https     = require('https');
const express   = require('express');

const PORT    = 3000;
const WS_PORT = 3001;

// ─── CRASH HANDLER ───
process.on('uncaughtException', (err) => {
  console.error('\n[ERR] FATAL: ' + err.message + '\n');
  if (process.platform === 'win32') {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Press Enter to exit...', () => process.exit(1));
  } else {
    process.exit(1);
  }
});

// ─── STATE ───
let pluginSocket = null;
let pluginData   = {
  connected:       false,
  projects:        [],
  activeProject:   null,
  lastDesignData:  null,
  lastAuditResult: null
};

// ─── EXPRESS ───
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── HEALTH ──
app.get('/health', (req, res) => {
  res.json({
    status:        'ok',
    pluginConnected: pluginData.connected,
    activeProject: pluginData.activeProject?.name || 'None',
    timestamp:     new Date().toISOString()
  });
});

// ── STATE ──
app.get('/state', (req, res) => res.json(pluginData));

// ── DESIGN DATA ──
app.get('/design-data', (req, res) => {
  if (!pluginData.lastDesignData) return res.status(404).json({ error: 'No design data' });
  res.json(pluginData.lastDesignData);
});

// ── ADD GOALS ──
app.post('/add-goals', (req, res) => {
  const { projectName, goals, prdText, notionPageId, notionTitle, categories } = req.body;
  if (!pluginSocket) return res.status(503).json({ error: 'Plugin not connected' });
  console.log(`[IN ] Goals → ${projectName} (${goals.length})`);
  pluginSocket.send(JSON.stringify({ type: 'add-goals-from-claude', projectName, goals, prdText, notionPageId, notionTitle, categories }));
  res.json({ success: true });
});

// ── ADD FIXES ──
app.post('/add-fixes', (req, res) => {
  const { projectName, fixes } = req.body;
  if (!pluginSocket) return res.status(503).json({ error: 'Plugin not connected' });
  console.log(`[IN ] Fixes → ${projectName} (${fixes.length})`);
  pluginSocket.send(JSON.stringify({ type: 'add-fixes-from-claude', projectName, fixes }));
  res.json({ success: true });
});

// ── NOTION PROXY ──
// Figma plugins can't always hit api.notion.com directly due to sandboxing
// The bridge proxies these requests so the plugin sends here → bridge calls Notion
app.post('/notion/fetch-page', (req, res) => {
  const { pageId, token } = req.body;
  if (!token) return res.status(400).json({ error: 'Notion token required' });
  if (!pageId) return res.status(400).json({ error: 'pageId required' });

  const options = {
    hostname: 'api.notion.com',
    path:     `/v1/pages/${pageId}`,
    method:   'GET',
    headers:  {
      'Authorization':     `Bearer ${token}`,
      'Notion-Version':    '2022-06-28',
      'Content-Type':      'application/json'
    }
  };

  const notionReq = https.request(options, (notionRes) => {
    let data = '';
    notionRes.on('data', chunk => data += chunk);
    notionRes.on('end', () => {
      try { res.status(notionRes.statusCode).json(JSON.parse(data)); }
      catch (e) { res.status(500).json({ error: 'Parse error', raw: data }); }
    });
  });
  notionReq.on('error', err => res.status(500).json({ error: err.message }));
  notionReq.end();
});

app.post('/notion/fetch-blocks', (req, res) => {
  const { blockId, token } = req.body;
  if (!token) return res.status(400).json({ error: 'Notion token required' });

  const options = {
    hostname: 'api.notion.com',
    path:     `/v1/blocks/${blockId}/children?page_size=100`,
    method:   'GET',
    headers:  {
      'Authorization':  `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json'
    }
  };

  const notionReq = https.request(options, (notionRes) => {
    let data = '';
    notionRes.on('data', chunk => data += chunk);
    notionRes.on('end', () => {
      try { res.status(notionRes.statusCode).json(JSON.parse(data)); }
      catch (e) { res.status(500).json({ error: 'Parse error' }); }
    });
  });
  notionReq.on('error', err => res.status(500).json({ error: err.message }));
  notionReq.end();
});

app.post('/notion/search', (req, res) => {
  const { query, token } = req.body;
  if (!token) return res.status(400).json({ error: 'Notion token required' });

  const body = JSON.stringify({ query: query || '', filter: { value: 'page', property: 'object' } });
  const options = {
    hostname: 'api.notion.com',
    path:     '/v1/search',
    method:   'POST',
    headers:  {
      'Authorization':  `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const notionReq = https.request(options, (notionRes) => {
    let data = '';
    notionRes.on('data', chunk => data += chunk);
    notionRes.on('end', () => {
      try { res.status(notionRes.statusCode).json(JSON.parse(data)); }
      catch (e) { res.status(500).json({ error: 'Parse error' }); }
    });
  });
  notionReq.on('error', err => res.status(500).json({ error: err.message }));
  notionReq.write(body);
  notionReq.end();
});

// ─── WEBSOCKET ───
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERR] Port ${WS_PORT} already in use. Close other bridge instance.\n`);
    process.exit(1);
  }
});

wss.on('connection', (ws) => {
  console.log('[WS ] Plugin connected!');
  pluginSocket         = ws;
  pluginData.connected = true;

  ws.send(JSON.stringify({ type: 'connection-established', message: 'Bridge connected!' }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      console.log('[MSG]', msg.type);

      if (msg.type === 'state-update') {
        pluginData.projects      = msg.projects      || [];
        pluginData.activeProject = msg.activeProject || null;
      }
      if (msg.type === 'design-data') {
        pluginData.lastDesignData = msg.data;
        console.log('[DATA] Design data stored:', msg.data.rootNames?.join(', ') || '?');
      }
      if (msg.type === 'audit-result') {
        pluginData.lastAuditResult = msg.result;
      }
    } catch (e) {
      console.error('[ERR]', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[WS ] Plugin disconnected');
    pluginSocket         = null;
    pluginData.connected = false;
  });

  ws.on('error', (err) => console.error('[ERR]', err.message));
});

// ─── HTTP SERVER ───
const httpServer = app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('  SIDEBOT BRIDGE v2.0');
  console.log('===========================================');
  console.log(`\n  HTTP  →  http://localhost:${PORT}`);
  console.log(`  WS    →  ws://localhost:${WS_PORT}`);
  console.log(`  Notion Proxy ready\n`);
  console.log('  Waiting for Figma plugin...\n');
  console.log('  Press Ctrl+C to stop');
  console.log('===========================================\n');
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERR] Port ${PORT} in use. Close other bridge instance.\n`);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (pluginSocket) pluginSocket.close();
  wss.close();
  httpServer.close(() => { console.log('Done.'); process.exit(0); });
});
