import { useState, useEffect, useRef } from "react";
import "./App.css";

type Tab = "todo" | "work" | "history";

interface Task {
  id: number;
  description: string;
  recurring: boolean;
  num_repeated: number;
  done: boolean;
}

interface HistoryEntry {
  id: number;
  description: string;
  dateDone: string;
  recurrenceCount: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  const [timerSeconds, setTimerSeconds] = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [digitBuffer, setDigitBuffer] = useState<number[]>([0, 0, 0, 0]);
  const timerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerSeconds === 0) { setTimerRunning(false); return; }
    const id = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerSeconds]);

  useEffect(() => {
    if (timerEditing) timerInputRef.current?.focus();
  }, [timerEditing]);

  function addTask() {
    const id = Date.now();
    setTasks(prev => [...prev, { id, description: "", recurring: false, done: false }]);
    setFocusId(id);
  }

  function updateDescription(id: number, description: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, description } : t));
  }

  function toggleRecurring(id: number) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, recurring: !t.recurring } : t));
  }

  function toggleDone(id: number) {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.description) return;
    if (task.recurring) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: false, num_repeated: (t.num_repeated || 0)+1 } : t));
    } else {
      setHistory(prev => [...prev, {
        id: Date.now(),
        description: task.description,
        dateDone: new Date().toISOString().split("T")[0],
        recurrenceCount: task.num_repeated || 1,
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }

  function deleteTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
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

  function clearHistory() { 
    setHistory([]);
  }

  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const seconds = String(timerSeconds % 60).padStart(2, "0");

  return (
    <div className="app">
      <nav className="tab-bar">
        <button className={`tab-btn${activeTab === "todo" ? " active" : ""}`} onClick={() => setActiveTab("todo")}>to do</button>
        <button className={`tab-btn${activeTab === "work" ? " active" : ""}`} onClick={() => setActiveTab("work")}>work</button>
        <button className={`tab-btn${activeTab === "history" ? " active" : ""}`} onClick={() => setActiveTab("history")}>history</button>
      </nav>

      {activeTab === "todo" && (
        <div className="tab-content">
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
                  onMouseEnter={() => setHoveredRow(task.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td>
                    <input
                      className="task-desc-input"
                      value={task.description}
                      placeholder="task description"
                      onChange={e => updateDescription(task.id, e.target.value)}
                      ref={el => { if (el && task.id === focusId) { el.focus(); setFocusId(null); } }}
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
      )}

      {activeTab === "work" && (
        <div className="tab-content work-panel">
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
              <button onClick={() => setTimerRunning(r => !r)}>{timerRunning ? "pause" : "start"}</button>
              <button onClick={() => { setTimerRunning(false); setTimerSeconds(30 * 60); }}>reset</button>
            </div>
          </div>
          <div className="work-tasks">
            <h3>recent tasks</h3>
            <ul>
              {tasks.filter(t => !t.done).slice(0, 5).map(t => (
                <li key={t.id}>{t.description || <span className="empty-task">unnamed task</span>}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="tab-content">
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
                <tr key={entry.id}>
                  <td>{entry.description}</td>
                  <td>{entry.dateDone}</td>
                  <td>{entry.recurrenceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
