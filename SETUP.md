# 🤖 Sidebot Setup Guide

Complete setup instructions for **Sidebot** - AI-Powered PRD Validation for Figma.

---

## 📦 What is Sidebot?

Sidebot helps you validate Figma designs against PRD requirements in real-time using Claude Desktop.

**Two modes:**
- **🆓 Manual Mode** - Works immediately (copy/paste JSON)
- **⚡ Seamless Mode** - Real-time sync (requires bridge setup)

---

## 🚀 Quick Setup (Manual Mode)

### 1. Install Plugin

**Option A: Figma Community (Recommended)**
1. Open Figma
2. Go to Plugins → Browse Community
3. Search "Sidebot"
4. Click Install

**Option B: Development**
1. Clone this repo
2. Figma → Plugins → Development → Import plugin from manifest
3. Select `manifest.json`

### 2. Create Your First Project

1. Open Sidebot plugin in Figma
2. Click **"+ Add New Project"**
3. Copy the prompt template
4. Paste in Claude Desktop with your PRD
5. Claude gives you JSON
6. Paste JSON back into plugin
7. Done! ✅

### 3. Start Designing

- Check off goals as you complete them
- Track progress with visual bar
- Review designs by sending to Claude

---

## ⚡ Advanced Setup (Seamless Mode)

For power users who want zero copy/paste.

### Prerequisites

- Node.js installed ([download here](https://nodejs.org))
- Sidebot plugin installed in Figma

### 1. Install Bridge

```bash
# Navigate to bridge directory
cd bridge/

# Install dependencies (one-time)
npm install

# Start the bridge
npm start
```

**Or use startup scripts:**
- **Mac/Linux:** `./start.sh`
- **Windows:** Double-click `start.bat`

### 2. Keep Bridge Running

Leave the terminal window open. You should see:

```
═══════════════════════════════════════════
🚀 SIDEBOT BRIDGE SERVER
═══════════════════════════════════════════

📡 HTTP Server:      http://localhost:3000
🔌 WebSocket Server: ws://localhost:3001

Waiting for plugin connection...
```

### 3. Open Plugin

1. Open Figma
2. Run Sidebot plugin
3. Watch header turn **🟢 Claude** (connected!)

### 4. Use Seamlessly

**Select & Send:**
1. Select a frame in Figma
2. Click "📍 Selection" in plugin
3. Alert: "Design sent to Claude!"

**In Claude Desktop:**
```
You: "Review my design against the [Project Name] PRD"
```

**Claude automatically:**
- Fetches your design
- Analyzes it
- Sends fixes to plugin
- Fixes appear instantly! ✨

---

## 🔄 Workflows

### Adding a New PRD

**Manual Mode:**
1. Click "+ Add New Project"
2. Copy prompt template
3. Paste in Claude Desktop + add PRD
4. Get JSON from Claude
5. Paste back into plugin

**Seamless Mode:**
1. Just tell Claude your PRD naturally
2. Claude adds it automatically
3. Goals appear in plugin instantly

### Getting Design Review

**Manual Mode:**
1. Click "📍 Selection" → Copies data
2. Paste in Claude Desktop
3. Say "Review this"
4. Get JSON with fixes
5. Paste back into plugin

**Seamless Mode:**
1. Click "📍 Selection" → Auto-sends
2. Say "Review this" to Claude
3. Fixes appear automatically
4. No paste needed!

---

## 🟢 Connection Status

**In Plugin Header:**
- 🟢 **Claude** = Bridge connected (Seamless mode)
- 🔴 **Offline** = Bridge not running (Manual mode)

**In Bridge Terminal:**
```
🔌 Plugin connected!     ← Good!
📨 From plugin: ...       ← Data flowing
📥 Claude sending ...     ← Claude responding
```

---

## 🐛 Troubleshooting

### Plugin Issues

**"No projects showing"**
- Click "+ Add New Project" to create first one

**"JSON import failed"**
- Check JSON format: `{"projectName": "...", "goals": [...]}`
- Make sure you copied complete JSON from Claude

**"Goals not importing"**
- Try creating project first, then import
- Or import will auto-create project

### Bridge Issues (Seamless Mode)

**"Bridge not connected"**
1. Is bridge running? Check terminal
2. See "🔌 Plugin connected!" message?
3. Try closing/reopening plugin
4. Or just use Manual mode!

**"Bridge won't start"**
1. Node.js installed? Run: `node --version`
2. Dependencies installed? Run: `npm install`
3. Ports free? Close other apps on 3000/3001

**"Claude can't send commands"**
1. Bridge running? Visit: `http://localhost:3000/health`
2. Network settings allow localhost?

---

## 💡 Pro Tips

1. **Keep bridge running** while designing (Seamless mode)
2. **Be specific in PRDs** - More detail = better validation
3. **Review frequently** - Catch issues early
4. **Use keyboard shortcuts** - 1/2/3/4 for tabs
5. **Manual mode works great** - Bridge is optional!

---

## 🔒 Privacy & Security

- ✅ All data stored locally in Figma
- ✅ Bridge is localhost-only (optional)
- ✅ No external network requests
- ✅ No cloud storage
- ✅ Open source - audit the code!

---

## 🆘 Need Help?

- **Plugin Issues:** [Open issue](https://github.com/AnderMagri/sidebot/issues)
- **Bridge Issues:** Check bridge/README.md
- **Questions:** [Discussions](https://github.com/AnderMagri/sidebot/discussions)

---

## 📚 More Resources

- **README.md** - Full feature documentation
- **bridge/README.md** - Bridge technical details
- **Examples/** - Sample PRDs and workflows (coming soon)

---

**Happy designing!** 🎨✨

