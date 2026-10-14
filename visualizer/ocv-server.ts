// ocv-server.ts — Universal WebSocket & HTTP server for OpenCode & Antigravity IDE Visualizer
// Supports both Node.js and Bun runtimes seamlessly.
import http from "http"
import { existsSync, createReadStream, statSync } from "fs"
import { join, dirname, extname, normalize } from "path"
import { platform } from "os"
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { WebSocketServer, WebSocket } from "ws"

export const DEFAULT_PORT = 5173
let activePort = parseInt(process.env.OCV_SERVER_PORT || String(DEFAULT_PORT), 10)

export interface PluginClient {
  instanceId: string
  ws?: WebSocket
  cwd: string
  skin: string
  name?: string
  connectedAt: number
}

export interface FrontendClient {
  ws: WebSocket
}

const pluginClients = new Map<string, PluginClient>()
const frontendClients = new Set<FrontendClient>()

let httpServer: http.Server | null = null
let wss: WebSocketServer | null = null
let shutdownTimer: ReturnType<typeof setTimeout> | null = null
let browserLaunched = false

// Broadcast a message to all connected frontend UI clients
export function broadcast(data: Record<string, unknown>) {
  const msg = JSON.stringify(data)
  for (const client of frontendClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(msg)
      } catch {}
    }
  }
}

// Find the visualizer root directory containing index.html, textures/, and person*/
function resolveVisualizerDir(): string {
  let cur = process.cwd()
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      cur = dirname(fileURLToPath(import.meta.url))
    }
  } catch {}

  const candidates = [
    cur,
    join(cur, "visualizer"),
    join(cur, "..", "visualizer"),
    join(cur, "..", "..", "visualizer"),
    join(process.cwd(), "visualizer"),
    process.cwd(),
  ]

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "index.html"))) {
      return candidate
    }
  }
  return cur
}

const VISUALIZER_DIR = resolveVisualizerDir()

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!req.url) return false
  const parsedUrl = new URL(req.url, `http://localhost:${activePort}`)
  let pathname = decodeURIComponent(parsedUrl.pathname)
  if (pathname === "/" || pathname === "") pathname = "/index.html"

  // Prevent path traversal
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "")
  const filePath = join(VISUALIZER_DIR, safePath)

  if (!existsSync(filePath)) {
    return false
  }

  try {
    const stats = statSync(filePath)
    if (stats.isDirectory()) {
      const indexFile = join(filePath, "index.html")
      if (existsSync(indexFile)) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        })
        createReadStream(indexFile).pipe(res)
        return true
      }
      return false
    }

    const ext = extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || "application/octet-stream"

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    })
    createReadStream(filePath).pipe(res)
    return true
  } catch {
    return false
  }
}

function trySpawnBrowser(cmd: string, args: string[], label: string): boolean {
  try {
    const child = spawn(cmd, args, {
      stdio: "ignore",
      detached: true,
      windowsHide: false,
      shell: false,
    })
    child.unref()
    serverLog(`[ocv-server] Browser launched via ${label} (PID=${child.pid})`)
    return true
  } catch (e) {
    serverLog(`[ocv-server] Failed to launch browser via ${label}: ${e}`)
    return false
  }
}

export function openBrowser() {
  if (browserLaunched || process.env.OCV_NO_BROWSER === "true" || process.env.OCV_NO_BROWSER === "1") return
  browserLaunched = true
  const url = `http://localhost:${activePort}`
  const os = platform()

  setTimeout(() => {
    if (frontendClients.size > 0) {
      serverLog("[ocv-server] Frontend already connected, skipping browser launch")
      return
    }
    serverLog(`[ocv-server] Opening visualizer in browser on ${os}... (${url})`)

    if (os === "darwin") {
      trySpawnBrowser("open", ["-n", "-a", "Google Chrome", "--args", `--app=${url}`, "--window-size=1024,768"], "Google Chrome") ||
      trySpawnBrowser("open", [url], "default browser")
    } else if (os === "win32") {
      trySpawnBrowser("cmd.exe", ["/c", "start", "", url], "default browser")
    } else {
      trySpawnBrowser("google-chrome", [`--app=${url}`, "--window-size=1024,768"], "google-chrome") ||
      trySpawnBrowser("xdg-open", [url], "xdg-open")
    }
  }, 1500)
}

function resetShutdownTimer() {
  if (shutdownTimer) clearTimeout(shutdownTimer)
  shutdownTimer = setTimeout(() => {
    if (pluginClients.size === 0 && frontendClients.size === 0) {
      serverLog("[ocv-server] Idle timeout reached with no clients, shutting down server")
      stopServer()
      if (isStandalone) process.exit(0)
    }
  }, 300_000)
}

function parseJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
    })
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"))
      } catch {
        resolve({})
      }
    })
    req.on("error", () => resolve({}))
  })
}

