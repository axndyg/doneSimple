import { useState, useEffect, useRef } from "react";
import "./App.css";
import TreeTab from "./TreeTab";
import {
  initDb, loadTasks, loadHistory, syncTasks, syncHistory,
  TaskRow, HistoryRow,
} from "./db";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

type Tab = "todo" | "tree" | "work" | "history";

interface Task {
  id: number;
  description: string;
  recurring: boolean;
  recurDays: number[]; // 0=Mon..6=Sun, empty = every day
  num_repeated: number;
  done: boolean;
  doneDate?: string;
}

interface HistoryEntry {
  id: number;
  description: string;
  dateDone: string;
  recurrenceCount: number;
}

const DEFAULT_BREAK_SUGGESTIONS = [
  "Take a walk outside",
  "Do some stretches",
  "Drink a glass of water",
  "Step away from the screen",
  "Take some deep breaths",
];

function toTaskRows(tasks: Task[], dismissed: number[]): TaskRow[] {
  return tasks.map(t => ({
    id: t.id,
    description: t.description,
    recurring: t.recurring ? 1 : 0,
    done: t.done ? 1 : 0,
    num_repeated: t.num_repeated,
    done_date: t.doneDate ?? null,
    work_dismissed: dismissed.includes(t.id) ? 1 : 0,
    recur_days: t.recurDays.length > 0 ? JSON.stringify(t.recurDays) : null,
  }));
}

function toHistoryRows(history: HistoryEntry[]): HistoryRow[] {
  return history.map(h => ({
    id: h.id,
    description: h.description,
    date_done: h.dateDone,
    recurrence_count: h.recurrenceCount,
  }));
}

const PICKER_EDGE_MARGIN = 16;

