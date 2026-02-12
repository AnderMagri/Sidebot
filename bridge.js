const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Anthropic = require('@anthropic-ai/sdk'); // Add Claude SDK
require('dotenv').config();

const wss = new WebSocketServer({ port: 9223 });
console.log("🚀 Sidebot Multi-Bridge active on ws://localhost:9223");

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // ROUTE TO GEMINI
      if (data.type === 'user-chat' && data.model === 'gemini') {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(data.text);
        ws.send(JSON.stringify({ type: 'ai-response', text: result.response.text() }));
      }

      // ROUTE TO CLAUDE
      if (data.type === 'user-chat' && data.model === 'claude') {
        const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
        const msg = await anthropic.messages.create({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 1024,
          messages: [{ role: "user", content: data.text }],
        });
        ws.send(JSON.stringify({ type: 'ai-response', text: msg.content[0].text }));
      }

    } catch (err) {
      console.error("❌ Bridge Error:", err.message);
      ws.send(JSON.stringify({ type: 'ai-response', text: "Error: " + err.message }));
    }
  });
});
