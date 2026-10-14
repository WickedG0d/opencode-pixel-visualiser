# 👾 WickedG0d Pixel Visualizer & Multi-Agent Orchestrator

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension%20Ready-007ACC.svg?logo=visualstudiocode)](vscode-extension/)
[![Parallel Agents](https://img.shields.io/badge/Agents-5%20Parallel%20Desks-8B5CF6.svg)](orchestrator.js)
[![Node.js & Bun](https://img.shields.io/badge/Runtime-Node.js%20%7C%20Bun-green.svg)](visualizer/ocv-server.ts)

**Turning raw AI agent terminal logs and multi-agent workflows into a live, cozy 2D pixel-art office scene.** Watch your agents work concurrently at their desks with floating task bubbles, idle, take coffee breaks, and collaborate in real-time.

Supports **VS Code IDE**, **Antigravity IDE**, and **OpenCode CLI** with native parallel multi-agent orchestration.

---

## 🔥 Real-Time Office Scene

<img src="images/cover.png" width="100%" alt="OpenCode & VS Code Pixel Visualizer" />

---

## ✨ Features

- **⚡ Real-Time Multi-Agent Parallel Visualization:** Watch up to 5 AI agents simultaneously execute tasks in parallel at dedicated desks.
- **💬 Floating Task Speech Bubbles:** Live glowing speech bubbles above characters showing current tasks, tools (`run_command`, `write_to_file`, etc.), and animated pulsing status indicators.
- **💻 1st-Class VS Code IDE Integration:**
  - View inside an editor tab or side panel using VS Code Simple Browser or Webview.
  - Bundled as a standalone **VS Code Extension (`.vsix`)** ready for GitHub Releases.
  - Pre-configured `.vscode/tasks.json` and `.vscode/launch.json` for one-key execution (`Ctrl+Shift+B` / `F5`).
- **🤖 Built-in Parallel Orchestrator:**
  - Dynamically loads 5 specialized engineering skills from `.agents/skills/`:
    1. **Frontend Developer** (`engineering-frontend-developer`) — *Desk 1 (person1)*
    2. **Backend Architect** (`engineering-backend-architect`) — *Desk 2 (person2)*
    3. **API Platform Engineer** (`engineering-api-platform-engineer`) — *Desk 3 (person3)*
    4. **Software Architect** (`engineering-software-architect`) — *Desk 4 (person4)*
    5. **DevOps Automator** (`engineering-devops-automator`) — *Desk 5 (person5)*
  - Executes concurrent parallel sprints with live WebSocket broadcasting to the office scene.
- **🔄 Universal Compatibility:** Works on **Node.js** and **Bun** across Windows, macOS, and Linux.
- **🎮 Unique Pixel Animations:** 5 customizable character skins with idle, walk, desk-typing, scratch, yawn, and coffee break animations.

---

## 🚀 Quickstart & How to Run

### 1. Install Dependencies & Build
```bash
npm install
npm run build
```

### 2. Start the Visualizer Server
```bash
npm start
```
The server will start on `http://localhost:5173` and serve the live office scene and WebSocket broker.

### 3. View in VS Code
- **Method A (Simple Browser - Zero Install):**
  Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) → Select **`Simple Browser: Show`** → Enter `http://localhost:5173`.
  
  Or run directly from terminal:
  ```bash
  npm run vscode
  ```

- **Method B (VS Code Extension VSIX):**
  Install the pre-bundled extension from the `releases/` directory:
  ```bash
  code --install-extension releases/opencode-pixel-visualizer-1.0.0.vsix
  ```
  Once installed, click **`$(symbol-event) Pixel Visualizer`** in the VS Code bottom status bar to open the office scene beside your editor!

---

## ⚡ Running the Parallel Orchestrator

To watch all 5 engineering agents spawn, claim desks, and execute concurrent tasks in parallel:

```bash
# Run a single parallel sprint
npm run orchestrate

# Run in continuous demonstration loop
npm run orchestrate:loop
```

Or simply open `http://localhost:5173` and click the **`⚡ Run 5 Parallel Agents`** button in the top HUD!

---

## 📦 Bundling the VS Code Extension (.vsix)

The extension is bundled and packaged into `releases/`:

```bash
# Package the extension using vsce
cd vscode-extension
npx @vscode/vsce package --allow-missing-repository
```
The resulting `.vsix` file is generated at `releases/opencode-pixel-visualizer-1.0.0.vsix` and can be uploaded directly to GitHub Releases.

---

## 🧪 Testing & Verification

Run the test suite and quality gates:

```bash
# Run Jest unit & integration tests
npm test

# Run ESLint check
npm run lint

# Run full pre-publish quality gate
npm run prepublishOnly
```

---

## 🔌 Using with OpenCode

To use as an OpenCode plugin in any project:

```bash
opencode plugin wickedg0d-opencode-visualizer
```

Or add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["wickedg0d-opencode-visualizer"]
}
```

---

## 📂 Project Structure

```
opencode-pixel-visualiser/
├── .agents/
│   ├── scripts/antigravity-hook.cjs  # Non-blocking IDE lifecycle hook bridge
│   └── skills/                       # 120+ specialized agent skill definitions
├── .vscode/
│   ├── tasks.json                    # VS Code build and run tasks
│   ├── launch.json                   # VS Code F5 debug configurations
│   └── settings.json                 # VS Code workspace settings
├── releases/
│   └── opencode-pixel-visualizer-1.0.0.vsix # Packaged VS Code extension
├── vscode-extension/                 # VS Code extension source code & manifest
├── visualizer/
│   ├── index.html                    # 60 FPS pixel-art canvas office scene
│   ├── ocv-server.ts                 # Dual Node/Bun HTTP & WebSocket server
│   ├── person1..person5/             # 5 animated sprite sheets & directions
│   └── textures/                     # Desk, coffee table, and room textures
├── orchestrator.js                   # 5-agent parallel execution orchestrator
├── index.ts                          # OpenCode plugin entry point
└── package.json
```

---

## 👤 Author

Developed & Maintained by **WickedG0d**  
Repository: [github.com/WickedG0d/opencode-pixel-visualiser](https://github.com/WickedG0d/opencode-pixel-visualiser)  
License: [MIT](LICENSE)
