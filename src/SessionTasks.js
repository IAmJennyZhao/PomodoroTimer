import { useId, useState } from "react";
import { Icon } from "./ui";
import "./SessionTasks.css";

const MAX_TASKS = 12;
const MAX_TAGS = 8;
const tasksFor = (timer) => timer.tasks?.length ? timer.tasks : timer.task ? [{ id: "primary", text: timer.task, done: false }] : [];

function TaskTextInput({ task, index, onChange }) {
  const [emptyDraft, setEmptyDraft] = useState(null);
  return <input className="session-task-text" aria-label={index === 0 ? "Session task" : `Session task ${index + 1}`} maxLength={200}
    placeholder="What are you working on?" value={emptyDraft ?? task.text}
    onChange={(event) => {
      const text = event.target.value;
      // Keep the row mounted while someone clears it to type a replacement.
      setEmptyDraft(text.trim() ? null : text);
      if (text.trim()) onChange(text);
    }}
    onBlur={() => {
      if (emptyDraft !== null) onChange(emptyDraft);
      setEmptyDraft(null);
    }} />;
}

export default function SessionTasks({ timer, history = [], act, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const suggestionId = useId();
  const editorId = useId();
  const tasks = tasksFor(timer);
  const tags = timer.tags || [];
  const suggestions = [...new Set(history.flatMap((entry) => entry.tags || []))]
    .filter((tag) => !tags.some((selected) => selected.toLowerCase() === tag.toLowerCase()));
  const setTasks = (next) => act({ type: "SET_TASKS", tasks: next });
  const updateTask = (id, changes) => setTasks(tasks.map((task) => task.id === id ? { ...task, ...changes } : task));
  const addTask = () => {
    const text = taskDraft.trim();
    if (!text || tasks.length >= MAX_TASKS) return;
    setTasks([...tasks, { id: `task:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, text, done: false }]);
    setTaskDraft("");
    setAddingTask(false);
  };
  const addTag = () => {
    const tag = tagDraft.trim().replace(/\s+/g, " ");
    if (!tag || tags.length >= MAX_TAGS) return;
    if (!tags.some((item) => item.toLowerCase() === tag.toLowerCase())) act({ type: "SET_TAGS", tags: [...tags, tag] });
    setTagDraft("");
    setAddingTag(false);
  };
  const onEnter = (event, callback) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      callback();
    }
  };
  return <div className={`session-tasks ${compact ? "compact" : ""}`}>
    {compact && <div className="session-task-summary">
      <span>{tasks.length ? tasks.map((task) => task.text).join(" · ") : "Add a task or tag"}</span>
      <button type="button" className="session-edit-button" aria-label={`${expanded ? "Done" : "Edit"} tasks and tags`} aria-expanded={expanded} aria-controls={expanded ? editorId : undefined}
        onClick={() => setExpanded(!expanded)}><Icon name="pencil" size={13} />{expanded ? "Done" : "Edit"}</button>
    </div>}
    {(!compact || expanded) && <div id={editorId} className="session-task-editor">
      <div className="session-task-list" role="group" aria-label="Session tasks">
        {(tasks.length ? tasks : [{ id: "primary", text: "", done: false }]).map((task, index) => <div key={task.id} className={`session-task-row ${task.done ? "done" : ""}`}>
          {task.text ? <input className="session-task-check" type="checkbox" checked={task.done}
            aria-label={`Mark ${task.text} ${task.done ? "incomplete" : "complete"}`}
            onChange={(event) => updateTask(task.id, { done: event.target.checked })} /> : <Icon name="pencil" size={15} />}
          <TaskTextInput task={task} index={index}
            onChange={(text) => tasks.length ? updateTask(task.id, { text }) : setTasks([{ ...task, text }])} />
          {task.text && <button type="button" className="session-remove-button" aria-label={`Remove task ${index + 1}`}
            onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))}><Icon name="close" size={13} /></button>}
        </div>)}
      </div>
      {addingTask && <div className="session-add-field">
        <input autoFocus aria-label="New task" maxLength={200} placeholder="Another task" value={taskDraft}
          onChange={(event) => setTaskDraft(event.target.value)} onKeyDown={(event) => onEnter(event, addTask)} />
        <button type="button" onClick={addTask} disabled={!taskDraft.trim()}>Add</button>
        <button type="button" aria-label="Cancel new task" onClick={() => { setAddingTask(false); setTaskDraft(""); }}><Icon name="close" size={13} /></button>
      </div>}
      {tags.length > 0 && <div className="session-tag-list" aria-label="Session tags">
        {tags.map((tag) => <span key={tag} className="session-tag">{tag}<button type="button" aria-label={`Remove tag ${tag}`}
          onClick={() => act({ type: "SET_TAGS", tags: tags.filter((item) => item !== tag) })}><Icon name="close" size={11} /></button></span>)}
      </div>}
      {addingTag && <div className="session-add-field">
        <input autoFocus aria-label="New session tag" maxLength={32} placeholder="e.g. Chemistry or Work" list={suggestionId}
          value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => onEnter(event, addTag)} />
        <datalist id={suggestionId}>{suggestions.map((tag) => <option key={tag} value={tag} />)}</datalist>
        <button type="button" onClick={addTag} disabled={!tagDraft.trim()}>Add</button>
        <button type="button" aria-label="Cancel new tag" onClick={() => { setAddingTag(false); setTagDraft(""); }}><Icon name="close" size={13} /></button>
      </div>}
      <div className="session-editor-tools">
        <button type="button" disabled={tasks.length >= MAX_TASKS || addingTask} onClick={() => setAddingTask(true)}><Icon name="plus" size={12} />Task</button>
        <button type="button" disabled={tags.length >= MAX_TAGS || addingTag} onClick={() => setAddingTag(true)}><Icon name="plus" size={12} />Tag</button>
        {tasks.length > 1 && <span>{tasks.filter((task) => task.done).length}/{tasks.length} done</span>}
      </div>
    </div>}
    {compact && !expanded && tags.length > 0 && <div className="session-tag-list compact-tags">{tags.map((tag) => <span key={tag} className="session-tag">{tag}</span>)}</div>}
  </div>;
}
