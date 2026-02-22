# 🚀 How to Push Sidebot to GitHub

## Quick Method (5 minutes)

### 1. Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: **sidebot**
3. Description: **AI-Powered PRD Validation for Figma**
4. Make it **Public** ✅
5. Click **"Create repository"**

### 2. Push Your Code

GitHub will show you commands. Use this instead:

```bash
cd /mnt/project/

git init
git add .
git commit -m "Initial commit: Sidebot v1.0"
git branch -M main
git remote add origin https://github.com/AnderMagri/sidebot.git
git push -u origin main
```

**Replace `AnderMagri` with your actual GitHub username!**

### 3. Update Links in Files

After pushing, update these files with your actual GitHub username:

**In `README.md`:**
- Find all `AnderMagri` 
- Replace with your GitHub username

**In `ui.html` (line ~831):**
- Find `AnderMagri`
- Replace with your GitHub username

**Then commit again:**
```bash
git add .
git commit -m "docs: Update GitHub URLs"
git push
```

---

## ✅ Done!

Your repo will be at:
**https://github.com/AnderMagri/sidebot**

Users can now:
1. Install plugin from Figma Community
2. Click "📥 Download Bridge App" in Settings
3. Get taken to your GitHub repo
4. Download the bridge!

---

## 🎯 Next: Test Everything

### Test Plugin
```bash
# In Figma
Plugins → Development → Import from /mnt/project/manifest.json
```

### Test Bridge
```bash
cd /mnt/project/bridge/
npm install
npm start
# Should see: "Waiting for plugin connection..."
```

### Test Download Button
1. Open plugin in Figma
2. Go to Settings tab
3. Click "📥 Download Bridge App"
4. Should open your GitHub repo!

---

**Questions? Just ask!** 💬
