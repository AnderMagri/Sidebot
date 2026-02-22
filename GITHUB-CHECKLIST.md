# 🚀 Sidebot - GitHub Publishing Checklist

## ✅ What's Ready

### Main Repository Files
- ✅ `manifest.json` - Plugin manifest (renamed to Sidebot)
- ✅ `code.js` - Plugin backend with bridge support
- ✅ `ui.html` - Plugin UI with WebSocket client
- ✅ `README.md` - Full documentation
- ✅ `SETUP.md` - Setup guide for users
- ✅ `.gitignore` - Git ignore rules

### Bridge Directory (`bridge/`)
- ✅ `bridge-server.js` - Bridge server code
- ✅ `package.json` - Node dependencies
- ✅ `start.sh` - Mac/Linux startup script
- ✅ `start.bat` - Windows startup script
- ✅ `README.md` - Bridge documentation

---

## 📋 Before Publishing

### 1. Update GitHub URLs in READMEs
Replace `AnderMagri` with your actual GitHub username in:
- `README.md` (line ~50, ~200)
- `SETUP.md` (line ~110)
- `bridge/README.md` (if any references)

### 2. Test Locally

**Test Plugin:**
```bash
# In Figma
Plugins → Development → Import plugin from manifest
# Select manifest.json
# Open plugin and test
```

**Test Bridge:**
```bash
cd bridge/
npm install
npm start
# Should see: "Waiting for plugin connection..."
```

**Test Connection:**
```bash
# With bridge running:
# Open plugin in Figma
# Header should show: 🟢 Claude
```

### 3. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit: Sidebot v1.0"
git branch -M main
git remote add origin https://github.com/AnderMagri/sidebot.git
git push -u origin main
```

### 4. Create Release (Optional Bridge Executables)

If you want to provide pre-built executables:

**Using `pkg`:**
```bash
cd bridge/
npm install -g pkg
pkg bridge-server.js --targets node18-macos-x64,node18-win-x64 --output dist/sidebot-bridge
# Creates: dist/sidebot-bridge-macos, dist/sidebot-bridge-win.exe
```

**Create GitHub Release:**
1. Go to GitHub → Releases → Create new release
2. Tag: `v1.0.0`
3. Title: `Sidebot v1.0.0 - Initial Release`
4. Upload executables (if created)
5. Publish!

---

## 📱 Figma Community Submission

### Required Assets

1. **Plugin Icon** (128x128px)
   - Square icon with Sidebot branding
   - Clear, recognizable at small size

2. **Cover Image** (1920x1080px)
   - Screenshot of plugin in action
   - Show key features

3. **Additional Screenshots** (recommended 3-5)
   - Projects tab with list
   - Goals tab with progress bar
   - Fixes tab with issues
   - Bridge connection indicator
   - Claude Desktop integration

### Submission Info

**Name:** Sidebot

**Tagline:** AI-Powered PRD Validation with Claude Desktop

**Description:**
```
Validate your Figma designs against PRD requirements in real-time using Claude Desktop.

Features:
• Track PRD goals with visual progress
• Get instant design reviews from Claude
• Find grammar errors and inconsistencies
• Manual or seamless bridge mode
• No cloud - all data stays local

Perfect for product designers who want to ship pixel-perfect work, faster.
```

**Categories:**
- Productivity
- Design Review
- Documentation

**Tags:**
- AI
- PRD
- Validation
- Claude
- Review
- Requirements
- QA

### Submission Steps

1. Go to Figma Community
2. Click "Publish" in plugin menu
3. Upload assets
4. Fill in description
5. Submit for review
6. Wait for approval (usually 1-3 days)

---

## 🎯 Marketing

### README Badges (Add to top of README.md)

```markdown
[![Figma Plugin](https://img.shields.io/badge/Figma-Community-blueviolet?logo=figma)](YOUR-FIGMA-PLUGIN-URL)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/AnderMagri/sidebot/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
```

### Social Media

**Twitter/X Post:**
```
🚀 Launching Sidebot - AI-powered PRD validation for Figma!

✨ Track requirements in real-time
🤖 Get instant reviews from Claude Desktop
🎯 Never miss a design requirement again

Manual or seamless mode. All data stays local.

Try it: [Figma Community Link]
GitHub: [Repo Link]

#Figma #AI #ProductDesign
```

**Product Hunt:**
- Title: Sidebot - AI-Powered PRD Validation for Figma
- Tagline: Validate designs against requirements with Claude Desktop
- Link to Figma Community page
- Demo video showing workflow

---

## 🐛 Post-Launch Checklist

- [ ] Monitor GitHub issues
- [ ] Respond to Figma Community comments
- [ ] Create demo video (optional)
- [ ] Write blog post about how it works (optional)
- [ ] Collect user feedback
- [ ] Plan v2.0 features

---

## 📊 Analytics to Track

- GitHub stars
- Figma Community installs
- Issues reported
- Feature requests
- Bridge downloads

---

## 🔄 Future Updates

### v1.1 (Bug Fixes)
- Address user-reported issues
- Improve error messages
- Add more examples to docs

### v2.0 (Major Features)
- Multi-file support
- Export reports
- Team collaboration
- Notion/Linear integration

---

**You're ready to ship! 🎉**

Good luck with the launch! 🚀
