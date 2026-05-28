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
