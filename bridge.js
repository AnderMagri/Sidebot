const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config(); // Essential: This reads the user's local .env file

const wss = new WebSocketServer({ port: 9223 });
console.log("🚀 Sidebot Bridge active on ws://localhost:9223");
console.log("Waiting for Figma plugin to connect...");

wss.on('connection', (ws) => {
  console.log("🟢 Sidebot Plugin Connected!");

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Prioritize the key in .env, fallback to plugin-provided key
      const apiKey = process.env.GEMINI_API_KEY || data.key;

      if (!apiKey) {
        console.error("❌ No API Key found in .env or plugin.");
        return;
      }

      if (data.type === 'user-chat' && data.model === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        console.log("🤖 Processing request for Gemini...");
        const result = await model.generateContent(data.text);
        
        ws.send(JSON.stringify({ 
          type: 'ai-response', 
          text: result.response.text() 
        }));
        console.log("✅ Response sent to Figma.");
      }
    } catch (err) {
      console.error("❌ Bridge Error:", err.message);
    }
  });

  ws.on('close', () => console.log("🔴 Sidebot Plugin Disconnected."));
});
