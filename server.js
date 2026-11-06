// Serves VerseCast on http://localhost:8765 — Chrome/Edge only allow speech recognition on http(s), not file://.
// Also relays what's on screen: the operator POSTs /state, every projector page (popup, OBS Browser Source) listens on /events.
const http = require("http"), fs = require("fs"), path = require("path"), { execFile, spawn } = require("child_process");
const Songs = require("./songs.js");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
// Chrome, or Edge when Chrome isn't installed
const BROWSER = [
  path.join(process.env.ProgramFiles || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
].find(p => fs.existsSync(p));

let state = "null";
const listeners = new Set();

// remembered across restarts, e.g. whether the 2nd-screen projector should be open
const SETTINGS = path.join(process.env.LOCALAPPDATA, "VerseCast", "settings.json");
const settings = { projector: true };
try { Object.assign(settings, JSON.parse(fs.readFileSync(SETTINGS, "utf8"))); } catch {}
function saveSettings() {
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  fs.writeFileSync(SETTINGS, JSON.stringify(settings));
}
const projectors = new Set(); // /events connections from the 2nd-screen projector window
const operators = new Set();  // /events connections from the main VerseCast page in Chrome (the one that can listen)

const ps = (cmd, cb) => execFile("powershell", ["-NoProfile", "-Command", cmd], (err, out) => cb(err ? null : out.trim() || null));

// Top-left "x,y" of the first non-primary screen, or null when only one screen is connected.
const secondScreen = cb => ps("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | ? { -not $_.Primary } | select -First 1 | % { '{0},{1}' -f $_.Bounds.X, $_.Bounds.Y }", cb);

// The browser's leftover background process for the projector profile (it can outlive its closed window).
const KILL_OLD = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | ? { $_.CommandLine -match 'VerseCast\\\\projector' } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;

// A full-screen window on a 2nd monitor drops behind that monitor's taskbar when you click the main screen, so pin it on top.
const TOPMOST = `Add-Type -Namespace VC -Name W -MemberDefinition '
[DllImport("user32.dll")] public static extern IntPtr FindWindow(string c, string t);
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);';
$h = [VC.W]::FindWindow([NullString]::Value, 'VerseCast Projector'); if ($h -ne [IntPtr]::Zero) { [VC.W]::SetWindowPos($h, [IntPtr](-1), 0, 0, 0, 0, 0x13) | Out-Null; 'ok' }`;
// re-applied a few times: the browser switching into full screen after the page loads clears it
const keepOnTop = () => [500, 2000, 5000].forEach(ms => setTimeout(() => ps(TOPMOST, () => {}), ms));

// A browser page can't put itself full screen on another monitor, so launch the browser there as an F11-full-screen
// app window. (Kiosk mode leaves it 1px short.) Its own profile folder makes it a separate browser process,
// so the position/full-screen flags apply even while the browser is already open.
let launchedAt = 0;
function openProjector(cb) {
  if (projectors.size || Date.now() - launchedAt < 10000) return cb(true); // showing, or still starting up
  secondScreen(pos => {
    if (!pos) return cb(false);
    const [x, y] = pos.split(",").map(Number);
    launchedAt = Date.now();
    ps(KILL_OLD, () => {
      spawn(BROWSER, ["--app=http://localhost:8765/output.html?screen2", "--start-fullscreen", "--no-first-run",
        "--no-default-browser-check", "--user-data-dir=" + path.join(process.env.LOCALAPPDATA, "VerseCast", "projector"),
        `--window-position=${x + 100},${y + 100}`], { stdio: "ignore" }).on("error", () => { launchedAt = 0; });
      cb(true);
    });
  });
}

// Open the main VerseCast window (the one that listens) unless it's already open, so starting VerseCast twice
// (OBS start-up + the .bat) never gives two windows. An app window in your normal Chrome profile keeps the mic permission.
let operatorOpenedAt = 0;
function openOperator() {
  if (operators.size || Date.now() - operatorOpenedAt < 15000 || !BROWSER) return;
  operatorOpenedAt = Date.now();
  spawn(BROWSER, ["--app=http://localhost:8765/"], { stdio: "ignore", detached: true }).on("error", () => { operatorOpenedAt = 0; }).unref();
}

const sendJson = (res, data) => res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
function readBody(req, res, done) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => { try { done(JSON.parse(body)); } catch { res.writeHead(400).end(); } });
}

