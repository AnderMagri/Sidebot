# 🤖 Sidebot AI

**Sidebot** is a powerful "Sidecar" assistant for Figma that bridges the gap between your design canvas and world-class AI models like **Gemini** and **Claude**. Operating as a persistent, non-intrusive sidebar, Sidebot allows you to chat with your design, automate complex layer operations, and translate visual layouts into production code in real-time.

---

## ✨ Features

- **Model Context Protocol (MCP) Integration**: Leverages the industry-standard MCP to give AI agents "eyes" on your Figma document structure.
- **Dual-AI Intelligence**: Seamlessly switch between **Gemini Spark** (ideal for deep reasoning and brainstorming) and **Claude Link** (perfect for high-fidelity design-to-code translations).
- **Local WebSocket Bridge**: Uses a dedicated local server (`bridge.js`) to enable secure, real-time communication between the Figma Desktop app and your AI clients.
- **Smart Key Storage**: Securely stores your API keys locally using Figma's `clientStorage` API, so you only have to set them up once.
- **Sleek "Sidecar" UI**: A 240px vertical interface designed to sit perfectly alongside native Figma panels for a distraction-free workflow.

---

## 🚀 Quick Start

To use Sidebot, you must run a small local bridge server that acts as the "hands" for the AI.

### 1. Clone & Install
Clone this repository and install the necessary Node.js dependencies:

```
bash
git clone https://github.com/AnderMagri/Sidebot
cd Sidebot
npm install

```

## 2. Configure Your Environment

Create a .env file in the root directory and add your API keys:

Gemini Key: Obtain from Google AI Studio. https://aistudio.google.com/

Claude Key: Obtain from the Anthropic Console. https://console.anthropic.com/

3. Start the Bridge Server
Run the bridge in your terminal. This must remain active while you use the plugin:

Bash
node bridge.js
Expected output: 🚀 Sidebot Bridge active on ws://localhost:9223.

4. Install the Figma Plugin
Open the Figma Desktop App.

Navigate to Plugins > Development > Import plugin from manifest....

Select the manifest.json file located in the /plugin folder.

🛠️ Usage Guide
Activate: Open the Sidebot AI plugin and click "Turn On Bridge".

Select Model: Choose your preferred AI engine.

Analyze & Create:

Select any frame or layer in Figma.

Ask Sidebot: "Translate this selection to Tailwind CSS" or "Analyze the spacing consistency of this layout".

Visual Feedback: The green pulsing LED indicates that Sidebot is "Live" and connected to your local bridge.

📂 Project Structure
Plaintext
Sidebot/
├── bridge.js          # The Node.js WebSocket bridge server
├── package.json       # Project dependencies and scripts
└── plugin/            # Figma Plugin source files
    ├── manifest.json  # Plugin permissions and entry points
    ├── code.js        # Main Figma API logic
    └── ui.html        # Sidecar interface and chat UI

🔒 Security & Privacy
Local Execution: All communication happens over localhost:9223. Your design data is never stored on Sidebot servers.

Zero-Storage Keys: API keys are stored on your local machine only and never committed to GitHub.

User-Controlled: The AI only accesses the layers you select or explicitly authorize.

Made with ❤️ for the Figma Community.


---

To ensure your GitHub project is fully ready for users, I can also provide the content for the **`.env.example`** and **`package.json`** files to include in your repository. Would you like me to do that?