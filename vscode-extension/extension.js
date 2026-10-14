const vscode = require('vscode');

function activate(context) {
  const SERVER_URL = 'http://localhost:5173';

  // Status Bar Item
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'opencode-visualizer.open';
  statusBar.text = '$(symbol-event) Pixel Visualizer';
  statusBar.tooltip = 'Open OpenCode & Antigravity Parallel Visualizer';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Command: Open Webview Panel in Editor
  const openCmd = vscode.commands.registerCommand('opencode-visualizer.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'opencodeVisualizer',
      'Pixel Agent Office',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent(SERVER_URL);
  });
  context.subscriptions.push(openCmd);

  // Command: Trigger Parallel Orchestrator
  const orchestrateCmd = vscode.commands.registerCommand('opencode-visualizer.startOrchestrator', async () => {
    vscode.window.showInformationMessage('Starting 5-agent parallel orchestrator...');
    try {
      const fetch = (await import('node-fetch')).default || globalThis.fetch;
      await fetch(`${SERVER_URL}/api/orchestrate`, { method: 'POST' });
    } catch {
      // fallback to terminal
      const terminal = vscode.window.createTerminal('Parallel Orchestrator');
      terminal.show();
      terminal.sendText('node orchestrator.cjs');
    }
  });
  context.subscriptions.push(orchestrateCmd);

  // Sidebar Webview Provider
  const provider = {
    resolveWebviewView(webviewView) {
      webviewView.webview.options = {
        enableScripts: true,
      };
      webviewView.webview.html = getWebviewContent(SERVER_URL);
    },
  };
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('opencodeVisualizerView', provider)
  );
}

function getWebviewContent(url) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0d0d1a; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="${url}"></iframe>
</body>
</html>`;
}

function deactivate() {}

module.exports = { activate, deactivate };

