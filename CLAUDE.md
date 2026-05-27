# CLAUDE.md — doneSimple

## Living Document Directive
Maintain this file across sessions. At session end, propose updates
reflecting completed work, new problems, and revised next steps.
Surface all proposed changes as an itemized list. Do not write to
this file without explicit user approval.

## Exit Protocol
Append to your first response each session and to any response where
you have pending CLAUDE.md changes:

  — type "quit" to review and approve session changes to CLAUDE.md

Trigger on: (1) first response of the session, (2) any response with
accumulated proposed changes. On "quit": surface changes as an itemized
list and wait for explicit approval before writing.

## Model Directive
— Per-task assignments (task diversity detected):
- UI layout, styling, component markup → claude-haiku-4-5
- Feature development, state logic, bug fixes → claude-sonnet-4-5
- Storage architecture, Tauri–React integration, cross-cutting design → claude-opus-4-5
- Default (all other tasks) → claude-sonnet-4-5
Basis: generator-recommended. User retains authority to override any assignment.

## Technology Stack
Status: CONFIRMED
- Language: TypeScript — type safety across Tauri commands and React state
- Framework: Tauri + React — native desktop shell with HTML/CSS/JS UI layer
- Persistence: SQLite via tauri-plugin-sql — embedded DB, survives restarts,
  accumulates history indefinitely; no external server required
- Styling: plain CSS modules — matches user's existing CSS/HTML background
- Packages: Vite (bundler), tauri-plugin-sql (storage)

## Project Purpose
doneSimple is a minimal desktop productivity app for managing recurring
and one-off tasks. It persists all task and history state locally across
sessions. Success means zero friction: open the app, see your tasks, close
it, and find them exactly as you left them next time.

## Project Description
Three-tab GUI desktop app built with Tauri + React + TypeScript.

TAB 1 — to do:
Scrollable task table. Columns: task description (text), recurring (yes/no
pill toggle), done (checkbox). Checkbox behavior: if recurring=yes, mark
complete, reset to pending, schedule for next day; if recurring=no, archive
to history with description + date + recurrence count, then delete row.
Hover each row to reveal an ✕ button (right side); ✕ deletes the task
silently with no history entry.

TAB 2 — work:
Split panel. Left: 5 most recent incomplete tasks, fading scroll on
overflow. Right: countdown timer defaulting to 30 min, adjustable in 5-min
steps, start/pause/reset controls. On timer completion: display break
suggestions — walk outside, stretch (link to guide), drink water, custom
entry.

TAB 3 — history:
Append-only log of all completed non-recurring tasks. Columns: description,
date completed, recurrence count. No deletions from history.

PERSISTENCE:
All task state and history stored in SQLite via tauri-plugin-sql. DB lives
in the app's local data directory. No data is lost between app restarts.
Schema: tasks table (id, description, recurring, created_at, last_done_at,
recurrence_count), history table (id, description, date_done,
recurrence_count).

UI PRINCIPLES:
Flat, minimal, no gradients or decorative effects. Intuitive enough to
require no onboarding. CSS kept simple — user background is basic HTML/CSS.

## Task Board
> Orientation context only. Do not act on any item without explicit
> user instruction.

### Accomplished
- [ ] To be populated

### Problems to Polish
- [ ] To be populated

### Future Steps
- Initialize Tauri + React + TypeScript project scaffold
- Implement SQLite schema and tauri-plugin-sql integration
- Build to do tab: task table, checkbox logic, recurring reset, hover delete
- Build work tab: recent task panel, countdown timer, break suggestions
- Build history tab: append-only completed task log
- Wire persistent storage to all UI state

## Session History
### Session 1 — 2026-05-25
Initial generation. Project defined from scratch: doneSimple desktop app,
Tauri + React + TypeScript stack confirmed, SQLite persistence, three-tab
UI layout finalized from user wireframes.