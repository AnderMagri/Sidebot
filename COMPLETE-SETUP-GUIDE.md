# 🚀 Sidebot - Complete Setup Guide

**Get started with AI-powered PRD validation in 5 minutes!**

---

## 📦 What You'll Need

### Required (Free):
1. ✅ **Figma Desktop** (not browser version)
2. ✅ **Claude Desktop** (claude.ai account)
3. ✅ **Sidebot Plugin** (this plugin)

### Optional (For Advanced Features):
4. ⚡ **Node.js** (for bridge server)
5. ⚡ **Figma Desktop Bridge Plugin** (for direct file reading)

---

## 🎯 Choose Your Setup

### 🆓 Basic Setup (Recommended for Most Users)
**What you get:** Full PRD tracking, goal management, design reviews
**Time:** 2 minutes
**No installation needed!**

👉 [Jump to Basic Setup](#basic-setup)

### ⚡ Advanced Setup (Power Users)
**What you get:** Everything + seamless auto-sync with Claude
**Time:** 10 minutes
**Requires:** Node.js installation

👉 [Jump to Advanced Setup](#advanced-setup)

---

<a name="basic-setup"></a>
## 🆓 BASIC SETUP (Recommended)

### Step 1: Install Sidebot Plugin

**Option A: From Figma Community (Coming Soon)**
1. Open Figma Desktop
2. Plugins → Browse Community
3. Search "Sidebot"
4. Click Install

**Option B: From GitHub (Now)**
1. Download from https://github.com/AnderMagri/Sidebot
2. Extract the files
3. Figma → Plugins → Development → Import plugin from manifest
4. Select `manifest.json`

### Step 2: Open Plugin

1. Open any Figma file
2. Plugins → Sidebot
3. You'll see the plugin sidebar! ✅

### Step 3: Create Your First Project

1. Click **"+ Add New Project"** in Projects tab
2. You'll see a prompt template - **click it to copy**
3. Open Claude Desktop (claude.ai)
4. **Paste the prompt** and add your PRD requirements

**Example:**
```
Analyze this PRD and create JSON for Sidebot:

PROJECT: Mobile Banking Dashboard

BACKGROUND: Clean white (#FFFFFF)
PRIMARY COLOR: Teal (#14B8A6)

REQUIRED ELEMENTS:
- Header with logo and user avatar
- Balance card showing $X,XXX.XX
- Quick actions (Send, Request, Pay)
- Transaction list (5+ items)
- Bottom navigation (Home, Cards, Activity, Profile)
```

5. **I'll respond with JSON** like:
```json
{
  "projectName": "Mobile Banking Dashboard",
  "goals": [
    "White background (#FFFFFF)",
    "Teal primary color (#14B8A6)",
    "Header with logo",
    ...
  ]
}
```

6. **Copy the JSON I gave you**
7. **Paste into Sidebot** plugin
8. **Click "✨ Import Project + Goals"**

### Step 4: Design & Track!

- ✅ Design your screen in Figma
- ✅ Check off goals as you complete them
- ✅ Watch progress bar update

### Step 5: Get Design Review

1. Select your frame in Figma
2. Click **"📍 Selection"** in Goals tab
3. Copy the design data that appears
4. Paste in Claude Desktop chat
5. Say: **"Review this design against the PRD"**
6. I'll analyze and give you fixes as JSON
7. Paste fixes back into plugin

**That's it! You're using Sidebot!** 🎉

---

<a name="advanced-setup"></a>
## ⚡ ADVANCED SETUP (Seamless Mode)

**For power users who want zero copy/paste**

### Prerequisites

1. ✅ Completed Basic Setup above
2. ✅ Node.js installed ([download here](https://nodejs.org))

### Step 1: Download Bridge

1. Go to https://github.com/AnderMagri/Sidebot
2. Download or clone the repo
3. Navigate to the `bridge/` folder

### Step 2: Install Bridge Dependencies

**Mac/Linux:**
```bash
cd bridge/
npm install
```

**Windows:**
```
cd bridge
npm install
```

### Step 3: Start Bridge Server

**Mac/Linux:**
```bash
./start.sh
```

**Windows:**
```
Double-click start.bat
```

**You should see:**
```
🤖 SIDEBOT BRIDGE SERVER
📡 HTTP Server:      http://localhost:3000
🔌 WebSocket Server: ws://localhost:3001

Waiting for plugin connection...
```

**✅ Leave this terminal window open!**

### Step 4: Connect Plugin

1. Open Sidebot plugin in Figma
2. Look at the header
3. Wait 2-3 seconds...
4. Header should change from **🔴 Offline** to **🟢 Claude**

**Connected!** 🎉

### Step 5: Use Seamlessly

Now when you:
1. Select a frame
2. Click "📍 Selection"

The design is **automatically sent** to me (Claude)!

Then just tell me in chat:
```
"Review my design against the Mobile Banking PRD"
```

And I'll **automatically send fixes** to your plugin. No copy/paste! ✨

---

## 🔧 Optional: Direct File Reading

**Want me to read your Figma file directly?**

### Install Figma Desktop Bridge Plugin

1. **In Claude Desktop:**
   - Settings → Connectors
   - Find "Figma"
   - Click "Connect"
   
2. **In Figma Desktop:**
   - Right-click anywhere
   - Plugins → Development → **Figma Desktop Bridge**
   - Click "Run"

3. **Back in Claude Desktop:**
   - Should show "Figma: Connected" ✅

**Now I can:**
- Read your designs directly
- Analyze multiple frames
- Check consistency across screens
- No need to use "📍 Selection" button!

---

## 🎯 Quick Reference

### Basic Mode Workflow:
```
1. Tell Claude your PRD → Get JSON
2. Paste JSON → Import to plugin
3. Design in Figma
4. Select frame → Copy data → Paste in Claude
5. Claude reviews → Get fixes JSON
6. Paste fixes → See in plugin
```

### Seamless Mode Workflow:
```
1. Start bridge server
2. Open plugin (auto-connects 🟢)
3. Tell Claude your PRD → Auto-imported!
4. Design in Figma
5. Select frame → Click "📍 Selection"
6. Tell Claude "Review this" → Auto-synced!
```

### With Figma Desktop Bridge:
```
Just talk to Claude naturally!
"Review all my screens"
"Check consistency"
"Find grammar errors"
Everything happens automatically ✨
```

---

## 🐛 Troubleshooting

### Plugin won't install
- Using Figma Desktop (not browser)?
- manifest.json in the folder?

### "No projects showing"
- Click "+ Add New Project" to create one
- Or import JSON from Claude

### Bridge won't connect
- Is Node.js installed? `node --version`
- Is bridge running? Should see server message
- Start bridge BEFORE opening plugin
- Check firewall isn't blocking localhost

### Claude can't read my file
- Install Figma Desktop Bridge plugin
- Make sure it's running in Figma
- Check Claude Desktop shows "Figma: Connected"

### Still stuck?
- Use Basic Mode - it always works!
- Open issue on GitHub
- Check TROUBLESHOOTING.md

---

## 💡 Pro Tips

1. **Start with Basic Mode** - Learn the workflow first
2. **Be specific in PRDs** - More detail = better validation  
3. **Review frequently** - Catch issues early
4. **Bridge is optional** - Basic Mode works great!
5. **Check off goals** - Stay motivated with progress bar

---

## 📚 More Resources

- **README.md** - Full feature documentation
- **TROUBLESHOOTING.md** - Debug guide
- **GitHub Issues** - Report bugs
- **Discussions** - Ask questions

---

## 🎉 You're Ready!

Start with Basic Mode, add Seamless Mode later if you want.

**Happy designing!** 🎨✨

