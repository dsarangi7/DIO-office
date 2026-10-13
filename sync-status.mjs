#!/usr/bin/env node
/**
 * sync-status.mjs — Read DIO portfolio board "Who's working (live)" table
 * and write status.json (+ refresh embedded JSON in index.html for file://).
 *
 * Usage: node sync-status.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOARD = path.resolve(__dirname, "../dio-portfolio-board.md");
const STATUS_OUT = path.join(__dirname, "status.json");
const INDEX = path.join(__dirname, "index.html");

const KNOWN = {
  god: { name: "God", role: "Orchestrator", defaultRoom: "god-office" },
  kai: { name: "Kai", role: "Full-stack & platform", defaultRoom: "desk" },
  chan: { name: "Chan", role: "Builder / code", defaultRoom: "desk" },
  nova: { name: "Nova", role: "Product & distribution", defaultRoom: "desk" },
  juan: { name: "Juan", role: "Docs & knowledge", defaultRoom: "desk" },
  dwight: { name: "Dwight", role: "Quality gate", defaultRoom: "desk" },
  shiva: { name: "Shiva", role: "Research lead", defaultRoom: "desk" },
  alberto: { name: "Alberto", role: "SEO & growth", defaultRoom: "desk" },
  villain: { name: "Villain", role: "Adversarial critic", defaultRoom: "desk" },
  hero: { name: "Hero", role: "Debugger / fixer", defaultRoom: "desk" },
  stacy: { name: "Stacy", role: "X/Twitter & Reddit", defaultRoom: "desk" },
  mike: { name: "Mike", role: "LinkedIn content", defaultRoom: "desk" },
};

/** Canvas ORDER — agents drawn as sprites. Others go to feed only. */
const CANVAS_IDS = new Set([
  "god", "shiva", "alberto", "mike", "stacy", "juan", "kai", "chan", "nova", "villain", "hero", "dwight",
]);