http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  const id = new URL(req.url, "http://localhost").searchParams.get("id") || "";

  if (url === "/settings") return sendJson(res, settings);
  if (url === "/open" && req.method === "POST") return openOperator(), res.writeHead(204).end();
  // OBS is closing: close the VerseCast window and projector, then stop the server
  if (url === "/quit" && req.method === "POST") {
    for (const o of operators) o.write(`event: command\ndata: {"cmd":"close"}\n\n`);
    res.writeHead(204).end();
    return ps(KILL_OLD, () => setTimeout(() => process.exit(0), 500));
  }

  // songs: FreeShow library (read-only) + songs pasted into VerseCast
  if (url === "/songs" && req.method === "GET") return sendJson(res, Songs.list(settings.freeshowShows));
  if (url === "/song" && req.method === "GET") {
    const song = Songs.get(id, settings.freeshowShows);
    return song ? sendJson(res, song) : res.writeHead(404).end();
  }
  if (url === "/songs" && req.method === "POST") {
    return readBody(req, res, b => { const newId = Songs.add(b && b.name, b && b.lyrics); newId ? sendJson(res, { id: newId }) : res.writeHead(400).end(); });
  }
  if (url === "/song" && req.method === "DELETE") return res.writeHead(Songs.remove(id) ? 204 : 404).end();

  // turn the 2nd-screen projector on (404 = no 2nd screen) / off
  if (url === "/projector" && req.method === "POST") {
    settings.projector = true, saveSettings();
    return openProjector(ok => res.writeHead(ok ? 204 : 404).end());
  }
  if (url === "/projector/off" && req.method === "POST") {
    settings.projector = false, saveSettings(), launchedAt = 0;
    return ps(KILL_OLD, () => res.writeHead(204).end());
  }

  if (url === "/state" && req.method === "POST") {
    return readBody(req, res, msg => {
      state = JSON.stringify(msg);
      for (const l of listeners) l.write(`data: ${state}\n\n`);
      res.writeHead(204).end();
    });
  }

  if (url === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.write(`data: ${state}\n\n`);
    listeners.add(res);
    if (req.url.includes("screen2")) projectors.add(res), keepOnTop();
    if (req.url.includes("operator")) operators.add(res);
    req.on("close", () => { listeners.delete(res); projectors.delete(res); operators.delete(res); });
    return;
  }

  // remote control from the OBS dock, e.g. {cmd: "listen"}; 404 = the VerseCast window isn't open to carry it out
  if (url === "/command" && req.method === "POST") {
    return readBody(req, res, msg => {
      if (!operators.size) return res.writeHead(404).end();
      for (const o of operators) o.write(`event: command\ndata: ${JSON.stringify(msg)}\n\n`);
      res.writeHead(204).end();
    });
  }

  const file = path.join(__dirname, path.normalize(decodeURIComponent(url)).replace(/^[\\/]+$/, "index.html"));
  if (!file.startsWith(__dirname) || !TYPES[path.extname(file)]) return res.writeHead(404).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] }).end(data);
  });
})
  .on("error", e => {
    if (e.code !== "EADDRINUSE") throw e;
    // already running from an earlier launch: just make sure its window is open
    http.request({ host: "127.0.0.1", port: 8765, path: "/open", method: "POST" }, () => process.exit(0))
      .on("error", () => process.exit(0)).end();
  })
  .listen(8765, "127.0.0.1", () => {
    console.log("VerseCast running at http://localhost:8765 - keep this window open");
    if (settings.projector) openProjector(() => {}); // the projector closes with the server, so bring it back on start
    setTimeout(openOperator, 3000); // give an already-open VerseCast window a moment to reconnect first
  });
