#!/usr/bin/env node
// Agent capture for the 8x assignment.
//
// Wired in .claude/settings.json:
//   SessionStart      -> remembers the session's model
//   UserPromptSubmit  -> appends the prompt to the session log the moment it is sent
//   Stop              -> re-renders the session log from the raw transcript, so every
//                        prompt and every end-of-turn response is in it, verbatim
//
// Output: .agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md (8x internal format).
// Only prompts and final responses are written: no thinking, tool calls or intermediate text.
//
// Manual use (same renderer, for a transcript that predates the hooks):
//   node .claude/hooks/agent-capture.mjs render <transcript.jsonl>
//
// A capture hook must never break the agent, so every failure is swallowed (exit 0, no stdout)
// and noted in .claude/hooks/.state/errors.log.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const AUTHOR = 'emrebarkind';
const PROJECT = 'higgsfield-rebuild';
const TOOL = 'claude-code';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOG_DIR = path.join(ROOT, '.agent-logs');
const STATE_DIR = path.join(ROOT, '.claude', 'hooks', '.state');

// ---------- small helpers ----------

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};

const stateFile = (sid) => path.join(STATE_DIR, `${sid}.json`);
const loadState = (sid) => readJson(stateFile(sid), {});
const saveState = (sid, state) => {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFile(sid), JSON.stringify(state, null, 2));
};

const logError = (err) => {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.appendFileSync(path.join(STATE_DIR, 'errors.log'), `${new Date().toISOString()} ${err?.stack || err}\n`);
  } catch {}
};

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// 2026-08-28T09:14:02.118Z -> 2026-08-28_09-14-02
const fileStamp = (iso) => iso.slice(0, 19).replace('T', '_').replace(/:/g, '-');

const findLogFile = (sid) => {
  if (!fs.existsSync(LOG_DIR)) return null;
  const name = fs.readdirSync(LOG_DIR).find((f) => f.endsWith(`_${sid}.md`));
  return name ? path.join(LOG_DIR, name) : null;
};

// ---------- transcript parsing ----------

