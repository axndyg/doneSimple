import { useState, useEffect } from "react";
import "./App.css";

type Tab = "todo" | "work" | "history";

interface Task {
  id: number;
  description: string;
  recurring: boolean;
  done: boolean;
}

interface HistoryEntry {
  id: number;
  description: string;
  dateDone: string;
  recurrenceCount: number;
}

const sampleTasks: Task[] = [

];

const sampleHistory: HistoryEntry[] = [

];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [history, setHistory] = useState<HistoryEntry[]>(sampleHistory);
  const [newTask, setNewTask] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [timerSeconds, setTimerSeconds] = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerSeconds === 0) { setTimerRunning(false); return; }
    const id = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerSeconds]);

  function addTask() {
    if (!newTask.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), description: newTask.trim(), recurring: false, done: false }]);
    setNewTask("");
  }

  function toggleRecurring(id: number) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, recurring: !t.recurring } : t));
  }

  function toggleDone(id: number) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (task.recurring) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: false } : t));
    } else {
      setHistory(prev => [...prev, {
        id: Date.now(),
        description: task.description,
        dateDone: new Date().toISOString().split("T")[0],
        recurrenceCount: 1,
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }

  function deleteTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
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
          <div className="add-task-row">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              placeholder="new task..."
            />
            <button onClick={addTask}>add</button>
          </div>
          <table className="task-table">
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
                  <td>{task.description}</td>
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
                    {hoveredRow === task.id && (
                      <button className="delete-btn" onClick={() => deleteTask(task.id)}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "work" && (
        <div className="tab-content work-panel">
          <div className="work-tasks">
            <h3>recent tasks</h3>
            <ul>
              {tasks.filter(t => !t.done).slice(0, 5).map(t => (
                <li key={t.id}>{t.description}</li>
              ))}
            </ul>
          </div>
          <div className="work-timer">
            <div className="timer-display">{minutes}:{seconds}</div>
            <div className="timer-adjust">
              <button onClick={() => setTimerSeconds(s => Math.max(300, s - 300))}>−5m</button>
              <button onClick={() => setTimerSeconds(s => s + 300)}>+5m</button>
            </div>
            <div className="timer-controls">
              <button onClick={() => setTimerRunning(r => !r)}>{timerRunning ? "pause" : "start"}</button>
              <button onClick={() => { setTimerRunning(false); setTimerSeconds(30 * 60); }}>reset</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="tab-content">
          <table className="task-table">
            <thead>
              <tr>
                <th>task</th>
                <th>date completed</th>
                <th>times done</th>
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
