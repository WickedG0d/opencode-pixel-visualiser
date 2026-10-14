// ocv-server.ts — WebSocket server for OpenCode Visualizer
// Can run standalone (bun ocv-server.ts) or be imported in-process
import { join } from "path";
import { existsSync } from "fs";
import { platform } from "os";
const SERVER_PORT = parseInt(process.env.OCV_SERVER_PORT || "5173", 10);
// Detect if Bun is available (should be true in OpenCode runtime)
const isBunAvailable = typeof Bun !== "undefined";
const pluginClients = new Map();
const frontendClients = new Set();
function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const client of frontendClients) {
        // @ts-ignore - WebSocket type compatibility
        if (client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(msg);
            }
            catch { }
        }
    }
}
function trySpawn(cmd, label) {
    try {
        const proc = Bun.spawn(cmd, { stdio: ["ignore", "ignore", "ignore"] });
        serverLog(`[ocv-server] Browser launched via ${label} (PID=${proc.pid})`);
        return true;
    }
    catch (e) {
        serverLog(`[ocv-server] Failed to launch browser via ${label}: ${e}`);
        return false;
    }
}
let browserLaunched = false;
function openBrowser() {
    if (browserLaunched)
        return;
    browserLaunched = true;
    const url = `http://localhost:${SERVER_PORT}`;
    const os = platform();
    setTimeout(() => {
        if (frontendClients.size > 0) {
            serverLog("[ocv-server] Frontend already connected, skipping browser launch");
            return;
        }
        serverLog(`[ocv-server] Attempting to open browser on ${os}...`);
        if (os === "darwin") {
            const launched = trySpawn(["open", "-n", "-a", "Google Chrome", "--args", `--app=${url}`, "--window-size=1024,768"], "Google Chrome") ||
                trySpawn(["open", "-n", "-a", "Chromium", "--args", `--app=${url}`, "--window-size=1024,768"], "Chromium") ||
                trySpawn(["open", url], "default browser");
            if (!launched)
                serverLog("[ocv-server] Could not open any browser. Open manually: " + url);
        }
        else if (os === "win32") {
            const launched = trySpawn(["cmd.exe", "/c", "start", "chrome", `--app=${url}`, "--window-size=1024,768"], "chrome") ||
                trySpawn(["cmd.exe", "/c", "start", "", url], "default browser");
            if (!launched)
                serverLog("[ocv-server] Could not open any browser. Open manually: " + url);
        }
        else {
            const launched = trySpawn(["google-chrome", `--app=${url}`, "--window-size=1024,768"], "google-chrome") ||
                trySpawn(["chromium-browser", `--app=${url}`, "--window-size=1024,768"], "chromium-browser") ||
                trySpawn(["xdg-open", url], "xdg-open");
            if (!launched)
                serverLog("[ocv-server] Could not open any browser. Open manually: " + url);
        }
    }, 3000);
}
let shutdownTimer = null;
let server = null;
function resetShutdownTimer() {
    if (shutdownTimer)
        clearTimeout(shutdownTimer);
    shutdownTimer = setTimeout(() => {
        if (pluginClients.size === 0 && frontendClients.size === 0) {
            server?.stop();
            // Clear the reference so startServer() can re-bind on a later call
            // (e.g. when a surviving instance takes over as the leader).
            server = null;
            browserLaunched = false;
            // Only exit if running standalone, not in-process
            if (isStandalone)
                process.exit(0);
        }
    }, 300_000);
}
const VISUALIZER_DIR = join(import.meta.dir);
export function startServer() {
    if (server)
        return true;
    try {
        // Use Bun server (assuming OpenCode provides Bun runtime)
        server = Bun.serve({
            port: SERVER_PORT,
            hostname: "127.0.0.1",
            async fetch(req) {
                try {
                    const url = new URL(req.url);
                    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
                    const filePath = join(VISUALIZER_DIR, pathname);
                    if (existsSync(filePath)) {
                        return new Response(Bun.file(filePath), {
                            headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
                        });
                    }
                    return new Response("Not found", { status: 404 });
                }
                catch {
                    return new Response("<h1>Server error</h1>", {
                        headers: { "Content-Type": "text/html" },
                        status: 500,
                    });
                }
            },
            websocket: {
                open(_ws) { },
                message(ws, message) {
                    let data;
                    try {
                        data = JSON.parse(message);
                    }
                    catch {
                        return;
                    }
                    switch (data.type) {
                        case "register": {
                            const id = data.instanceId;
                            pluginClients.set(id, {
                                instanceId: id,
                                ws,
                                cwd: data.cwd || "",
                                skin: data.skin || "",
                                connectedAt: Date.now(),
                            });
                            broadcast({ type: "instance.added", instanceId: id, cwd: data.cwd, skin: data.skin });
                            ws.send(JSON.stringify({ type: "registered" }));
                            openBrowser();
                            resetShutdownTimer();
                            break;
                        }
                        case "frontend.register": {
                            frontendClients.add({ ws });
                            const instances = [...pluginClients.values()].map((c) => ({
                                instanceId: c.instanceId,
                                cwd: c.cwd,
                                skin: c.skin,
                            }));
                            ws.send(JSON.stringify({ type: "state.sync", instances }));
                            break;
                        }
                        case "event": {
                            broadcast({ type: "instance.event", instanceId: data.instanceId, event: data.event });
                            break;
                        }
                    }
                },
                close(ws) {
                    for (const [id, client] of pluginClients) {
                        if (client.ws === ws) {
                            pluginClients.delete(id);
                            broadcast({ type: "instance.removed", instanceId: id });
                            break;
                        }
                    }
                    for (const client of frontendClients) {
                        if (client.ws === ws) {
                            frontendClients.delete(client);
                            break;
                        }
                    }
                    resetShutdownTimer();
                },
            },
        });
        serverLog(`[ocv-server] Listening on http://localhost:${SERVER_PORT}`);
        return true;
    }
    catch (e) {
        serverLog(`[ocv-server] Failed to start server on port ${SERVER_PORT}: ${e}`);
        return false;
    }
}
// Detect if running standalone (bun ocv-server.ts) vs imported
const isStandalone = import.meta.main === true;
function serverLog(msg) {
    if (isStandalone)
        console.log(msg);
}
if (isStandalone) {
    if (!startServer()) {
        console.error(`[ocv-server] Port ${SERVER_PORT} may already be in use`);
        process.exit(1);
    }
}