const readTranscript = (file) => {
  if (!file || !fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
};

const blocks = (entry) => {
  const c = entry?.message?.content;
  if (typeof c === 'string') return [{ type: 'text', text: c }];
  return Array.isArray(c) ? c : [];
};

const originKind = (e) => e.origin?.kind || null;

// A turn starts at a human prompt, or when the app wakes the agent (background task done, peer message).
const isTurnStart = (e) =>
  e.type === 'user' && !e.isSidechain && !e.toolUseResult && !e.isCompactSummary &&
  (originKind(e) === 'human' || ['task-notification', 'peer'].includes(originKind(e)) ||
    (!e.origin && ['human', 'sdk'].includes(e.turnOrigin)));

const isHumanPrompt = (e) => isTurnStart(e) && (originKind(e) === 'human' || (!e.origin && ['human', 'sdk'].includes(e.turnOrigin)));

// A background-task or peer message delivered mid-turn (after a tool result) is not a new turn.
// It only starts one when the agent had already finished, i.e. its last block was text.
const turnEndedBefore = (entries, i) => {
  for (let j = i - 1; j >= 0; j--) {
    const p = entries[j];
    if (p.isSidechain || (p.type !== 'user' && p.type !== 'assistant')) continue;
    if (p.type === 'user' && p.isMeta && !p.toolUseResult) continue;
    if (p.type !== 'assistant') return false;
    const b = blocks(p);
    return b.length > 0 && b[b.length - 1].type === 'text';
  }
  return false;
};

// The prompt as typed: the app prepends <system-reminder> blocks, which are not the user's words.
const promptText = (e) =>
  blocks(e)
    .filter((b) => b.type === 'text' && !b.text.trimStart().startsWith('<system-reminder>'))
    .map((b) => b.text)
    .join('\n\n');

// The final response of a turn: the assistant text after its last tool call.
const finalResponse = (entries) => {
  let chunk = [];
  let at = null;
  let model = null;
  for (const e of entries) {
    if (e.type !== 'assistant' || e.isSidechain) continue;
    if (e.message?.model && e.message.model !== '<synthetic>') model = e.message.model;
    for (const b of blocks(e)) {
      if (b.type === 'tool_use') chunk = [];
      else if (b.type === 'text' && b.text.trim()) {
        chunk.push(b.text);
        at = e.timestamp;
      }
    }
  }
  return { text: chunk.join('\n\n'), at, model };
};

const lastModel = (entries) => {
  for (let i = entries.length - 1; i >= 0; i--) {
    const m = entries[i].type === 'assistant' && entries[i].message?.model;
    if (m && m !== '<synthetic>') return m;
  }
  return null;
};

// ---------- rendering ----------

const entryBlock = (type, num, sid, ts, model, body) =>
  `[LOG_ENTRY type=${type} num=${num} session=${sid.slice(0, 8)}]\ntimestamp: ${ts}\nmodel: ${model}\n\n${body.replace(/\s+$/, '')}\n\n\n`;

const header = ({ sid, model, total, first, last }) =>
  [
    '---',
    `session_id: ${sid}`,
    `date: ${first.slice(0, 10)}`,
    `author: ${AUTHOR}`,
    `model: ${model}`,
    `tool: ${TOOL}`,
    `project: ${PROJECT}`,
    `total_exchanges: ${total}`,
    `first_prompt_time: ${first}`,
    `last_prompt_time: ${last}`,
    '---',
    '',
    `# Session Log - ${first.slice(0, 10)}`,
    '',
    `Session: \`${sid.slice(0, 8)}\` | Project: \`${PROJECT}\` | Author: \`${AUTHOR}\``,
    '',
    '---',
    '',
    '',
  ].join('\n');

// Rebuild the whole session log from the transcript. Deterministic, so earlier entries never change.
const render = (sid, transcriptPath, { lastResponse } = {}) => {
  const entries = readTranscript(transcriptPath);
  const starts = entries
    .map((e, i) => (isTurnStart(e) && (isHumanPrompt(e) || turnEndedBefore(entries, i)) ? i : -1))
    .filter((i) => i >= 0);
  if (!starts.some((i) => isHumanPrompt(entries[i]))) return null;

  const fallbackModel = lastModel(entries) || loadState(sid).model || 'unknown';
  let body = '';
  let num = 0;
  let first = null;
  let last = null;
  let model = fallbackModel;

  starts.forEach((start, k) => {
    const end = k + 1 < starts.length ? starts[k + 1] : entries.length;
    const turn = entries.slice(start + 1, end);
    const e = entries[start];
    const turnModel = lastModel(turn) || model;

    if (isHumanPrompt(e)) {
      num += 1;
      first ??= e.timestamp;
      last = e.timestamp;
      body += entryBlock('PROMPT', num, sid, e.timestamp, turnModel, promptText(e));
    }
    if (num === 0) return;

    let { text, at, model: m } = finalResponse(turn);
    // The newest turn may not be flushed to disk yet; the Stop hook hands us its final text directly.
    if (k === starts.length - 1 && lastResponse?.trim() && lastResponse.trim() !== text.trim()) {
      text = lastResponse;
      at = new Date().toISOString();
    }
    if (text) {
      model = m || turnModel;
      body += entryBlock('RESPONSE', num, sid, at || e.timestamp, model, text);
    }
  });

  if (!num) return null;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const target = path.join(LOG_DIR, `${fileStamp(first)}_${sid}.md`);
  const existing = findLogFile(sid);
  if (existing && existing !== target) fs.renameSync(existing, target);
  fs.writeFileSync(target, header({ sid, model, total: num, first, last }) + body);
  return target;
};

// ---------- hook events ----------

const onSessionStart = (input) => {
  if (!input.model) return;
  const state = loadState(input.session_id);
  saveState(input.session_id, { ...state, model: input.model });
};

// Write the prompt immediately, so it survives even if the turn never finishes.
const onPrompt = (input) => {
  const sid = input.session_id;
  const now = new Date().toISOString();
  const model = lastModel(readTranscript(input.transcript_path)) || loadState(sid).model || 'unknown';
  fs.mkdirSync(LOG_DIR, { recursive: true });

  let file = findLogFile(sid);
  let text = file ? fs.readFileSync(file, 'utf8') : null;
  if (!text) {
    file = path.join(LOG_DIR, `${fileStamp(now)}_${sid}.md`);
    text = header({ sid, model, total: 0, first: now, last: now });
  }
  const num = (text.match(/\[LOG_ENTRY type=PROMPT /g) || []).length + 1;
  text = text
    .replace(/^total_exchanges: .*$/m, `total_exchanges: ${num}`)
    .replace(/^last_prompt_time: .*$/m, `last_prompt_time: ${now}`);
  fs.writeFileSync(file, text + entryBlock('PROMPT', num, sid, now, model, input.prompt ?? ''));
};

const onStop = (input) => {
  const sid = input.session_id;
  // Give the transcript a moment to flush the final message if the hook didn't receive it.
  if (!input.last_assistant_message) sleep(300);
  const file = render(sid, input.transcript_path, { lastResponse: input.last_assistant_message });
  if (file) saveState(sid, { ...loadState(sid), lastRender: new Date().toISOString(), file: path.basename(file) });
};

// ---------- entry ----------

const main = () => {
  const [mode, arg] = process.argv.slice(2);
  if (mode === 'render') {
    const sid = path.basename(arg, '.jsonl');
    const file = render(sid, arg);
    process.stdout.write(file ? `${path.relative(ROOT, file)}\n` : 'no human prompts found\n');
    return;
  }
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
  if (!input.session_id) return;
  if (mode === 'session-start') onSessionStart(input);
  else if (mode === 'prompt') onPrompt(input);
  else if (mode === 'stop') onStop(input);
};

try { main(); } catch (err) { logError(err); }
process.exit(0);
