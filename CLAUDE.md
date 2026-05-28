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

## Learner Context
User background: HTML/CSS fluent; JavaScript, TypeScript, React, and Tauri are
new territory. Full learning observations, concept log, and session growth:
see [GROWTH.md](GROWTH.md) — update it when new concepts are introduced
or understanding is demonstrated through dialogue.

When writing or explaining code in this project:
- Briefly explain *why* a pattern is used, especially for React-specific concepts
  (state, effects, props, event handlers) — one sentence is enough
- Relate new concepts to HTML/CSS equivalents where natural
- Flag first-time concepts inline: "New concept: X — plain-English explanation"
- Prioritize readable code the user can follow over terse cleverness
- Don't over-explain familiar territory (HTML structure, basic CSS rules)

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
- [x] Three-tab UI scaffold replacing Tauri boilerplate
- [x] Inline editable task descriptions, + row to add tasks
- [x] Recurring pill toggle, done checkbox with archive logic, hover-reveal ✕ delete
- [x] Recurring tasks: strikethrough on done, num_repeated toggle, end-of-day auto-reset framework
- [x] Work tab: typeable countdown timer with +/−5m, start/pause/reset, audio alarm at 0
- [x] Work tab: recent tasks list (up to 5) with quick ✓ done, session-dismiss for recurring
- [x] History tab: append-only log with clear button
- [x] Sticky table headers, scrollable rows, fixed column widths (no layout shift)
- [x] Window minimum size: 650×450px enforced via tauri.conf.json
- [x] SQLite stub (src/db.ts): full schema + all queries commented-in, ready to wire
- [x] Work tab: timer completion overlay with pre-built break suggestions (walk outside, stretch, drink water) + custom entry, dismiss returns to base work tab
- [x] To-do tab: pressing Enter on a task description adds a new blank task row (spreadsheet-style keyboard flow)
- [x] Work tab: unmarking a recurring done task in the to-do tab now restores it in the work tab (cleared workDismissed on toggle)
- [x] History tab: individual row deletion via hover-reveal ✕ button
- [x] Dark mode (night/day toggle) on tab bar far right, implemented via CSS custom properties
- [x] Tree tab: node controls — inline ✓ done button (work-tab style), ≡ task picker + ✕ delete floating below node on hover with debounced hide
- [x] Tree tab: drag-to-pan on canvas background without mode switching; canvas state persists across tab switches
- [x] Tree tab: clear button wipes all nodes and links
- [x] Tree ↔ to-do sync: ≡ picker links a node to a to-do task; ✓ soft-marks non-recurring done (no archive), fully toggles recurring; to-do ✓ remains the archive step
- [x] To-do "done" column: replaced native checkbox with ✓ button matching work/tree style

### Problems to Polish
- [ ] workDismissed (recurring tasks hidden from work tab) resets on restart — resolved by SQLite integration
- [ ] No visual feedback when done is denied on an unnamed task

### Future Steps
1. Integrate SQLite (src/db.ts) for cross-session state persistence
2. CSV export for history tab
3. Add doneSimple logo
4. Add doneSimple documentation for the README.md + how to download locally
5. Build and install doneSimple as a native local app — `npm run tauri build` produces a signed .dmg/installer so the app launches from Spotlight/dock without `npm run tauri dev`
6. Add "link" tab between "work" and "history" — an infinite canvas grid where tasks can be dropped and visually connected with lines (flowchart-style), showing dependencies or sequences between tasks; design TBD

## Session History
### Session 1 — 2026-05-25
Initial generation. Project defined from scratch: doneSimple desktop app,
Tauri + React + TypeScript stack confirmed, SQLite persistence, three-tab
UI layout finalized from user wireframes.

### Session 2 — 2026-05-26
Built full UI from scratch. All three tabs functional with in-memory state.
Recurring done behavior (strikethrough, count toggle, end-of-day reset framework),
timer alarm, SQLite stub with schema. Five future steps logged and prioritized.

### Session 3 — 2026-05-27
Timer completion overlay implemented: pre-built suggestions (walk outside, stretch, drink water) plus custom user-defined entry; dismiss/clear returns to base work tab. Enter-to-add-task fixed: pressing Enter on a task row in the to-do tab creates a new blank row below it (spreadsheet-style flow).

### Session 4 — 2026-05-27
Three bug fixes and one feature: (1) recurring task unmarked in to-do tab now reappears in work tab — toggleDone clears workDismissed; (2) history tab hover-reveal ✕ delete wired up with missing onMouseEnter/onMouseLeave handlers; (3) dark mode implemented via CSS custom properties — single .dark class on .app flips all tokens; (4) link tab concept logged as future step.

### Session 6 — 2026-05-28
Tree tab node controls redesigned: inline ✓ done button (work-tab style, visibility-hidden to prevent layout shift), ≡ task picker and ✕ delete float below node on hover with 150ms debounced hide so buttons are reachable across the gap. Canvas drag-to-pan activated on any background mousedown without requiring mode switch; canvas state preserved across tab switches via always-mounted hidden div. Cross-tab sync: ≡ picker stores taskId on node; ✓ on linked node soft-marks non-recurring tasks done (no archive) and fully toggles recurring tasks; to-do ✓ remains the commit-to-history step. To-do "done" column replaced with ✓ button for visual consistency across all tabs. Clear button wipes all nodes and links from the canvas.