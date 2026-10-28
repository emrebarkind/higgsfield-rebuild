# Capture test

Status: **PENDING** — canaries not yet sent. This file is filled in from the raw log files once they land.

## 1. Tool and model

- Tool: **Claude Code**, run inside the Claude desktop app (Code tab); entrypoint `claude-desktop`, CLI 2.1.308/2.1.311.
- Model: **Claude Opus 5.5** (`claude-opus-5-5`) plans and executes. Research and review subagents run on the same model. Any switch shows up in the per-entry `model:` field.
- Automatic mechanism: yes. Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) run a command on every prompt and at the end of every turn.

## 2. Mechanism and config

- Config changed: [`.claude/settings.json`](.claude/settings.json) (project scope, committed), so every session opened in this repo loads it.
- Script: [`.claude/hooks/agent-capture.mjs`](.claude/hooks/agent-capture.mjs) (Node, no dependencies).
  - `UserPromptSubmit` → appends the prompt verbatim to `.agent-logs/<start>_<session-id>.md` the moment it is sent, so a prompt survives even if the turn dies.
  - `Stop` → re-renders the session log from the raw transcript (`transcript_path` on stdin): every human prompt, and for each turn only the text after its last tool call (the final response). Uses `last_assistant_message` from the hook input when the transcript hasn't flushed yet. Thinking, tool calls and intermediate text are never written.
  - `SessionStart` → remembers the session's model for the first prompt entry.
  - Failures never block the agent: exit 0, no stdout, errors to a git-ignored `.claude/hooks/.state/errors.log`.

## 3. Log file(s)

_To be filled with the paths the canaries land in._

## 4. Canary entries (raw)

_To be pasted verbatim from the log files._

## 5. What did not work first

1. **The planning session itself was not captured by the hooks.** It started in a temporary folder before the repo existed; the hooks were installed into the repo during that session and the session was moved into the repo afterwards. Its prompts after the move still did not trigger the project hooks (no log file appeared), so a running session does not pick up project hooks mid-way. Its transcript is rendered into `.agent-logs/` with the same renderer (`node .claude/hooks/agent-capture.mjs render <transcript>`), unedited, and is marked here as rendered rather than live-captured.
2. **Preflight in a fresh headless session:** `claude -p "CAPTURE PREFLIGHT — …"` from the repo root. `UserPromptSubmit` fired on its own and wrote the prompt (`.agent-logs/2026-10-28_12-17-57_df48d357-….md`), proving the project hook loads in a new session. The model call then failed (`OAuth session expired`), so no response entry exists for it. Left in place, not deleted.
3. The first hook command used `$CLAUDE_PROJECT_DIR` only; it now falls back to the repo-relative path in case that variable is unset or stale.
