# doneSimple

A minimal desktop productivity app for managing recurring and one-off tasks. Zero friction — open the app, see your tasks, close it, find them exactly as you left them.

Built with Tauri + React + TypeScript. All data is stored locally on your machine.

---

## Download

**[→ Download the latest release](../../releases/latest)**

Grab the `.dmg` file from the latest release, open it, and drag **doneSimple** into your Applications folder.

### First launch on macOS

Because the app is not yet signed with an Apple Developer certificate, macOS may block it on first open. To get past this:

1. run once in Terminal: `xattr -cr /Applications/doneSimple.app`

After that first step it opens normally every time.

---

## Features

**To Do tab**
- Add tasks, toggle recurring on/off, mark done
- Recurring tasks reset automatically the next day
- Drag rows to reorder — order syncs to the Work tab
- Hover a row to delete it silently (no history entry)

**Work tab**
- Your top 5 pending tasks at a glance
- Countdown timer (default 30 min), adjustable in 5-min steps
- Timer completion overlay with break suggestions (customisable)

**Tree tab**
- Infinite canvas — add nodes, draw Bézier links between them
- Link any node to a to-do task; marking it done syncs back
- Pan by dragging the background, zoom with scroll wheel

**History tab**
- Append-only log of every completed non-recurring task
- Description, date completed, and how many times it was done

**Extras**
- Light / Dark mode toggle (persists between sessions)
- All data stored in SQLite — survives restarts, never leaves your machine

---

## Build from source

Requirements: [Rust](https://www.rust-lang.org/tools/install), [Node.js 18+](https://nodejs.org)

```bash
git clone https://github.com/axndyg/doneSimple.git
cd doneSimple
npm install
npm run tauri dev      # development (hot reload)
npm run tauri build    # production .app + .dmg
```

The release bundle lands in `src-tauri/target/release/bundle/`.

## License 

[MIT](https://choosealicense.com/licenses/mit/)