export function startServer(port?: number): boolean {
  if (httpServer && httpServer.listening) return true

  if (port) activePort = port
  else activePort = parseInt(process.env.OCV_SERVER_PORT || String(DEFAULT_PORT), 10)

  try {
    httpServer = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")
      res.setHeader("Content-Security-Policy", "frame-ancestors *")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      const url = new URL(req.url || "/", `http://localhost:${activePort}`)

      // HTTP API for external hooks (Antigravity IDE, VS Code, shell scripts, curl)
      if (url.pathname === "/api/status") {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(
          JSON.stringify({
            status: "ok",
            port: activePort,
            activeAgents: pluginClients.size,
            activeFrontends: frontendClients.size,
            agents: Array.from(pluginClients.values()).map((c) => ({
              instanceId: c.instanceId,
              cwd: c.cwd,
              skin: c.skin,
              name: c.name,
            })),
          })
        )
        return
      }

      if (url.pathname === "/api/parallel") {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(
          JSON.stringify({
            activeParallelAgents: pluginClients.size,
            agents: Array.from(pluginClients.values()).map((c) => ({
              instanceId: c.instanceId,
              name: c.name,
              skin: c.skin,
            })),
          })
        )
        return
      }

      if (url.pathname === "/api/orchestrate" && req.method === "POST") {
        try {
          const orchestratorPath = join(process.cwd(), "orchestrator.cjs")
          const child = spawn(process.execPath, [orchestratorPath], {
            cwd: process.cwd(),
            detached: true,
            stdio: "ignore",
          })
          child.unref()
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ status: "spawned", pid: child.pid }))
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ status: "error", error: String(err) }))
        }
        return
      }

      if (url.pathname === "/api/register" && req.method === "POST") {
        const data = await parseJsonBody(req)
        const id = (data.instanceId as string) || `agent-${Date.now()}`
        pluginClients.set(id, {
          instanceId: id,
          cwd: (data.cwd as string) || "",
          skin: (data.skin as string) || "",
          name: (data.name as string) || "",
          connectedAt: Date.now(),
        })
        broadcast({
          type: "instance.added",
          instanceId: id,
          cwd: data.cwd,
          skin: data.skin,
          name: data.name,
        })
        openBrowser()
        resetShutdownTimer()
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ status: "registered", instanceId: id }))
        return
      }

      if (url.pathname === "/api/event" && req.method === "POST") {
        const data = await parseJsonBody(req)
        const id = data.instanceId as string
        if (id && data.event) {
          broadcast({
            type: "instance.event",
            instanceId: id,
            event: data.event,
          })
        }
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ status: "ok" }))
        return
      }

      if (url.pathname === "/api/unregister" && req.method === "POST") {
        const data = await parseJsonBody(req)
        const id = data.instanceId as string
        if (id && pluginClients.has(id)) {
          pluginClients.delete(id)
          broadcast({ type: "instance.removed", instanceId: id })
        }
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ status: "unregistered" }))
        return
      }

      // Serve static visualizer assets
      const handled = serveStatic(req, res)
      if (!handled) {
        res.writeHead(404, { "Content-Type": "text/plain" })
        res.end("404 Not Found")
      }
    })

    wss = new WebSocketServer({ server: httpServer })

    wss.on("connection", (ws) => {
      resetShutdownTimer()

      ws.on("message", (raw) => {
        let data: Record<string, unknown>
        try {
          data = JSON.parse(raw.toString())
        } catch {
          return
        }

        switch (data.type) {
          case "register": {
            const id = data.instanceId as string
            pluginClients.set(id, {
              instanceId: id,
              ws,
              cwd: (data.cwd as string) || "",
              skin: (data.skin as string) || "",
              name: (data.name as string) || "",
              connectedAt: Date.now(),
            })
            broadcast({
              type: "instance.added",
              instanceId: id,
              cwd: data.cwd,
              skin: data.skin,
              name: data.name,
            })
            try {
              ws.send(JSON.stringify({ type: "registered" }))
            } catch {}
            openBrowser()
            resetShutdownTimer()
            break
          }
          case "frontend.register": {
            frontendClients.add({ ws })
            const instances = [...pluginClients.values()].map((c) => ({
              instanceId: c.instanceId,
              cwd: c.cwd,
              skin: c.skin,
              name: c.name,
            }))
            try {
              ws.send(JSON.stringify({ type: "state.sync", instances }))
            } catch {}
            break
          }
          case "event": {
            broadcast({
              type: "instance.event",
              instanceId: data.instanceId,
              event: data.event,
            })
            break
          }
        }
      })

      ws.on("close", () => {
        for (const [id, client] of pluginClients) {
          if (client.ws === ws) {
            pluginClients.delete(id)
            broadcast({ type: "instance.removed", instanceId: id })
            break
          }
        }
        for (const client of frontendClients) {
          if (client.ws === ws) {
            frontendClients.delete(client)
            break
          }
        }
        resetShutdownTimer()
      })
    })

    httpServer.on("error", (err: NodeJS.ErrnoException) => {
      serverLog(`[ocv-server] Server error on port ${activePort}: ${err.message}`)
    })

    httpServer.listen(activePort, "127.0.0.1", () => {
      serverLog(`[ocv-server] Listening on http://localhost:${activePort} (visualizer root: ${VISUALIZER_DIR})`)
    })

    return true
  } catch (e) {
    serverLog(`[ocv-server] Failed to start server on port ${activePort}: ${e}`)
    return false
  }
}

export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (shutdownTimer) {
      clearTimeout(shutdownTimer)
      shutdownTimer = null
    }
    browserLaunched = false
    pluginClients.clear()
    frontendClients.clear()

    if (wss) {
      try {
        wss.close()
      } catch {}
      wss = null
    }

    if (httpServer) {
      httpServer.close(() => {
        httpServer = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}

// Standalone entry point
const isStandalone = typeof process !== "undefined" && process.argv[1] && (
  process.argv[1].endsWith("ocv-server.ts") ||
  process.argv[1].endsWith("ocv-server.js")
)

function serverLog(msg: string) {
  console.log(msg)
}

if (isStandalone) {
  if (!startServer()) {
    console.error(`[ocv-server] Port ${activePort} may already be in use`)
    process.exit(1)
  }
}