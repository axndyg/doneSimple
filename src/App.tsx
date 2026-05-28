import { useState, useEffect, useRef } from "react";
import "./App.css";

type Tab = "todo" | "work" | "history";

interface Task {
  id: number;
  description: string;
  recurring: boolean;
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

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [darkMode, setDarkMode] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [workDismissed, setWorkDismissed] = useState<number[]>([]);

  const [timerSeconds, setTimerSeconds] = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [digitBuffer, setDigitBuffer] = useState<number[]>([0, 0, 0, 0]);
  const timerInputRef = useRef<HTMLInputElement>(null);

  const [timerHasStarted, setTimerHasStarted] = useState(false);
  const [workedSeconds, setWorkedSeconds] = useState(0);
  const [tasksCompletedThisSession, setTasksCompletedThisSession] = useState<string[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentBreakSuggestion, setCurrentBreakSuggestion] = useState("");
  const [breakSuggestions, setBreakSuggestions] = useState<string[]>(DEFAULT_BREAK_SUGGESTIONS);
  const [showBreakEditor, setShowBreakEditor] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerSeconds === 0) {
      setTimerRunning(false);
      playAlarm();
      const idx = Math.floor(Math.random() * breakSuggestions.length);
      setCurrentBreakSuggestion(breakSuggestions[idx] ?? "Take a break");
      setShowOverlay(true);
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
    setTasks(prev => [...prev, { id, description: "", recurring: false, done: false, num_repeated: 0 }]);
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

  function toggleRecurring(id: number) {
    const task = tasks.find(t => t.id == id); 
    if (!task) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, recurring: !t.recurring } : t));
    if (task.done) { 
        setHistory(prev => [...prev, {
        id: Date.now(),
        description: task.description,
        dateDone: new Date().toISOString().split("T")[0],
        recurrenceCount: (task.num_repeated || 1),
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
    }
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

  function deleteTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function deleteHistory(id: number) { 
    setHistory(prev => prev.filter(t => t.id !==id)); 
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
        <button className={`tab-btn${activeTab === "history" ? " active" : ""}`} onClick={() => setActiveTab("history")}>history</button>
        <button className="night-toggle" onClick={() => setDarkMode(d => !d)}>{darkMode ? "day" : "night"}</button>
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
                    className={task.done ? "row-done" : ""}
                    onMouseEnter={() => setHoveredRow(task.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td>
                      <input
                        className="task-desc-input"
                        value={task.description}
                        placeholder="task description"
                        onChange={e => updateDescription(task.id, e.target.value)}
                        onKeyDown={e => handleDescriptionKeyDown(e, task.id)}
                        ref={el => { if (el && task.id === focusId) { el.focus(); setFocusId(null); } }}
                        readOnly={task.done}
                      />
                    </td>
                    <td>
                      <button
                        className={`pill${task.recurring ? " pill-yes" : " pill-no"}`}
                        onClick={() => toggleRecurring(task.id)}
                      >
                        {task.recurring ? "yes" : "no"}
                      </button>
                    </td>
                    <td>
                      <input type="checkbox" checked={task.done} onChange={() => toggleDone(task.id)} />
                    </td>
                    <td className="delete-cell">
                      {hoveredRow === task.id
                        ? <button className="delete-btn" onClick={() => deleteTask(task.id)}>✕</button>
                        : null}
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
              <h3>recent tasks</h3>
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
                      {hoveredRow === entry.id
                        ? <button className="delete-btn" onClick={() => deleteHistory(entry.id)}>✕</button>
                        : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
