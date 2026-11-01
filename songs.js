// Song library: the user's FreeShow shows (read-only) plus VerseCast's own pasted songs.
const fs = require("fs"), path = require("path");
const HOME = process.env.USERPROFILE || "";
const OWN = path.join(process.env.LOCALAPPDATA || ".", "VerseCast", "songs.json");

// FreeShow's own setting first, then the usual places (Documents is often under OneDrive);
// skip empty folders, since FreeShow's setting can point at an empty Documents copy while the songs are in OneDrive
function freeshowDir(custom) {
  let configured;
  try { configured = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA || "", "freeshow", "settings.json"), "utf8")).showsPath; } catch {}
  const hasShows = d => { try { return fs.readdirSync(d).some(f => f.endsWith(".show")); } catch { return false; } };
  return [custom, configured, path.join(HOME, "OneDrive", "Documents", "FreeShow", "Shows"), path.join(HOME, "Documents", "FreeShow", "Shows")]
    .find(d => d && hasShows(d));
}

const readOwn = () => { try { return JSON.parse(fs.readFileSync(OWN, "utf8")); } catch { return []; } };
function writeOwn(songs) {
  fs.mkdirSync(path.dirname(OWN), { recursive: true });
  fs.writeFileSync(OWN, JSON.stringify(songs));
}

// A FreeShow .show file is [id, show]; slides play in the active layout's order, each parent followed by its children.
function parseShow(json) {
  const [, show] = JSON.parse(json);
  const layout = show.layouts?.[show.settings?.activeLayout] || Object.values(show.layouts || {})[0] || { slides: [] };
  const slides = [];
  const add = (id, group) => {
    const text = (show.slides?.[id]?.items || [])
      .filter(i => !i.type || i.type === "text").flatMap(i => i.lines || [])
      .map(l => (l.text || []).map(t => t.value || "").join("")).join("\n")
      .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (text) slides.push({ group: group || "", text });
  };
  for (const ls of layout.slides || []) {
    const parent = show.slides?.[ls.id];
    if (ls.disabled || !parent) continue;
    add(ls.id, parent.group);
    for (const c of parent.children || []) if (!ls.children?.[c]?.disabled) add(c, parent.group);
  }
  return { name: show.name || "", number: String(show.meta?.number || show.quickAccess?.number || ""), category: show.category, slides };
}

// The FreeShow folder is re-read only when files are added, removed or renamed in it.
let cache = { dir: null, mtime: 0, list: [] };
function list(customDir) {
  const dir = freeshowDir(customDir);
  if (dir) {
    const mtime = fs.statSync(dir).mtimeMs;
    if (cache.dir !== dir || cache.mtime !== mtime) {
      cache = { dir, mtime, list: [] };
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".show")) continue;
        try {
          const s = parseShow(fs.readFileSync(path.join(dir, f), "utf8"));
          if (s.category !== "scripture" && s.slides.length) cache.list.push({ id: "fs:" + f, name: s.name || f.slice(0, -5), number: s.number, source: "FreeShow" });
        } catch {} // skip files FreeShow itself couldn't have written
      }
    }
  }
  const own = readOwn().map(s => ({ id: "vc:" + s.id, name: s.name, number: "", source: "VerseCast" }));
  return [...own, ...(dir ? cache.list : [])].sort((a, b) => a.name.localeCompare(b.name));
}

function get(id, customDir) {
  if (id.startsWith("vc:")) {
    const s = readOwn().find(s => "vc:" + s.id === id);
    return s ? { id, name: s.name, source: "VerseCast", slides: s.slides } : null;
  }
  const dir = id.startsWith("fs:") && freeshowDir(customDir);
  if (!dir) return null;
  const file = path.join(dir, path.basename(id.slice(3))); // basename: never leave the Shows folder
  if (!file.endsWith(".show")) return null;
  try {
    const s = parseShow(fs.readFileSync(file, "utf8"));
    return { id, name: s.name, source: "FreeShow", slides: s.slides };
  } catch { return null; }
}

// Pasted lyrics: a blank line starts a new slide.
function add(name, lyrics) {
  name = String(name || "").trim().slice(0, 200);
  const slides = String(lyrics || "").replace(/\r/g, "").split(/\n\s*\n/)
    .map(t => t.trim()).filter(Boolean).slice(0, 300).map(text => ({ group: "", text: text.slice(0, 2000) }));
  if (!name || !slides.length) return null;
  const songs = readOwn(), id = Date.now().toString(36);
  songs.push({ id, name, slides });
  writeOwn(songs);
  return "vc:" + id;
}

function remove(id) {
  const songs = readOwn(), kept = songs.filter(s => "vc:" + s.id !== id);
  if (kept.length === songs.length) return false;
  writeOwn(kept);
  return true;
}

module.exports = { list, get, add, remove, parseShow };
