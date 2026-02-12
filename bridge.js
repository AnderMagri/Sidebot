const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const wss = new WebSocketServer({ port: 9223 });
console.log("🚀 Sidebot Bridge active on ws://localhost:9223");

wss.on('connection', (ws) => {
  console.log("🟢 Sidebot Plugin Connected");

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle Gemini Chat Requests
      if (data.type === 'user-chat' && data.model === 'gemini') {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || data.key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(data.text);
        ws.send(JSON.stringify({ type: 'ai-response', text: result.response.text() }));
      }
    } catch (err) {
      console.error("❌ Bridge Error:", err.message);
    }
  });
});
