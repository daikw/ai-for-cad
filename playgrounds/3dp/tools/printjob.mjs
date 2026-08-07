#!/usr/bin/env node
// Print-job pipeline helper for playgrounds/3dp/print-jobs (see print-jobs/PIPELINE.md).
//   init                       ensure .codex symlink and .gitignore
//   new <slug> [--title T]     scaffold a job directory
//   snapshot <slug> [label]    capture a chamber-camera frame into evidence/
//   record <slug> <event> [--artifact A] [--notes N] [--ams S]
//                              append a lifecycle event to job.json
//   index                      regenerate print-jobs/README.md from job.json files
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const JOBS = path.join(ROOT, "print-jobs");

const die = (m) => { console.error(`printjob: ${m}`); process.exit(1); };

function loadJob(slug) {
  const p = path.join(JOBS, slug, "job.json");
  if (!fs.existsSync(p)) die(`no job.json for ${slug}`);
  return { path: p, data: JSON.parse(fs.readFileSync(p, "utf8")) };
}
function saveJob(job) {
  fs.writeFileSync(job.path, JSON.stringify(job.data, null, 2) + "\n");
}
const now = () => new Date().toISOString();

function cmdInit() {
  const link = path.join(ROOT, ".codex", "print-jobs");
  fs.mkdirSync(path.join(ROOT, ".codex"), { recursive: true });
  if (!fs.existsSync(link)) {
    fs.symlinkSync("../print-jobs", link);
    console.log(`symlinked ${link} -> ../print-jobs`);
  }
  const gi = path.join(JOBS, ".gitignore");
  if (!fs.existsSync(gi)) {
    fs.writeFileSync(gi, "*.gcode.3mf\n*/source/cache/\n");
    console.log(`wrote ${gi}`);
  }
  console.log("init ok");
}

function cmdNew(slug, opts) {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(slug)) {
    die("slug must look like 2026-08-07-my-model");
  }
  const dir = path.join(JOBS, slug);
  if (fs.existsSync(dir)) die(`${dir} already exists`);
  for (const d of ["source/cache", "output", "evidence"]) {
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }
  const job = {
    schema: "printjob/v1",
    slug,
    title: opts.title ?? slug,
    status: "prepared",
    printer: "bambu-h2d-pro",
    source: { kind: "", url: "", license: "", notes: "", files: [] },
    prints: [],
    evidence: [],
    links: { tickets: [], mrs: [], model: "" },
    learnings: [],
  };
  fs.writeFileSync(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n");
  console.log(`scaffolded ${dir}`);
}

function cmdSnapshot(slug, label) {
  const job = loadJob(slug);
  const labOps =
    process.env.LAB_OPS_REPO ??
    path.join(process.env.HOME, "ghq/gitlab.photosynth.dev/cto/lab-ops");
  const wrapper = path.join(labOps, "scripts", "bambu-h2d-remote");
  if (!fs.existsSync(wrapper)) die(`lab-ops wrapper not found: ${wrapper}`);
  const stamp = now().replace(/[:.]/g, "-").slice(0, 19);
  const name = label ? `${stamp}-${label}.jpg` : `${stamp}.jpg`;
  const dest = path.join(JOBS, slug, "evidence", name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execFileSync(wrapper, ["--snapshot", dest], { stdio: "inherit" });
  job.data.evidence.push({ path: `evidence/${name}`, caption: label ?? "" });
  saveJob(job);
  console.log(`recorded evidence/${name}`);
}

const EVENTS = ["sliced", "submitted", "printing", "completed", "failed", "aborted"];
function cmdRecord(slug, event, opts) {
  if (!EVENTS.includes(event)) die(`event must be one of ${EVENTS.join(", ")}`);
  const job = loadJob(slug);
  let entry = null;
  if (opts.artifact) {
    const rel = opts.artifact.startsWith("output/") ? opts.artifact : `output/${opts.artifact}`;
    entry = job.data.prints.find((p) => p.artifact === rel);
    if (!entry) {
      entry = { artifact: rel };
      job.data.prints.push(entry);
      // enrich from the slice-validation report when present
      const stem = rel.replace(/^output\//, "").replace(/\.gcode\.3mf$/, "");
      const report = path.join(JOBS, slug, "output", `${stem}.slice-validation.json`);
      if (fs.existsSync(report)) {
        const r = JSON.parse(fs.readFileSync(report, "utf8"));
        entry.sha256 = r.artifact?.sha256;
        entry.estimatedTime = r.slice?.estimatedTime;
      }
      const abs = path.join(JOBS, slug, rel);
      if (!entry.sha256 && fs.existsSync(abs)) {
        entry.sha256 = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
      }
    }
  }
  const target = entry ?? job.data;
  if (event === "submitted") {
    if (!entry) die("submitted requires --artifact");
    entry.submittedAt = now();
    if (opts.ams) entry.amsSlots = opts.ams;
    job.data.status = "submitted";
  } else if (["completed", "failed", "aborted"].includes(event)) {
    if (entry) entry.result = event;
    job.data.status = event;
  } else if (event === "printing") {
    job.data.status = "printing";
  }
  if (opts.notes) {
    if (entry) entry.resultNotes = [entry.resultNotes, opts.notes].filter(Boolean).join(" / ");
    else job.data.learnings.push(opts.notes);
  }
  saveJob(job);
  console.log(`recorded ${event} on ${slug}${entry ? ` (${entry.artifact})` : ""}`);
}

function cmdIndex() {
  const rows = [];
  for (const d of fs.readdirSync(JOBS).sort()) {
    const p = path.join(JOBS, d, "job.json");
    if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const prints = j.prints?.length ?? 0;
    const ev = j.evidence?.length ?? 0;
    rows.push(`| [${j.slug}](./${j.slug}/) | ${j.title} | ${j.status} | ${prints} | ${ev} |`);
  }
  const md = `# Print Jobs Index

自動生成: \`node tools/printjob.mjs index\`（手で編集しない）。規約は [PIPELINE.md](./PIPELINE.md)。

| Job | Title | Status | Prints | Evidence |
|---|---|---|---|---|
${rows.join("\n")}
`;
  fs.writeFileSync(path.join(JOBS, "README.md"), md);
  console.log(`indexed ${rows.length} jobs`);
}

// --- arg parsing ---
const [cmd, ...rest] = process.argv.slice(2);
const opts = {};
const pos = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) opts[rest[i].slice(2)] = rest[i + 1] ?? true, i++;
  else pos.push(rest[i]);
}
switch (cmd) {
  case "init": cmdInit(); break;
  case "new": cmdNew(pos[0] ?? die("new <slug>"), opts); break;
  case "snapshot": cmdSnapshot(pos[0] ?? die("snapshot <slug> [label]"), pos[1]); break;
  case "record": cmdRecord(pos[0] ?? die("record <slug> <event>"), pos[1], opts); break;
  case "index": cmdIndex(); break;
  default:
    console.log("usage: printjob.mjs <init|new|snapshot|record|index> ...  (see print-jobs/PIPELINE.md)");
    process.exit(64);
}
