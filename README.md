# 🤖 Sidebot

**AI-Powered PRD Validation for Figma**

Work directly with Claude Desktop to validate your designs against PRD requirements in real-time. Get instant feedback, catch inconsistencies, and track progress—all without leaving Figma.

---

## ✨ Features

### 📋 **PRD Management**
- Import requirements from Claude Desktop
- Track multiple projects simultaneously
- Keep PRDs visible while designing

### 🎯 **Goals Tracking**
- Visual progress bar
- Check off completed requirements
- See at a glance what's done vs pending

### 🔧 **Issue Tracking**
- Claude finds problems and adds them to Fixes tab
- Grammar errors, missing elements, wrong colors
- Mark as fixed when completed

### 🤖 **Two Modes**

**🆓 Manual Mode (Works Immediately)**
- Copy prompt template from plugin
- Paste in Claude Desktop with your PRD
- Claude gives you JSON
- Paste JSON back into plugin
- Perfect for occasional use

**⚡ Seamless Mode (Advanced)**
- Download [Sidebot Bridge](https://github.com/AnderMagri/sidebot-bridge) (optional)
- Real-time sync with Claude Desktop
- No copy/paste needed!
- For power users

---

## 🚀 Quick Start

### 1. Install Plugin

**From Figma Community:**
1. Search for "Sidebot" in Figma plugins
2. Click Install
3. Run: `Plugins → Sidebot`

**From Development:**
1. Download this repo
2. In Figma: `Menu → Plugins → Development → Import plugin from manifest`
3. Select `manifest.json`

### 2. Create Your First Project

**In Sidebot Plugin:**
1. Click **"+ Add New Project"**
2. Copy the prompt template
3. Paste in Claude Desktop with your PRD

**In Claude Desktop:**
```
Analyze this PRD and create JSON for Sidebot:

[Your PRD here]

BACKGROUND: Clean white
PRIMARY COLOR: Teal #14B8A6
REQUIRED ELEMENTS:
- Header with logo
- Balance card
- Quick actions
...
```

**Claude responds with JSON** →  Paste back into plugin → Done! ✅

### 3. Design & Track

- Work in Figma as normal
- Check off goals as you complete them
- Watch progress bar update

### 4. Get Review

**Manual Mode:**
1. Select your frame
2. Click "📍 Selection" or "📄 Current Page"
3. Tell Claude: "Review my design"
4. Claude gives you fixes JSON
5. Paste into plugin

**Seamless Mode (with Bridge):**
1. Select your frame
2. Click "📍 Selection"
3. Tell Claude: "Review my design"
4. Fixes appear automatically! ✨

---

## ⚡ Seamless Mode Setup (Optional)

For power users who want zero copy/paste:

### 1. Install Sidebot Bridge

Download from: **[github.com/AnderMagri/sidebot-bridge](https://github.com/AnderMagri/sidebot-bridge)**

**Mac:**
```bash
# Download and extract
# Double-click Sidebot-Bridge.app
```

**Windows:**
```bash
# Download and extract
# Double-click Sidebot-Bridge.exe
```

### 2. Connect

1. Start bridge (double-click)
2. Open Sidebot plugin in Figma
3. Watch header turn **🟢 Claude** (connected!)

### 3. Use Seamlessly

- Select frames → Click "📍 Selection"
- Talk to Claude naturally
- Fixes appear automatically
- No copy/paste! 🎉

---

## 📖 Example Commands for Claude

### Add PRD:
```
Add this PRD to Sidebot for project "Mobile App":

BACKGROUND: Clean white
PRIMARY COLOR: Teal #14B8A6
REQUIRED:
- Header with logo and avatar
- Balance card
- Transaction list (5+ items)
- Bottom navigation (4 tabs)
```

### Review Design:
```
Review my selected design against the Mobile App PRD.
```

### Check Consistency:
```
Compare my Login, Dashboard, and Settings screens.
Are colors, fonts, and spacing consistent?
```

---

## ⌨️ Keyboard Shortcuts

- `1` = Projects tab
- `2` = Goals tab
- `3` = Fixes tab
- `4` = Settings tab

---

## 🔧 How It Works

### Architecture

```
┌──────────────┐         ┌──────────────┐         ┌─────────────────┐
│ Figma Plugin │         │ Bridge (opt) │         │ Claude Desktop  │
│              │◄───────►│ localhost    │◄───────►│                 │
│ • Stores PRDs│WebSocket│ • Port 3000  │  HTTP   │ • Analyzes      │
│ • Tracks goals│        │ • Port 3001  │         │ • Sends fixes   │
└──────────────┘         └──────────────┘         └─────────────────┘
```

### Data Storage

- All data stored **locally in Figma** (`clientStorage`)
- No cloud, no external APIs
- Bridge is optional local helper
- Privacy-first architecture ✅

---

## 🐛 Troubleshooting

### "No projects showing"
→ Click "+ Add New Project" to create your first one

### "JSON import failed"
→ Make sure you copied the complete JSON from Claude  
→ Check format: `{"projectName": "...", "goals": [...]}`

### "Bridge not connected" (Seamless mode)
→ Is bridge app running? Check if you see it in menu bar  
→ Try closing/reopening plugin  
→ Or just use Manual mode (works without bridge!)

---

## 💡 Tips for Best Results

1. **Be specific in PRDs** - More detail = better tracking
2. **Review frequently** - Catch issues early
3. **Use consistent naming** - Makes switching easier
4. **Check off goals as you go** - Stay motivated!

---

## 🚀 Roadmap (v2.0)

Coming soon:
- Multi-file project support
- Export reports for stakeholders
- Custom annotation styles
- Team collaboration features
- Notion/Linear integration

---

## 🔒 Privacy & Security

- ✅ All data stays in your Figma file
- ✅ No external network requests
- ✅ Bridge is localhost-only (optional)
- ✅ No telemetry or tracking
- ✅ Open source - audit the code!

---

## 📝 Version Info

**Version:** 1.0.0  
**Release Date:** February 2026  
**Compatibility:** Figma Desktop + Claude Desktop  

---

## 🤝 Contributing

Found a bug? Have a feature request?

1. Open an issue
2. Submit a PR
3. Share feedback!

---

## 📄 License

MIT License - see LICENSE file

---

## 🆘 Support

- **Plugin Issues:** Open issue in this repo
- **Bridge Issues:** Open issue in [sidebot-bridge repo](https://github.com/AnderMagri/sidebot-bridge)
- **General Questions:** Discussions tab

---

**Built with ❤️ for designers who want perfect work, faster.**


