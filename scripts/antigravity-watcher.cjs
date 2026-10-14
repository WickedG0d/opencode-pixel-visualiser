/**
 * Antigravity IDE Transcript Watcher for OpenCode Visualizer
 * Watches the Antigravity conversation transcript (transcript.jsonl)
 * and streams real-time tool executions, agent statuses, and subagents
 * directly to the pixel visualizer.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const SERVER_PORT = parseInt(process.env.OCV_SERVER_PORT || '5173', 10);
const APP_DATA_DIR = process.env.ANTIGRAVITY_APP_DATA || 'C:\\Users\\WickedG0d\\.gemini\\antigravity-ide';

function postEvent(pathName, data) {
  return new Promise((resolve) => {
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
        timeout: 500,
      },
      (res) => {
        res.resume();
        resolve(true);
      }
    );
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

function findLatestTranscript(brainDir) {
  if (!fs.existsSync(brainDir)) return null;
  const convDirs = fs.readdirSync(brainDir);
  let latestTime = 0;
  let latestFile = null;

  for (const conv of convDirs) {
    const transcript = path.join(brainDir, conv, '.system_generated', 'logs', 'transcript.jsonl');
    if (fs.existsSync(transcript)) {
      const stats = fs.statSync(transcript);
      if (stats.mtimeMs > latestTime) {
        latestTime = stats.mtimeMs;
        latestFile = transcript;
      }
    }
  }
  return latestFile;
}

async function watchTranscript(transcriptFile) {
  console.log(`[antigravity-watcher] Watching transcript: ${transcriptFile}`);

  const instanceId = 'antigravity-main';
  await postEvent('/api/register', {
    instanceId,
    cwd: process.cwd(),
    skin: 'person1',
    name: 'Antigravity Agent',
  });

  let filePos = 0;
  try {
    const stats = fs.statSync(transcriptFile);
    filePos = stats.size; // start watching from the end
  } catch {}

  setInterval(async () => {
    try {
      if (!fs.existsSync(transcriptFile)) return;
      const stats = fs.statSync(transcriptFile);
      if (stats.size > filePos) {
        const stream = fs.createReadStream(transcriptFile, {
          start: filePos,
          end: stats.size,
          encoding: 'utf-8',
        });
        let newContent = '';
        for await (const chunk of stream) {
          newContent += chunk;
        }
        filePos = stats.size;

        const lines = newContent.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const step = JSON.parse(line);
            if (step.tool_calls && step.tool_calls.length > 0) {
              const tool = step.tool_calls[0].tool || 'tool';
              console.log(`[antigravity-watcher] Tool Call: ${tool}`);
              await postEvent('/api/event', {
                instanceId,
                event: { type: 'tool.execute.before', tool },
              });
            } else if (step.type === 'USER_INPUT') {
              await postEvent('/api/event', {
                instanceId,
                event: { type: 'session.status', status: 'busy' },
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      // ignore read errors during write
    }
  }, 1000);
}

const brainDir = path.join(APP_DATA_DIR, 'brain');
const targetTranscript = findLatestTranscript(brainDir);

if (targetTranscript) {
  watchTranscript(targetTranscript);
} else {
  console.log('[antigravity-watcher] No active transcript found in ' + brainDir);
}