function calcPickerPos(el: HTMLElement): { top: number; left: number } {
  const rect = el.getBoundingClientRect();
  return { top: rect.bottom + 6, left: rect.left };
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [workDismissed, setWorkDismissed] = useState<number[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [recurPickerFor, setRecurPickerFor] = useState<number | null>(null);
  const [recurPickerPos, setRecurPickerPos] = useState<{ top: number; left: number } | null>(null);

  const [timerSeconds, setTimerSeconds] = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [digitBuffer, setDigitBuffer] = useState<number[]>([0, 0, 0, 0]);
  const timerInputRef = useRef<HTMLInputElement>(null);
  const recurPillRef = useRef<HTMLElement | null>(null);
  const recurPickerRef = useRef<HTMLDivElement | null>(null);

  const [timerHasStarted, setTimerHasStarted] = useState(false);
  const [workedSeconds, setWorkedSeconds] = useState(0);
  const [tasksCompletedThisSession, setTasksCompletedThisSession] = useState<string[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentBreakSuggestion, setCurrentBreakSuggestion] = useState("");
  const [breakSuggestions, setBreakSuggestions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("breakSuggestions");
      return saved ? JSON.parse(saved) : DEFAULT_BREAK_SUGGESTIONS;
    } catch {
      return DEFAULT_BREAK_SUGGESTIONS;
    }
  });
  const [showBreakEditor, setShowBreakEditor] = useState(false);

  // Request notification permission on mount; store result so timer can use it without re-checking
  const notifPermittedRef = useRef(false);
  useEffect(() => {
    isPermissionGranted()
      .then(granted => granted ? "granted" : requestPermission())
      .then(status => { notifPermittedRef.current = status === "granted"; })
      .catch(() => {});
  }, []);

  // Close recur picker when clicking outside of it
  useEffect(() => {
    if (recurPickerFor === null) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".recur-picker, .pill")) {
        setRecurPickerFor(null);
        setRecurPickerPos(null);
        recurPillRef.current = null;
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [recurPickerFor]);

  // Reposition picker when window resizes so it stays anchored to its pill
  useEffect(() => {
    if (recurPickerFor === null) return;
    const onResize = () => {
      if (recurPillRef.current) setRecurPickerPos(calcPickerPos(recurPillRef.current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recurPickerFor]);

  // After each position update, measure the rendered picker and clamp it away from the right edge
  useEffect(() => {
    if (!recurPickerRef.current || !recurPickerPos) return;
    const rect = recurPickerRef.current.getBoundingClientRect();
    const overflow = rect.right + PICKER_EDGE_MARGIN - window.innerWidth;
    if (overflow > 0) {
      setRecurPickerPos(prev => prev ? { ...prev, left: prev.left - overflow } : prev);
    }
  }, [recurPickerPos]);

  // Load all data from SQLite on first mount
  useEffect(() => {
    initDb()
      .then(() => Promise.all([loadTasks(), loadHistory()]))
      .then(([taskRows, historyRows]) => {
        const dismissed = taskRows.filter(r => r.work_dismissed === 1).map(r => r.id);
        setTasks(taskRows.map(r => ({
          id: r.id,
          description: r.description,
          recurring: r.recurring === 1,
          recurDays: r.recur_days ? JSON.parse(r.recur_days) : [],
          done: r.done === 1,
          num_repeated: r.num_repeated,
          doneDate: r.done_date ?? undefined,
        })));
        setHistory(historyRows.map(r => ({
          id: r.id,
          description: r.description,
          dateDone: r.date_done,
          recurrenceCount: r.recurrence_count,
        })));
        setWorkDismissed(dismissed);
        setDbReady(true);
      })
      .catch(console.error);
  }, []);

  // Global mouseup clears drag if released outside the table
  useEffect(() => {
    const clear = () => { setDraggedId(null); setDragOverId(null); };
    window.addEventListener("mouseup", clear);
    return () => window.removeEventListener("mouseup", clear);
  }, []);

  // Show grabbing cursor app-wide while dragging
  useEffect(() => {
    document.body.style.cursor = draggedId !== null ? "grabbing" : "";
    document.body.style.userSelect = draggedId !== null ? "none" : "";
  }, [draggedId]);

  const taskSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historySyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist break suggestions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("breakSuggestions", JSON.stringify(breakSuggestions));
  }, [breakSuggestions]);

  // Debounced task sync — prevents concurrent DELETE+INSERT race conditions
  useEffect(() => {
    if (!dbReady) return;
    if (taskSyncTimer.current) clearTimeout(taskSyncTimer.current);
    const rows = toTaskRows(tasks, workDismissed);
    taskSyncTimer.current = setTimeout(() => {
      syncTasks(rows).catch(console.error);
    }, 300);
  }, [tasks, workDismissed, dbReady]);

  // Debounced history sync
  useEffect(() => {
    if (!dbReady) return;
    if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    const rows = toHistoryRows(history);
    historySyncTimer.current = setTimeout(() => {
      syncHistory(rows).catch(console.error);
    }, 300);
  }, [history, dbReady]);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerSeconds === 0) {
      setTimerRunning(false);
      playAlarm();
      const idx = Math.floor(Math.random() * breakSuggestions.length);
      setCurrentBreakSuggestion(breakSuggestions[idx] ?? "Take a break");
      setShowOverlay(true);
      // Fire system notification so user knows even if they're in another app
      if (notifPermittedRef.current) {
        sendNotification({ title: "doneSimple", body: "Timer's up — take a break!" });
      }
      return;
    }
    const id = setInterval(() => {
      setTimerSeconds(s => s - 1);
      setWorkedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerSeconds, breakSuggestions]);

  // End-of-day reset for recurring tasks
  useEffect(() => {
    const checkDayReset = () => {
      const today = new Date().toISOString().split("T")[0];
      setTasks(prev => prev.map(t => {
        if (t.recurring && t.done && t.doneDate && t.doneDate !== today) {
          return { ...t, done: false, doneDate: undefined };
        }
        return t;
      }));
    };
    checkDayReset();
    const id = setInterval(checkDayReset, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (timerEditing) timerInputRef.current?.focus();
  }, [timerEditing]);

  function addTask() {
    const id = Date.now();
    setTasks(prev => [...prev, { id, description: "", recurring: false, recurDays: [], done: false, num_repeated: 0 }]);
    setFocusId(id);
  }

  function updateDescription(id: number, description: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, description } : t));
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent, _id: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  }

  function handlePillClick(id: number, e: React.MouseEvent) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (recurPickerFor === id) {
      setRecurPickerFor(null);
      setRecurPickerPos(null);
      recurPillRef.current = null;
      return;
    }
    if (!task.recurring) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, recurring: true } : t));
    }
    const el = e.currentTarget as HTMLElement;
    recurPillRef.current = el;
    setRecurPickerPos(calcPickerPos(el));
    setRecurPickerFor(id);
  }

  function toggleRecurDay(taskId: number, dayIndex: number) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const has = t.recurDays.includes(dayIndex);
      const newDays = has
        ? t.recurDays.filter(d => d !== dayIndex)
        : [...t.recurDays, dayIndex].sort((a, b) => a - b);
      return { ...t, recurDays: newDays };
    }));
  }

  function disableRecurring(id: number) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setRecurPickerFor(null);
    setRecurPickerPos(null);
    recurPillRef.current = null;
    if (task.done) {
      // Recurring done task turned non-recurring → archive it
      setHistory(prev => [...prev, {
        id: Date.now(),
        description: task.description,
        dateDone: new Date().toISOString().split("T")[0],
        recurrenceCount: (task.num_repeated || 1),
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, recurring: false, recurDays: [] } : t));
    }
  }

  function recurPillLabel(task: Task): string {
    return task.recurring ? "yes" : "no";
  }

  function toggleDone(id: number) {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.description) return;
    if (task.recurring) {
      const today = new Date().toISOString().split("T")[0];
      if (!task.done) {
        setTasks(prev => prev.map(t => t.id === id
          ? { ...t, done: true, num_repeated: t.num_repeated + 1, doneDate: today }
          : t));
      } else {
        setTasks(prev => prev.map(t => t.id === id
          ? { ...t, done: false, num_repeated: Math.max(0, t.num_repeated - 1), doneDate: undefined }
          : t));
        // Restore to work tab when unmarked
        setWorkDismissed(prev => prev.filter(d => d !== id));
      }
    } else {
      setHistory(prev => [...prev, {
        id: Date.now(),
        description: task.description,
        dateDone: new Date().toISOString().split("T")[0],
        recurrenceCount: (task.num_repeated || 0) + 1,
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }

  function reorderTask(fromId: number, toId: number) {
    setTasks(prev => {
      const from = prev.findIndex(t => t.id === fromId);
      const to = prev.findIndex(t => t.id === toId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function deleteTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setWorkDismissed(prev => prev.filter(d => d !== id));
  }

  // Used by tree tab: recurring tasks get full toggle; non-recurring get soft done (no archive).
  function markTaskDoneFromTree(id: number) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (task.recurring) {
      const today = new Date().toISOString().split("T")[0];
      if (!task.done) {
        setTasks(prev => prev.map(t => t.id === id
          ? { ...t, done: true, num_repeated: t.num_repeated + 1, doneDate: today }
          : t));
      } else {
        setTasks(prev => prev.map(t => t.id === id
          ? { ...t, done: false, num_repeated: Math.max(0, t.num_repeated - 1), doneDate: undefined }
          : t));
        setWorkDismissed(prev => prev.filter(d => d !== id));
      }
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    }
  }

  function deleteHistory(id: number) {
    setHistory(prev => prev.filter(t => t.id !== id));
  }

  function workDone(id: number) {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.description) return;
    if (timerHasStarted) {
      setTasksCompletedThisSession(prev => [...prev, task.description]);
    }
    if (task.recurring) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: true, num_repeated: (t.num_repeated || 0) + 1, } : t));
      setWorkDismissed(prev => [...prev, id]);
    } else {
      setHistory(prev => [...prev, {
        id: Date.now(),
        description: task.description,
        dateDone: new Date().toISOString().split("T")[0],
        recurrenceCount: (task.num_repeated || 0) + 1,
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }

  function handleStartPause() {
    if (!timerRunning) {
      if (!timerHasStarted) {
        setTimerHasStarted(true);
        setWorkedSeconds(0);
        setTasksCompletedThisSession([]);
      }
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
    }
  }

  function resetTimer() {
    setTimerRunning(false);
    setTimerSeconds(30 * 60);
    setTimerHasStarted(false);
    setWorkedSeconds(0);
    setTasksCompletedThisSession([]);
    setShowOverlay(false);
  }

  function openTimerEdit() {
    setTimerRunning(false);
    const mm = Math.min(Math.floor(timerSeconds / 60), 99);
    const ss = timerSeconds % 60;
    setDigitBuffer([Math.floor(mm / 10), mm % 10, Math.floor(ss / 10), ss % 10]);
    setTimerEditing(true);
  }

  function commitTimerEdit() {
    setTimerEditing(false);
    const total = (digitBuffer[0] * 10 + digitBuffer[1]) * 60 + (digitBuffer[2] * 10 + digitBuffer[3]);
    if (total > 0) setTimerSeconds(total);
  }

  function handleTimerKey(e: React.KeyboardEvent) {
    e.preventDefault();
    if (e.key >= "0" && e.key <= "9") {
      setDigitBuffer(prev => [...prev.slice(1), parseInt(e.key)]);
    } else if (e.key === "Backspace") {
      setDigitBuffer(prev => [0, ...prev.slice(0, 3)]);
    } else if (e.key === "Enter") {
      commitTimerEdit();
    } else if (e.key === "Escape") {
      setTimerEditing(false);
    }
  }

  function playAlarm() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2);
  }

  function clearHistory() {
    setHistory([]);
  }

  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const seconds = String(timerSeconds % 60).padStart(2, "0");
  const workedMM = String(Math.floor(workedSeconds / 60)).padStart(2, "0");
  const workedSS = String(workedSeconds % 60).padStart(2, "0");

  return (
    <div className={`app${darkMode ? " dark" : ""}`}>
      <nav className="tab-bar">
        <button className={`tab-btn${activeTab === "todo" ? " active" : ""}`} onClick={() => setActiveTab("todo")}>to do</button>
        <button className={`tab-btn${activeTab === "work" ? " active" : ""}`} onClick={() => setActiveTab("work")}>work</button>
        <button className={`tab-btn${activeTab === "tree" ? " active" : ""}`} onClick={() => setActiveTab("tree")}>tree</button>
        <button className={`tab-btn${activeTab === "history" ? " active" : ""}`} onClick={() => setActiveTab("history")}>history</button>
        <button
          className="app-logo"
          onClick={() => setDarkMode(d => { localStorage.setItem("darkMode", String(!d)); return !d; })}
          title={darkMode ? "switch to light mode" : "switch to dark mode"}
        >dS</button>
      </nav>

     {activeTab === "todo" && (
        <div className="tab-content">
          <div className="table-scroll">
            <table className="task-table todo-table">
              <thead>
                <tr>
                  <th>task</th>
                  <th>recurring</th>
                  <th>done</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr
                    key={task.id}
                    className={[
                      task.done ? "row-done" : "",
                      draggedId === task.id ? "row-dragging" : "",
                      dragOverId === task.id && draggedId !== task.id ? "row-drag-over" : "",
                    ].filter(Boolean).join(" ")}
                    onMouseEnter={() => { setHoveredRow(task.id); if (draggedId !== null) setDragOverId(task.id); }}
                    onMouseLeave={() => setHoveredRow(null)}
                    onMouseUp={() => { if (draggedId !== null && draggedId !== task.id) reorderTask(draggedId, task.id); setDraggedId(null); setDragOverId(null); }}
                  >
                    <td>
                      <div className="task-cell">
                        <span
                          className="drag-handle"
                          style={{ visibility: hoveredRow === task.id ? "visible" : "hidden" }}
                          onMouseDown={e => { e.preventDefault(); setDraggedId(task.id); setDragOverId(task.id); }}
                        >⠿</span>
                        <input
                          className="task-desc-input"
                          value={task.description}
                          placeholder="task description"
                          onChange={e => updateDescription(task.id, e.target.value)}
                          onKeyDown={e => handleDescriptionKeyDown(e, task.id)}
                          ref={el => { if (el && task.id === focusId) { el.focus(); setFocusId(null); } }}
                          readOnly={task.done}
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        className={`pill${task.recurring ? " pill-yes" : " pill-no"}`}
                        onClick={e => handlePillClick(task.id, e)}
                      >
                        {recurPillLabel(task)}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`work-done-btn${task.done ? " tree-node-done-active" : ""}`}
                        onClick={() => toggleDone(task.id)}
                      >✓</button>
                    </td>
                    <td className="delete-cell">
                      <button
                        className="delete-btn"
                        onClick={() => deleteTask(task.id)}
                        style={{ opacity: hoveredRow === task.id ? 1 : 0.3 }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="add-row" onClick={addTask}>
                  <td colSpan={3}></td>
                  <td className="delete-cell">
                    <button className="add-btn">+</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Always mounted so canvas state survives tab switches */}
      <div className={`tab-content tab-content-canvas${activeTab !== "tree" ? " tab-hidden" : ""}`}>
        <TreeTab
          tasks={tasks.map(t => ({ id: t.id, description: t.description, done: t.done }))}
          onTaskDone={markTaskDoneFromTree}
          dbReady={dbReady}
        />
      </div>
      {activeTab === "work" && (
        <div className="tab-content">
          <div className="work-panel">
            <div className="work-timer">
              {timerEditing ? (
                <input
                  ref={timerInputRef}
                  className="timer-input"
                  value={`${digitBuffer[0]}${digitBuffer[1]}:${digitBuffer[2]}${digitBuffer[3]}`}
                  readOnly
                  onBlur={commitTimerEdit}
                  onKeyDown={handleTimerKey}
                />
              ) : (
                <div className="timer-display" onClick={openTimerEdit} title="click to set time">
                  {minutes}:{seconds}
                </div>
              )}
              <div className="timer-adjust">
                <button onClick={() => setTimerSeconds(s => s + 300)}>+5m</button>
                <button onClick={() => setTimerSeconds(s => Math.max(300, s - 300))}>−5m</button>
              </div>
              <div className="timer-controls">
                <button onClick={handleStartPause}>{timerRunning ? "pause" : "start"}</button>
                <button onClick={resetTimer}>reset</button>
              </div>
            </div>
            <div className="work-tasks">
              <div className="work-tasks-header">
                <h3>recent tasks</h3>
                <button
                  className="overlay-icon-btn"
                  onClick={() => setShowBreakEditor(true)}
                  title="edit break suggestions"
                >⚙</button>
              </div>
              <div className="work-task-scroll">
                <ul>
                  {tasks.filter(t => !workDismissed.includes(t.id) && t.description && !t.done).slice(0, 5).map(t => (
                    <li key={t.id}>
                      <span>{t.description || <span className="empty-task">unnamed task</span>}</span>
                      <button className="work-done-btn" onClick={() => workDone(t.id)}>✓</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {showOverlay && (
            <div className="work-overlay">
              <div className="overlay-actions">
                <button className="overlay-icon-btn" onClick={() => setShowBreakEditor(true)} title="edit suggestions">⚙</button>
                <button className="overlay-icon-btn" onClick={resetTimer} title="dismiss">✕</button>
              </div>
              <div className="overlay-body">
                <div className="overlay-left">
                  <div className="overlay-section">
                    <span className="overlay-label">worked for</span>
                    <span className="overlay-worked-time">{workedMM}:{workedSS}</span>
                  </div>
                  <div className="overlay-section overlay-tasks-section">
                    <span className="overlay-label">tasks completed</span>
                    {tasksCompletedThisSession.length === 0 ? (
                      <span className="overlay-empty">none this session</span>
                    ) : (
                      <ul className="overlay-task-list">
                        {tasksCompletedThisSession.map((desc, i) => (
                          <li key={i}>{desc}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="overlay-right">
                  <span className="overlay-label">take a break</span>
                  <span className="overlay-suggestion">{currentBreakSuggestion}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="tab-content">
          <div className="table-scroll">
            <table className="task-table history-table">
              <thead>
                <tr>
                  <th>task</th>
                  <th>date completed</th>
                  <th>times done</th>
                  <th><button className="delete-btn clearHistory" onClick={() => clearHistory()}>✕</button></th>
                </tr>
              </thead>
              <tbody>
                {history.map(entry => (
                  <tr key={entry.id} onMouseEnter={() => setHoveredRow(entry.id)} onMouseLeave={() => setHoveredRow(null)}>
                    <td>{entry.description}</td>
                    <td>{entry.dateDone}</td>
                    <td>{entry.recurrenceCount}</td>
                    <td className="delete-cell">
                      <button
                        className="delete-btn"
                        onClick={() => deleteHistory(entry.id)}
                        style={{ opacity: hoveredRow === entry.id ? 1 : 0.3 }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recurPickerFor !== null && recurPickerPos && (() => {
        const task = tasks.find(t => t.id === recurPickerFor);
        if (!task) return null;
        return (
          <div
            ref={recurPickerRef}
            className="recur-picker"
            style={{ position: "fixed", top: recurPickerPos.top, left: recurPickerPos.left }}
          >
            <span className="recur-picker-label">repeats on</span>
            <div className="recur-day-chips">
              {DAY_LETTERS.map((letter, i) => (
                <button
                  key={i}
                  className={`recur-day-chip${task.recurDays.includes(i) ? " chip-active" : ""}`}
                  onClick={e => { e.stopPropagation(); toggleRecurDay(task.id, i); }}
                >{letter}</button>
              ))}
            </div>
            <button
              className="recur-off-btn"
              onClick={e => { e.stopPropagation(); disableRecurring(task.id); }}
            >turn off</button>
          </div>
        );
      })()}

      {showBreakEditor && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowBreakEditor(false); }}>
          <div className="modal">
            <div className="modal-header">
              <span>break suggestions</span>
              <button className="overlay-icon-btn" onClick={() => setShowBreakEditor(false)}>✕</button>
            </div>
            <ul className="modal-list">
              {breakSuggestions.map((s, i) => (
                <li key={i} className="modal-list-item">
                  <input
                    className="modal-input"
                    value={s}
                    onChange={e => setBreakSuggestions(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                  />
                  <button className="delete-btn" onClick={() => setBreakSuggestions(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </li>
              ))}
            </ul>
            <button
              className="modal-add-btn"
              onClick={() => setBreakSuggestions(prev => [...prev, ""])}
            >
              + add suggestion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
