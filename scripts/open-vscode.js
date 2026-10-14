/**
 * Launch OpenCode Pixel Visualizer inside VS Code (Simple Browser / Editor)
 */

import { spawn } from 'child_process';
import http from 'http';

const SERVER_PORT = parseInt(process.env.OCV_SERVER_PORT || '5173', 10);
const URL = `http://localhost:${SERVER_PORT}`;

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`${URL}/api/status`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log(`[vscode-launcher] Checking if visualizer server is running on port ${SERVER_PORT}...`);
  const running = await checkServer();

  if (!running) {
    console.log(`[vscode-launcher] Starting server in background...`);
    const serverProc = spawn('node', ['./dist/visualizer/ocv-server.js'], {
      detached: true,
      stdio: 'ignore',
    });
    serverProc.unref();

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (await checkServer()) break;
    }
  }

  console.log(`[vscode-launcher] Opening visualizer in VS Code Simple Browser (${URL})...`);
  try {
    const codeProc = spawn('code', ['--open-url', URL], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    codeProc.unref();
    console.log(`[vscode-launcher] ✅ Visualizer opened in VS Code!`);
  } catch (err) {
    console.log(`[vscode-launcher] Could not launch 'code' CLI: ${err.message}`);
    console.log(`[vscode-launcher] In VS Code, press Ctrl+Shift+P -> "Simple Browser: Show" -> enter ${URL}`);
  }
}

main().catch(console.error);

