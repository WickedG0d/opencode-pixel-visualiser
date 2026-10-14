/**
 * Antigravity IDE & OpenCode Parallel Orchestrator (ES Module)
 *
 * Dynamically loads specialized agents from `.agents/skills/`
 * and executes them in PARALLEL, visualizing their real-time execution
 * in the pixel-art office scene.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_PORT = parseInt(process.env.OCV_SERVER_PORT || '5173', 10);
const SKILLS_DIR = path.join(__dirname, '.agents', 'skills');

// The 5 core engineering agent roles from .agents/skills
const AGENT_SPECS = [
  {
    file: 'engineering-frontend-developer.md',
    id: 'agent-frontend',
    skin: 'person1',
    desk: 0,
    tasks: [
      'Auditing canvas pixel-art rendering pipeline',
      'Injecting live floating task speech bubbles',
      'Optimizing responsive scaling for VS Code Simple Browser',
      'Validating Core Web Vitals and 60 FPS animation loop',
    ],
  },
  {
    file: 'engineering-backend-architect.md',
    id: 'agent-backend',
    skin: 'person2',
    desk: 1,
    tasks: [
      'Auditing dual Node.js and Bun runtime support',
      'Benchmarking WebSocket broadcast pool latency',
      'Testing /api/event and /api/parallel throughput',
      'Verifying memory leak prevention and CORS headers',
    ],
  },
  {
    file: 'engineering-api-platform-engineer.md',
    id: 'agent-api',
    skin: 'person3',
    desk: 2,
    tasks: [
      'Validating contract-first OpenAPI and hook specs',
      'Verifying VS Code extension webview IPC bridge',
      'Testing non-blocking Antigravity lifecycle hooks',
      'Enforcing idempotent tool telemetry delivery',
    ],
  },
  {
    file: 'engineering-software-architect.md',
    id: 'agent-architect',
    skin: 'person4',
    desk: 3,
    tasks: [
      'Validating multi-agent state synchronization model',
      'Coordinating concurrent execution without race conditions',
      'Auditing ES Module and CommonJS compatibility',
      'Reviewing architecture documentation and schemas',
    ],
  },
  {
    file: 'engineering-devops-automator.md',
    id: 'agent-devops',
    skin: 'person5',
    desk: 4,
    tasks: [
      'Executing automated TypeScript build (tsc)',
      'Configuring VS Code tasks.json and launch.json',
      'Verifying VS Code extension manifest and package',
      'Validating visualizer server availability and port 5173',
    ],
  },
];

// Parse YAML frontmatter from agent skill markdown files
function parseSkillMetadata(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) return null;

    const rawYaml = frontmatterMatch[1];
    const nameMatch = rawYaml.match(/name:\s*['"]?([^'"\r\n]+)['"]?/);
    const descMatch = rawYaml.match(/description:\s*['"]?([^'"\r\n]+)['"]?/);
    const colorMatch = rawYaml.match(/color:\s*['"]?([^'"\r\n]+)['"]?/);

    return {
      name: nameMatch ? nameMatch[1].trim() : null,
      description: descMatch ? descMatch[1].trim() : null,
      color: colorMatch ? colorMatch[1].trim() : null,
    };
  } catch (err) {
    return null;
  }
}

// Load agents dynamically from .agents/skills/
export function loadAgents() {
  return AGENT_SPECS.map((spec) => {
    const fullPath = path.join(SKILLS_DIR, spec.file);
    const meta = parseSkillMetadata(fullPath);
    return {
      id: spec.id,
      name: (meta && meta.name) || spec.file.replace('.md', ''),
      role: spec.file.replace('.md', ''),
      description: meta && meta.description,
      color: (meta && meta.color) || '#818cf8',
      skin: spec.skin,
      desk: spec.desk,
      tasks: spec.tasks,
    };
  });
}

export const agents = loadAgents();

function post(endpoint, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: SERVER_PORT,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 1000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ ok: true, status: res.statusCode, body }));
      }
    );
    req.on('error', (err) => resolve({ ok: false, error: err }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: new Error('Timeout') });
    });
    req.write(payload);
    req.end();
  });
}

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/status`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function ensureServerRunning() {
  const isRunning = await checkServer();
  if (isRunning) {
    console.log(`[orchestrator] Visualizer server already active on http://localhost:${SERVER_PORT}`);
    return;
  }

  console.log(`[orchestrator] Starting Visualizer server on port ${SERVER_PORT}...`);
  try {
    const serverModule = await import('./dist/visualizer/ocv-server.js');
    serverModule.startServer(SERVER_PORT);
  } catch (err) {
    console.log(`[orchestrator] Spawning server as background process...`);
    const serverProc = spawn('node', ['./dist/visualizer/ocv-server.js'], {
      cwd: __dirname,
      stdio: 'ignore',
      detached: true,
    });
    serverProc.unref();
  }

  // Wait for server to become responsive
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await checkServer()) {
      console.log(`[orchestrator] Visualizer server successfully started!`);
      return;
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Run a single agent through its parallel execution lifecycle
async function runAgent(agent, index) {
  const cwd = path.join(process.cwd(), agent.role);
  console.log(`\n  ▶ [${agent.name}] Spawning at Desk ${agent.desk + 1} (${agent.skin})...`);

  // 1. Register agent in visualizer
  await post('/api/register', {
    instanceId: agent.id,
    cwd,
    skin: agent.skin,
    name: agent.name,
  });

  // Stagger entry slightly for realistic animation
  await sleep(400 + index * 300);

  // 2. Walk to desk and begin parallel work
  console.log(`  ⚡ [${agent.name}] Desk ${agent.desk + 1} occupied. Commencing PARALLEL tasks...`);
  await post('/api/event', {
    instanceId: agent.id,
    event: {
      type: 'session.status',
      status: 'busy',
    },
  });

  // 3. Execute all tasks in parallel, emitting tool telemetry to update speech bubbles
  for (let t = 0; t < agent.tasks.length; t++) {
    const task = agent.tasks[t];
    console.log(`    💼 [${agent.name}] Task ${t + 1}/${agent.tasks.length}: ${task}`);

    // Emit tool execution before: bubble shows task description in real time
    await post('/api/event', {
      instanceId: agent.id,
      event: {
        type: 'tool.execute.before',
        tool: `task_${t + 1}`,
        description: task,
      },
    });

    // Simulate task execution with overlapping parallel duration
    await sleep(2200 + Math.random() * 1600);

    // Emit tool execution after
    await post('/api/event', {
      instanceId: agent.id,
      event: {
        type: 'tool.execute.after',
        tool: `task_${t + 1}`,
      },
    });
  }

  // 4. Tasks completed: agent stands up and goes to coffee table
  console.log(`  ☕ [${agent.name}] Sprint complete! Heading to coffee break...`);
  await post('/api/event', {
    instanceId: agent.id,
    event: {
      type: 'session.idle',
    },
  });
}

export async function orchestrate(options = {}) {
  const agentList = loadAgents();

  console.log('\n=============================================================');
  console.log('   🚀 ANTIGRAVITY & OPENCODE PARALLEL ORCHESTRATOR');
  console.log('   Loaded 5 Specialized Agents from .agents/skills:');
  console.log('=============================================================');
  agentList.forEach((a, i) => {
    console.log(`  Desk ${i + 1}: ${a.name.padEnd(24)} | Skin: ${a.skin.padEnd(8)} | Skill: ${a.role}`);
  });
  console.log('=============================================================\n');

  await ensureServerRunning();

  console.log('[orchestrator] ⚡ Launching SIMULTANEOUS PARALLEL execution across all 5 desks...');
  const startTime = Date.now();

  // Run all agents IN PARALLEL!
  await Promise.all(agentList.map((agent, idx) => runAgent(agent, idx)));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=============================================================');
  console.log(`  ✅ All 5 agents completed parallel execution in ${elapsed}s!`);
  console.log(`  🎉 View the live office at http://localhost:${SERVER_PORT}`);
  console.log(`  💻 VS Code Support: Press Ctrl+Shift+P -> "Simple Browser: Show"`);
  console.log('=============================================================\n');
}

// Continuous mode for persistent live demonstration
export async function runContinuous() {
  await ensureServerRunning();
  console.log('[orchestrator] Running in continuous parallel demonstration mode (Ctrl+C to stop)...');
  while (true) {
    await orchestrate();
    console.log('[orchestrator] Waiting 4s before next parallel sprint...\n');
    await sleep(4000);
  }
}

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--continuous') || process.argv.includes('-c')) {
    runContinuous().catch(console.error);
  } else {
    orchestrate().catch(console.error);
  }
}

export default orchestrate;