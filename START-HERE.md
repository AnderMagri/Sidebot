# 🤖 START HERE - Sidebot Setup

## 📍 You Are Here

All files are in `/mnt/project/` - ready to push to GitHub!

---

## 🚀 Quick Start (3 Steps)

### Step 1: Create GitHub Repo (2 minutes)

1. **Go to:** https://github.com/new
2. **Name:** `sidebot`
3. **Description:** AI-Powered PRD Validation for Figma
4. **Public** ✅
5. **Click "Create repository"**

### Step 2: Push Code (1 minute)

```bash
cd /mnt/project/

git init
git add .
git commit -m "Initial commit: Sidebot v1.0"
git branch -M main

# Replace YOUR-USERNAME with your GitHub username!
git remote add origin https://github.com/YOUR-USERNAME/sidebot.git

git push -u origin main
```

### Step 3: Update URLs (1 minute)

**Open these files and replace `YOUR-USERNAME` with your GitHub username:**

1. `README.md` (search for YOUR-USERNAME, replace all)
2. `ui.html` (line ~831)
3. `SETUP.md` (if any references)

**Then commit:**
```bash
git add .
git commit -m "docs: Update GitHub URLs"  
git push
```

---

## ✅ Done! Now Test:

### Test Plugin
```bash
Figma → Plugins → Development → Import manifest
Browse to /mnt/project/
Select manifest.json
```

### Test Bridge
```bash
cd bridge/
npm install
npm start
```

### Test Download Button
1. Open plugin in Figma
2. Settings tab → Click "📥 Download Bridge App"
3. Should open GitHub!

---

## 📚 Documentation

- `README.md` - Full docs
- `SETUP.md` - User setup guide
- `GITHUB-CHECKLIST.md` - Publishing checklist
- `PUSH-TO-GITHUB.md` - Detailed push instructions
- `BUILD-COMPLETE.md` - What we built

---

## 💡 Key Features

**✅ Plugin has:**
- Manual mode (copy/paste JSON)
- Seamless mode (with bridge)
- Download button in Settings tab
- Auto-reconnect
- Beautiful dark UI

**✅ Bridge has:**
- Node.js server
- WebSocket + HTTP
- Startup scripts
- Cross-platform

---

## 🎯 Users Will:

1. Install plugin from Figma Community
2. See download button in Settings
3. Click → Go to your GitHub
4. Download bridge (optional)
5. Run bridge → Auto-connects!

---

**Questions? Just ask Claude (me)!** 💬

Happy shipping! 🚀

