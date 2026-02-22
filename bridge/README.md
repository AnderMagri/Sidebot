# Sidebot Bridge Server

**Seamless connection between Figma Plugin ↔ Claude Desktop**

No more copy/paste! Real-time communication via localhost bridge.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Bridge Server

**Mac/Linux:**
```bash
./start.sh
```

**Windows:**
```
start.bat
```

**Or manually:**
```bash
npm start
```

### 3. Open Figma Plugin

1. Open Figma
2. Run: `Plugins → Development → Sidebot`
3. Watch the connection indicator turn **🟢 green**

### 4. Talk to Claude!

```
You: "Review my design against the test PRD"
Claude: *automatically fetches your design*
Claude: *sends fixes directly to plugin*
You: *fixes appear in Fixes tab automatically*
```

**NO COPY/PASTE!** 🎉

---

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────┐         ┌─────────────────┐
│ Figma Plugin │◄───────►│ Bridge Server│◄───────►│ Claude Desktop  │
│              │ WebSocket│ localhost    │   HTTP  │ (Chat Interface)│
│  - Sends data│         │ - Port 3000  │         │ - Analyzes data │
│  - Gets fixes│         │ - Port 3001  │         │ - Sends commands│
└──────────────┘         └──────────────┘         └─────────────────┘
```

### Bridge Server Endpoints:

**HTTP (for Claude):**
- `GET /health` - Server status
- `GET /state` - Current plugin state
- `GET /design-data` - Latest design data from plugin
- `POST /add-goals` - Send goals to plugin
- `POST /add-fixes` - Send fixes to plugin

**WebSocket (for Plugin):**
- `ws://localhost:3001` - Real-time bidirectional communication

---

## 🎯 Usage Examples

### Send Design for Review

**In Figma:**
1. Select a frame
2. Click "📍 Selection" in Goals tab
3. Alert: "Design sent to Claude!"

**In Claude Desktop Chat:**
```
You: "Review my design against the test PRD"
```

**Claude automatically:**
1. Fetches design from bridge (`GET /design-data`)
2. Analyzes against PRD
3. Sends fixes to bridge (`POST /add-fixes`)
4. Fixes appear in plugin instantly! ✨

---

### Add New Project + Goals

**In Claude Desktop Chat:**
```
You: "Add this PRD to Sidebot:

BACKGROUND: Clean white
PRIMARY COLOR: Teal #14B8A6
REQUIRED ELEMENTS:
- Header with logo
- Balance card
- Quick actions
- Transaction list
- Bottom navigation"
```

**Claude automatically:**
1. Analyzes PRD
2. Sends goals to bridge (`POST /add-goals`)
3. Goals appear in plugin instantly! ✨

---

## 🔧 How Claude Talks to Bridge

### From This Chat Window

I (Claude) can make HTTP requests to your localhost bridge:

```javascript
// Example: Add goals
fetch('http://localhost:3000/add-goals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectName: "test",
    goals: ["Goal 1", "Goal 2"],
    prdText: "..."
  })
})
```

```javascript
// Example: Get design data
fetch('http://localhost:3000/design-data')
  .then(res => res.json())
  .then(data => {
    // Analyze data.nodes
    // Send fixes back
  })
```

---

## 🟢 Connection Status

**In Plugin Header:**
- 🟢 **Claude** - Connected and ready
- 🔴 **Offline** - Bridge not running

**Check Bridge Status:**
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "pluginConnected": true,
  "activeProject": "test",
  "timestamp": "2026-02-20T..."
}
```

---

## 🐛 Troubleshooting

### Plugin Says "Bridge not connected"

1. **Is bridge server running?**
   ```bash
   curl http://localhost:3000/health
   ```
   
2. **Check ports are free:**
   ```bash
   lsof -i :3000
   lsof -i :3001
   ```

3. **Restart bridge server:**
   ```bash
   # Ctrl+C to stop
   ./start.sh  # Start again
   ```

4. **Restart plugin:**
   - Close plugin in Figma
   - Reopen plugin
   - Wait for 🟢 connection

### Claude Can't Send Commands

1. **Network access enabled?**
   - Check Claude.ai settings allow localhost

2. **Correct URLs?**
   - HTTP: `http://localhost:3000`
   - WebSocket: `ws://localhost:3001`

3. **CORS errors?**
   - Bridge has CORS enabled for all origins
   - Check browser console

### Connection Keeps Dropping

1. **Firewall blocking localhost?**
   - Allow Node.js through firewall

2. **Port conflict?**
   - Change ports in `bridge-server.js`:
   ```javascript
   const PORT = 3000;      // HTTP
   const WS_PORT = 3001;   // WebSocket
   ```

---

## 🔒 Security Notes

- Bridge only accepts connections from **localhost**
- No external network access required
- All data stays on your machine
- Bridge can't access internet
- Plugin can't make external requests

**Safe for sensitive projects!** ✅

---

## 📝 Technical Details

**Dependencies:**
- `express` - HTTP server for Claude
- `ws` - WebSocket server for plugin

**Data Flow:**

1. **Plugin → Bridge:**
   - WebSocket connection on port 3001
   - Sends state updates, design data
   
2. **Claude → Bridge:**
   - HTTP requests to port 3000
   - Sends goals, fixes, commands

3. **Bridge → Plugin:**
   - WebSocket messages
   - Forwards Claude's commands

---

## 🚀 Advanced Usage

### Custom Commands

You can extend the bridge with custom endpoints:

```javascript
// In bridge-server.js
app.post('/custom-command', (req, res) => {
  const { data } = req.body;
  
  pluginSocket.send(JSON.stringify({
    type: 'custom-command',
    data
  }));
  
  res.json({ success: true });
});
```

### Logging

Bridge logs all messages to console:
```
📥 Claude sending 5 goals to project: test
📨 From plugin: design-data
💾 Design data stored: selection
```

---

## 📦 What's Included

```
sidebot-bridge/
├── bridge-server.js    # Main server
├── package.json        # Dependencies
├── start.sh           # Mac/Linux startup
├── start.bat          # Windows startup
└── README.md          # This file
```

---

## 🎓 Learn More

**Video Tutorial:** [Coming Soon]

**Discord:** [Coming Soon]

**Issues:** Report bugs via GitHub

---

**Built with ❤️ for seamless AI-powered design workflows**

