import { Button, ChoiceInput, ControlFeedbackContext } from "../../shared/Controls";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { Icon } from "../../shared/ui";

const MAX_TASKS = 12;
const MAX_TAGS = 8;
const tasksFor = (timer) => timer.tasks?.length ? timer.tasks : timer.task ? [{ id: "primary", text: timer.task, done: false }] : [];

function TaskTextInput({ task, index, onChange }) {
  const [emptyDraft, setEmptyDraft] = useState(null);
  return <span className="session-task-text-wrap"><input className="session-task-text" aria-label={index === 0 ? "Session task" : `Session task ${index + 1}`} maxLength={200}
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
    }} /><span className="task-strike" aria-hidden="true">{emptyDraft ?? task.text}</span></span>;
}

function TaskRow({ task, index, update, remove }) {
  const feedback = useContext(ControlFeedbackContext);
  const previousDone = useRef(task.done);
  useEffect(() => {
    // Observe the accepted state, rather than celebrating a checkbox request.
    // Restored tasks and reopening the editor never replay their completion.
    if (previousDone.current !== task.done) feedback(task.done ? "check" : "selection");
    previousDone.current = task.done;
  }, [task.done, feedback]);
  return <div className={`session-task-row ${task.done ? "done" : ""}`}>
    {task.text ? <label className="task-check-wrap"><ChoiceInput className="session-task-check" type="checkbox" checked={task.done} sound={null}
      aria-label={`Mark ${task.text} ${task.done ? "incomplete" : "complete"}`}
      onChange={(event) => update({ done: event.target.checked })} />
      <svg className="task-check-drawing" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8 6.5 11 12.5 5" /></svg>
    </label> : <Icon name="pencil" size={15} />}
    <TaskTextInput task={task} index={index} onChange={(text) => update({ text })} />
    {task.text && <Button type="button" className="session-remove-button" aria-label={`Remove task ${index + 1}`}
      onClick={remove}><Icon name="close" size={13} /></Button>}
  </div>;
}

export default function SessionTasks({ timer, history = [], act, compact = false, minimal = false }) {
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
  const doneCount = tasks.filter(task => task.done).length;
  return <div className={`session-tasks ${compact ? "compact" : ""} ${minimal ? "minimal" : ""} ${tasks[0]?.done ? "first-task-done" : ""}`}>
    {(compact || minimal) && <div className="session-task-summary">
      {minimal && !compact && !expanded ? <TaskTextInput task={tasks[0] || { id: "primary", text: "", done: false }} index={0}
        onChange={(text) => tasks.length ? updateTask(tasks[0].id, { text }) : setTasks([{ id: "primary", text, done: false }])} />
        : <span>{tasks.length ? tasks.map((task) => task.text).join(" · ") : "What are you working on?"}</span>}
      <Button type="button" className="session-edit-button" aria-label={`${expanded ? "Done" : "Edit"} tasks and tags`} aria-expanded={expanded} aria-controls={expanded ? editorId : undefined}
        onClick={() => setExpanded(!expanded)}><Icon name={expanded ? "check" : "pencil"} size={14} /><span className="edit-label">{expanded ? "Done" : "Edit"}</span></Button>
    </div>}
    {(compact || minimal) && !expanded && tasks.length > 0 && <div className="session-task-overview">
      <span>{doneCount} of {tasks.length} done{minimal && !compact && tasks.length > 1 ? ` · ${tasks.length - 1} more ${tasks.length === 2 ? "task" : "tasks"}` : ""}</span>
    </div>}
    {timer.status === "idle" && doneCount > 0 && <div className="task-reuse-note"><span>Checklist checks are kept for this session.</span><Button type="button" className="text-button" onClick={() => setTasks(tasks.map(task => ({ ...task, done: false })))}>Reset checks</Button></div>}
    {((!compact && !minimal) || expanded) && <div id={editorId} className="session-task-editor">
      <div className="session-task-list" role="group" aria-label="Session tasks">
        {(tasks.length ? tasks : [{ id: "primary", text: "", done: false }]).map((task, index) => <TaskRow key={task.id} task={task} index={index}
          update={(changes) => tasks.length ? updateTask(task.id, changes) : setTasks([{ ...task, ...changes }])}
          remove={() => setTasks(tasks.filter((item) => item.id !== task.id))} />)}
      </div>
      {addingTask && <div className="session-add-field">
        <input autoFocus aria-label="New task" maxLength={200} placeholder="Another task" value={taskDraft}
          onChange={(event) => setTaskDraft(event.target.value)} onKeyDown={(event) => onEnter(event, addTask)} />
        <Button type="button" onClick={addTask} disabled={!taskDraft.trim()}>Add</Button>
        <Button type="button" aria-label="Cancel new task" onClick={() => { setAddingTask(false); setTaskDraft(""); }}><Icon name="close" size={13} /></Button>
      </div>}
      {tags.length > 0 && <div className="session-tag-list" aria-label="Session tags">
        {tags.map((tag) => <span key={tag} className="session-tag">{tag}<Button type="button" aria-label={`Remove tag ${tag}`}
          onClick={() => act({ type: "SET_TAGS", tags: tags.filter((item) => item !== tag) })}><Icon name="close" size={11} /></Button></span>)}
      </div>}
      {addingTag && <div className="session-add-field">
        <input autoFocus aria-label="New session tag" maxLength={32} placeholder="e.g. Chemistry or Work" list={suggestionId}
          value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => onEnter(event, addTag)} />
        <datalist id={suggestionId}>{suggestions.map((tag) => <option key={tag} value={tag} />)}</datalist>
        <Button type="button" onClick={addTag} disabled={!tagDraft.trim()}>Add</Button>
        <Button type="button" aria-label="Cancel new tag" onClick={() => { setAddingTag(false); setTagDraft(""); }}><Icon name="close" size={13} /></Button>
      </div>}
      <div className="session-editor-tools">
        <Button type="button" disabled={tasks.length >= MAX_TASKS || addingTask} onClick={() => setAddingTask(true)}><Icon name="plus" size={12} />Task</Button>
        <Button type="button" disabled={tags.length >= MAX_TAGS || addingTag} onClick={() => setAddingTag(true)}><Icon name="plus" size={12} />Tag</Button>
        {tasks.length > 1 && <span>{tasks.filter((task) => task.done).length}/{tasks.length} done</span>}
      </div>
    </div>}
    {(compact || minimal) && !expanded && tags.length > 0 && <div className="session-tag-list compact-tags">{tags.map((tag) => <span key={tag} className="session-tag">{tag}</span>)}</div>}
  </div>;
}
