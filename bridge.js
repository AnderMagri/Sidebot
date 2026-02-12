const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const wss = new WebSocketServer({ port: 9223 });
console.log("🚀 Sidebot Multi-Bridge active on ws://localhost:9223");

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // ROUTE TO GEMINI with Figma context
      if (data.type === 'user-chat' && data.model === 'gemini') {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          tools: [{ functionDeclarations: getFigmaTools() }]
        });
        
        // Build context-aware prompt
        const prompt = buildPromptWithContext(data.text, data.figmaContext);
        const result = await model.generateContent(prompt);
        
        // Handle function calls if AI wants to modify Figma
        const response = result.response;
        if (response.functionCalls) {
          ws.send(JSON.stringify({ 
            type: 'execute-figma-actions', 
            actions: response.functionCalls 
          }));
        }
        
        ws.send(JSON.stringify({ 
          type: 'ai-response', 
          text: response.text() 
        }));
      }

      // ROUTE TO CLAUDE with Figma context
      if (data.type === 'user-chat' && data.model === 'claude') {
        const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
        
        const msg = await anthropic.messages.create({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 4096,
          tools: getFigmaTools(),
          messages: [{
            role: "user",
            content: buildPromptWithContext(data.text, data.figmaContext)
          }],
        });
        
        // Handle tool use
        if (msg.stop_reason === 'tool_use') {
          const toolUse = msg.content.find(block => block.type === 'tool_use');
          ws.send(JSON.stringify({
            type: 'execute-figma-actions',
            actions: [toolUse]
          }));
        }
        
        const textContent = msg.content.find(block => block.type === 'text');
        ws.send(JSON.stringify({ 
          type: 'ai-response', 
          text: textContent?.text || 'Action completed'
        }));
      }

    } catch (err) {
      console.error("❌ Bridge Error:", err.message);
      ws.send(JSON.stringify({ type: 'ai-response', text: "Error: " + err.message }));
    }
  });
});

// Define Figma modification tools for AI
function getFigmaTools() {
  return [
    {
      name: "create_rectangle",
      description: "Creates a rectangle in Figma",
      parameters: {
        type: "object",
        properties: {
          width: { type: "number" },
          height: { type: "number" },
          x: { type: "number" },
          y: { type: "number" },
          fillColor: { type: "string", description: "Hex color like #FF0000" }
        },
        required: ["width", "height"]
      }
    },
    {
      name: "modify_text",
      description: "Changes text content of selected text layer",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          newText: { type: "string" }
        },
        required: ["nodeId", "newText"]
      }
    },
    {
      name: "change_color",
      description: "Changes fill color of selected node",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          color: { type: "string", description: "Hex color" }
        },
        required: ["nodeId", "color"]
      }
    }
  ];
}

function buildPromptWithContext(userMessage, figmaContext) {
  if (!figmaContext) return userMessage;
  
  return `You are connected to Figma. Current context:
Selected nodes: ${JSON.stringify(figmaContext.selection, null, 2)}
Page: ${figmaContext.pageName}

User request: ${userMessage}

You can modify Figma by calling the provided tools. Be specific about which nodes to modify using their IDs.`;
}
