# TAKEAWAYS.md — doneSimple Learner Growth Log

Maintained across sessions. Updated when new concepts are introduced,
demonstrated, or confirmed understood through user dialogue.
Do not overwrite history — append new sessions below existing entries.

---

## Established Baseline (Session 3 — 2026-05-27)

### What the user knows
- HTML structure and semantics
- CSS layout, selectors, rules (confirmed: reviews CSS diffs fluently, gives precise visual feedback)
- Product and UX intuition — strong; can wireframe clearly, identify layout hierarchy issues
- Git workflow at the review/approval level (reads diffs, approves commits)

### What is new territory
- JavaScript (logic, functions, variables, array methods)
- TypeScript (type annotations, interfaces)
- React (components, state, effects, JSX/TSX syntax)
- Tauri (desktop shell, how it wraps a web UI into a native app)

---

## Growth Log

### Session 3 — 2026-05-27
- Identified two distinct styling issues from a live app (macOS scrollbar overlap,
  layout panel hierarchy) — strong visual debugging instinct without needing to read code
- Asked unprompted "how can I learn, not just direct" — signals intent to build
  understanding alongside shipping; good foundation for concept introductions
- First exposure to: session state tracking (timerHasStarted, workedSeconds),
  keyboard event handlers (onKeyDown), conditional rendering (showOverlay)
- Engaged with the "why before what" pattern — asked for thoughts before proceeding
  on the overlay redesign rather than jumping straight to implementation

---

## Concepts Introduced (exposure only — not yet confirmed understood)

| Concept | Plain-English summary | Where it appeared |
|---|---|---|
| `useState` | A variable that, when changed, re-draws the UI — like toggling a CSS class but for data | timer, overlay, tasks |
| `useEffect` | Runs a side-effect (timer tick, day reset) whenever specific values change | timer interval, day reset |
| Conditional rendering | `{condition && <Thing />}` — show/hide an element based on state, like `display: none` via JS | overlay, modal |
| TypeScript interface | A named shape for an object — like a contract that says "this data must have these fields" | Task, HistoryEntry |
| Event handler (`onKeyDown`) | A function that fires when the user presses a key inside an element | Enter-to-add-task |

---

## Concepts to Introduce Next
- **Props** — how a parent component passes data down to a child (relevant when App.tsx gets split into smaller files)
- **Event bubbling** — why clicking the modal backdrop closes it; already in the codebase (`e.target === e.currentTarget`)
- **`useRef`** — a way to hold a value or point at a DOM element without triggering a re-render (used for the timer input focus)

---

### Session 7 — 2026-05-28

**Concepts introduced or reinforced:**

- **Race conditions in async JavaScript** — two `syncTasks()` calls could overlap: the first deletes all rows, the second deletes and re-inserts, then the first tries to insert again → UNIQUE constraint error. Fixed with `INSERT OR REPLACE` (idempotent insert) and a 300ms debounce so only the latest write fires. Analogy: like two people trying to update the same Google Doc at the same time.

- **CSS transitions and inheritance** — `transition: color` only fires on elements that have an *explicit* `color` value. Elements that just inherit color from a parent don't get their own transition, causing them to appear to lag or jump. Fix: add `color: var(--text-primary)` directly to `td` so the transition has something to animate.

- **HTML5 Drag and Drop vs. mouse events** — the browser's built-in drag-and-drop API (`draggable`, `onDragOver`, `onDrop`) is unreliable in WebKit/Tauri's embedded WebView; the `drop` event silently never fires. Solution: use plain mouse events (`onMouseDown` to start, `onMouseEnter` to track position, `onMouseUp` to commit) — the same pattern the tree tab already uses for node dragging.

- **Tauri plugin architecture** — each plugin needs two pieces: an npm package (the JavaScript/TypeScript API you call from the UI) and a Cargo crate (the Rust backend that does the actual work). The capabilities JSON grants the frontend permission to call the plugin commands.

- **GitHub CLI and releases** — `gh release create` creates a tagged release and uploads files directly from the terminal. SSH key auth is a one-time setup; afterward all `gh` commands authenticate automatically.

- **macOS Gatekeeper** — macOS blocks apps from unidentified developers by default. Without an Apple Developer certificate, users must right-click → Open on first launch, or run `xattr -cr /path/to/app` in Terminal to remove the quarantine flag. This is a distribution concern, not a build one.

**Demonstrated instincts:**
- Noticed the color transition lag was inconsistent *across specific rows* (not all UI), which pointed directly at the inheritance issue — strong visual debugging.
- Immediately tried to drag (not just read about it) and reported exactly what failed, which gave enough signal to diagnose the WebKit DnD bug quickly.
