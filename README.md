# 🤖 Sidebot AI - Bridge Server

This is the **local bridge server** for the [Sidebot AI Figma Plugin](https://www.figma.com/community/plugin/YOUR_PLUGIN_ID).

The bridge connects the Sidebot plugin to Gemini and Claude AI models running on your machine.

---

## 🚀 Quick Setup

### 1. Install the Figma Plugin
First, install **Sidebot AI** from the Figma Community:

👉 [Install Sidebot AI Plugin](https://www.figma.com/community/plugin/YOUR_PLUGIN_ID)

### 2. Download & Install Bridge
```bash
git clone https://github.com/AnderMagri/Sidebot.git
cd Sidebot
npm install
```

### 3. Configure API Keys
Copy the example file:
```bash
cp .env.example .env
```

Edit `.env` and add your keys:
- **Gemini**: Get from [Google AI Studio](https://aistudio.google.com/)
- **Claude**: Get from [Anthropic Console](https://console.anthropic.com/)
```env
GEMINI_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
```

### 4. Start the Bridge
```bash
npm start
```

You should see:
```
🚀 Sidebot Multi-Bridge active on ws://localhost:9223
```

**Keep this running** while using the plugin in Figma.

### 5. Use the Plugin
1. Open Figma Desktop
2. Run **Sidebot AI** from Plugins menu
3. The plugin will auto-detect the running bridge
4. Enter your API keys in the plugin UI
5. Choose Gemini or Claude and start designing!

---

## 📋 Requirements

- Node.js 16+ 
- Figma Desktop App (plugin doesn't work in browser)
- API keys for Gemini and/or Claude

---

## 🔒 Security & Privacy

✅ All communication over `localhost` only  
✅ API keys stored locally in `.env`  
✅ Your designs never leave your machine  
✅ No data sent to Sidebot servers (there are none!)

---

## 🛠️ Troubleshooting

**Plugin says "Bridge Not Running":**
- Make sure `npm start` is running in terminal
- Check you see "🚀 Sidebot Multi-Bridge active"

**"Invalid API Key" errors:**
- Double-check your `.env` file has correct keys
- Verify keys work at AI Studio / Anthropic Console

**Port already in use:**
- Another app is using port 9223
- Stop other apps or change port in `bridge.js` (line 6)

---

## 💡 How It Works
```
Figma Plugin (UI) 
    ↕️ WebSocket (localhost:9223)
Bridge Server (this repo)
    ↕️ HTTPS API calls
Gemini / Claude AI
```

The bridge is needed because Figma plugins can't make direct API calls to external services for security reasons.

---

## 📝 License
MIT © Ander Magri

---

## 🤝 Contributing
Issues and PRs welcome! Please check existing issues first.

---

**Made with ❤️ for the Figma Community**