function shanghaiISO(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}+08:00`;
}

function slug(name) {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function mapStatus(rawStatus, blocker, task) {
  const s = String(rawStatus || "").trim().toLowerCase();
  const b = String(blocker || "").trim();
  const hasBlocker = b && b !== "—" && b !== "-" && b.toLowerCase() !== "unless assigned";

  if (/in\s*flight|active|working/.test(s)) return { status: "working", task };
  if (/review/.test(s)) return { status: "reviewing", task };
  if (/blocked/.test(s)) return { status: "blocked", task: task || b };
  if (/waiting/.test(s)) {
    if (hasBlocker) return { status: "blocked", task: task ? `${task} · ${b}` : `Waiting: ${b}` };
    return { status: "idle", task: task ? `Waiting · ${task}` : "Waiting" };
  }
  if (/done/.test(s)) return { status: "idle", task: task ? `Done: ${task}` : "Done" };
  if (/idle|^$/.test(s)) return { status: "idle", task: task || "Idle" };
  return { status: "idle", task: task || rawStatus || "Idle" };
}

function inferRoom(id, task, status) {
  if (id === "god") return "god-office";
  const t = String(task || "").toLowerCase();
  if (/fix\s*loop|fixloop|critique|gate|villain|hero/.test(t)) return "fixloop";
  if (/content|linkedin|twitter|reddit|x thread|social/.test(t)) return "content";
  if (/core|research|module|lesson|orchestrat/.test(t) && (id === "shiva" || id === "alberto" || id === "dwight")) return "core";
  if (status === "idle") return id === "god" ? "god-office" : "desk";
  // builders often desk or core
  if (id === "chan" || id === "kai" || id === "nova") return "desk";
  return KNOWN[id]?.defaultRoom || "desk";
}

function short(s, n = 48) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function parseWhosWorking(md) {
  const lines = md.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+Who.?s working/i.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;

  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line) || /^---/.test(line)) break;
    if (!/^\|/.test(line)) continue;
    if (/^\|\s*Agent\s*\|/i.test(line)) continue;
    if (/^\|[\s-|]+\|$/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    if (cells.length < 3) continue;
    const [agent, task, status, blocker] = cells;
    if (/^others$/i.test(agent)) continue;
    rows.push({
      agent: agent.trim(),
      task: (task || "").trim(),
      status: (status || "").trim(),
      blocker: (blocker || "").trim(),
    });
  }
  return rows;
}

function loadPrevious() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_OUT, "utf8"));
  } catch {
    return null;
  }
}

function defaults() {
  const updatedAt = shanghaiISO();
  const agents = Object.entries(KNOWN)
    .filter(([id]) => CANVAS_IDS.has(id))
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      role: meta.role,
      status: "idle",
      task: "Idle",
      room: meta.defaultRoom,
    }));
  return {
    updatedAt,
    agents,
    handoffs: [],
    feed: [{ at: updatedAt, agent: "god", text: "Board table missing — showing defaults" }],
  };
}

function buildStatus(rows, prev) {
  const updatedAt = shanghaiISO();
  const byId = new Map();
  // seed canvas agents idle
  for (const id of CANVAS_IDS) {
    const meta = KNOWN[id];
    byId.set(id, {
      id,
      name: meta.name,
      role: meta.role,
      status: "idle",
      task: "Idle · café",
      room: meta.defaultRoom,
    });
  }

  const feed = [];

  for (const row of rows) {
    const id = slug(row.agent);
    if (!id || id === "others") continue;
    const mapped = mapStatus(row.status, row.blocker, row.task);
    const task = short(mapped.task, 50);
    const room = inferRoom(id, row.task, mapped.status);

    if (CANVAS_IDS.has(id)) {
      const meta = KNOWN[id];
      byId.set(id, {
        id,
        name: meta.name,
        role: meta.role,
        status: mapped.status,
        task,
        room,
      });
      feed.push({
        at: updatedAt,
        agent: id,
        text: `${row.agent} · ${row.status}${row.blocker && row.blocker !== "—" ? " · " + short(row.blocker, 36) : ""}`,
      });
    } else {
      const label = KNOWN[id] ? KNOWN[id].name : row.agent;
      feed.push({
        at: updatedAt,
        agent: null,
        text: `${label}: ${task} (${mapped.status})`,
      });
    }
  }

  // keep previous handoffs if any
  const handoffs = Array.isArray(prev?.handoffs) ? prev.handoffs.slice(-12) : [];

  return {
    updatedAt,
    agents: [...byId.values()],
    handoffs,
    feed: feed.slice(0, 24),
  };
}

function embedInIndex(status) {
  if (!fs.existsSync(INDEX)) return;
  let html = fs.readFileSync(INDEX, "utf8");
  const json = JSON.stringify(status, null, 2);
  const re = /(<script type="application\/json" id="dio-status">)([\s\S]*?)(<\/script>)/;
  if (!re.test(html)) {
    console.warn("warn: dio-status block not found in index.html — skipped embed");
    return;
  }
  html = html.replace(re, `$1\n${json}\n$3`);
  fs.writeFileSync(INDEX, html);
}

function main() {
  let rows = null;
  if (fs.existsSync(BOARD)) {
    const md = fs.readFileSync(BOARD, "utf8");
    rows = parseWhosWorking(md);
  } else {
    console.warn("warn: board missing:", BOARD);
  }

  const prev = loadPrevious();
  let status;
  if (!rows || rows.length === 0) {
    console.warn("warn: Who's working table empty/missing — keeping previous or defaults");
    status = prev && Array.isArray(prev.agents) && prev.agents.length ? { ...prev, updatedAt: shanghaiISO() } : defaults();
  } else {
    status = buildStatus(rows, prev);
  }

  fs.writeFileSync(STATUS_OUT, JSON.stringify(status, null, 2) + "\n");
  embedInIndex(status);
  const working = status.agents.filter((a) => a.status !== "idle").map((a) => a.name);
  console.log("wrote", STATUS_OUT);
  console.log("updatedAt", status.updatedAt);
  console.log("non-idle:", working.length ? working.join(", ") : "(none)");
  console.log("feed lines:", status.feed.length);
}

main();
