/**
 * Antigravity IDE & OpenCode Lifecycle Hook Bridge for Pixel Visualizer
 * Non-blocking, fault-tolerant hook forwarder.
 */

const http = require('http');

const SERVER_PORT = parseInt(process.env.OCV_SERVER_PORT || '5173', 10);

function sendToVisualizer(pathName, data) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(data);
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: SERVER_PORT,
          path: pathName,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 150,
        },
        (res) => {
          res.resume();
          resolve(true);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.write(payload);
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function readStdinSafely(timeoutMs = 100) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      return resolve('');
    }
    let data = '';
    const timer = setTimeout(() => {
      resolve(data);
    }, timeoutMs);

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.resume();
  });
}

async function main() {
  const input = await readStdinSafely(100);

  let hookData = {};
  try {
    if (input && input.trim()) {
      hookData = JSON.parse(input);
    }
  } catch {}

  const conversationId = hookData.conversationId || 'antigravity-session';
  const instanceId = `antigravity-${String(conversationId).substring(0, 8)}`;
  const toolCall = hookData.toolCall;
  const toolName = toolCall ? toolCall.name : null;
  const toolArgs = toolCall ? (toolCall.args || {}) : {};
  const cwd = (hookData.workspacePaths && hookData.workspacePaths[0]) || process.cwd();

  // Register main agent with visualizer
  await sendToVisualizer('/api/register', {
    instanceId,
    cwd,
    skin: 'person1',
    name: 'Antigravity IDE',
  });

  // Handle subagent / parallel tasks
  if (toolName === 'invoke_subagent' || toolName === 'browser_subagent' || (toolArgs && toolArgs.Subagents)) {
    const subagents = toolArgs.Subagents || [{ Role: 'Subagent' }];
    for (let i = 0; i < subagents.length; i++) {
      const sa = subagents[i];
      const saId = `subagent-${i + 1}-${Date.now().toString(36)}`;
      const skin = ['person2', 'person3', 'person4', 'person5'][i % 4];
      await sendToVisualizer('/api/register', {
        instanceId: saId,
        cwd,
        skin,
        name: sa.Role || sa.TypeName || 'Parallel Subagent',
      });
      await sendToVisualizer('/api/event', {
        instanceId: saId,
        event: {
          type: 'tool.execute.before',
          tool: sa.TypeName || 'subagent',
          description: sa.Prompt ? String(sa.Prompt).substring(0, 50) : 'Executing task in parallel',
        },
      });
    }
  }

  // Handle main agent tool events
  if (toolName) {
    await sendToVisualizer('/api/event', {
      instanceId,
      event: {
        type: 'tool.execute.before',
        tool: toolName,
        description: toolArgs.toolSummary || toolArgs.toolAction || toolName,
      },
    });
  } else if (hookData.terminationReason || hookData.fullyIdle) {
    await sendToVisualizer('/api/event', {
      instanceId,
      event: { type: 'session.idle' },
    });
  } else {
    await sendToVisualizer('/api/event', {
      instanceId,
      event: { type: 'session.status', status: 'busy' },
    });
  }

  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
