import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SessionTasks from "./SessionTasks";
import { createInitialState, gameReducer } from "../../domain/game";
import { ControlFeedbackContext } from "../../shared/Controls";

const NOW = new Date(2026, 9, 2, 12).getTime();

function renderTasks(initial = createInitialState(NOW), compact = false, feedback = () => {}) {
  let latest;
  function Harness() {
    const [state, setState] = useState(initial);
    latest = state;
    return <ControlFeedbackContext.Provider value={feedback}><SessionTasks timer={state.timer} history={state.history} compact={compact}
      act={(action) => setState((previous) => gameReducer(previous, { ...action, now: NOW }))} /></ControlFeedbackContext.Provider>;
  }
  return { ...render(<Harness />), getState: () => latest };
}

test("multiple tasks can be edited, completed, and removed during a running session", () => {
  const initial = gameReducer(createInitialState(NOW), { type: "START", now: NOW });
  const { getState } = renderTasks(initial);
  fireEvent.change(screen.getByRole("textbox", { name: "Session task", exact: true }), { target: { value: "Read chapter" } });
  fireEvent.click(screen.getByRole("button", { name: "Task", exact: true }));
  fireEvent.change(screen.getByRole("textbox", { name: "New task" }), { target: { value: "Practice problems" } });
  fireEvent.keyDown(screen.getByRole("textbox", { name: "New task" }), { key: "Enter" });
  expect(getState().timer.tasks.map((task) => task.text)).toEqual(["Read chapter", "Practice problems"]);
  fireEvent.click(screen.getByRole("checkbox", { name: "Mark Read chapter complete" }));
  expect(getState().timer.tasks[0].done).toBe(true);
  const secondTask = screen.getByRole("textbox", { name: "Session task 2" });
  secondTask.focus();
  fireEvent.change(secondTask, { target: { value: "" } });
  expect(secondTask).toHaveFocus();
  expect(secondTask).toHaveValue("");
  fireEvent.change(screen.getByRole("textbox", { name: "Session task 2" }), { target: { value: "Practice chemistry" } });
  expect(getState().timer.tasks[1].text).toBe("Practice chemistry");
  fireEvent.click(screen.getByRole("button", { name: "Remove task 1" }));
  expect(screen.getByRole("textbox", { name: "Session task", exact: true })).toHaveValue("Practice chemistry");
  expect(getState().timer.tasks).toHaveLength(1);
});

test("completion owns its sound, preserves row identity and typing focus, and undo is immediate", () => {
  const initial = gameReducer(createInitialState(NOW), { type: "SET_TASK", task: "Read chapter", now: NOW });
  const feedback = jest.fn();
  const { getState } = renderTasks(initial, false, feedback);
  const input = screen.getByRole("textbox", { name: "Session task" });
  const check = screen.getByRole("checkbox");
  input.focus();
  fireEvent.click(check);
  expect(getState().timer.tasks[0].done).toBe(true);
  expect(feedback.mock.calls).toEqual([["check"]]);
  expect(input).toHaveFocus();
  expect(screen.getByRole("textbox", { name: "Session task" })).toBe(input);
  fireEvent.click(check);
  expect(check).not.toBeChecked();
  expect(check.closest(".session-task-row")).not.toHaveClass("done");
  expect(feedback.mock.calls).toEqual([["check"], ["selection"]]);
});

test("restored completed tasks and reopening the editor never replay completion", () => {
  const initial = gameReducer(createInitialState(NOW), { type: "SET_TASKS", tasks: [{ id: "saved", text: "Read", done: true }], now: NOW });
  const feedback = jest.fn();
  renderTasks(initial, true, feedback);
  fireEvent.click(screen.getByRole("button", { name: "Edit tasks and tags" }));
  expect(screen.getByRole("checkbox")).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Done tasks and tags" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit tasks and tags" }));
  expect(feedback.mock.calls).toEqual([["tap"], ["tap"], ["tap"]]);
});

test("leaving a cleared task removes the empty row", () => {
  const initial = gameReducer(createInitialState(NOW), { type: "SET_TASK", task: "Old task", now: NOW });
  const { getState } = renderTasks(initial);
  fireEvent.change(screen.getByRole("textbox", { name: "Session task" }), { target: { value: "" } });
  fireEvent.blur(screen.getByRole("textbox", { name: "Session task" }));
  expect(getState().timer.tasks).toEqual([]);
  expect(screen.getByRole("textbox", { name: "Session task" })).toHaveValue("");
});

test("tags can be added and removed with case-insensitive duplicate protection", () => {
  const { getState } = renderTasks();
  const addTag = (tag) => {
    fireEvent.click(screen.getByRole("button", { name: "Tag", exact: true }));
    fireEvent.change(screen.getByRole("combobox", { name: "New session tag" }), { target: { value: tag } });
    fireEvent.click(screen.getByRole("button", { name: "Add", exact: true }));
  };
  addTag("Chemistry");
  addTag(" chemistry ");
  addTag("Study");
  expect(getState().timer.tags).toEqual(["Chemistry", "Study"]);
  fireEvent.click(screen.getByRole("button", { name: "Remove tag Chemistry" }));
  expect(getState().timer.tags).toEqual(["Study"]);
});

test("focus view keeps task and tag editing one click away", () => {
  let initial = gameReducer(createInitialState(NOW), { type: "SET_TASK", task: "Write notes", now: NOW });
  initial = gameReducer(initial, { type: "START", now: NOW });
  const { getState } = renderTasks(initial, true);
  expect(screen.getByText("Write notes")).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: "Session task" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit tasks and tags" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Session task" }), { target: { value: "Review notes" } });
  expect(getState().timer.tasks[0].text).toBe("Review notes");
  fireEvent.click(screen.getByRole("button", { name: "Done tasks and tags" }));
  expect(screen.getByText("Review notes")).toBeInTheDocument();
});

test('collapsed task counts expose completion and explicit reset preserves text, tags, and recorded history',()=>{
  let initial=createInitialState(NOW);
  initial.timer.tasks=[{id:'a',text:'Read',done:true},{id:'b',text:'Practice',done:false}];
  initial.timer.task='Read';
  initial.timer.tags=['Study'];
  initial.history=[{id:'previous',task:'Read',tasks:[{id:'a',text:'Read',done:true}],tags:['Study'],minutes:1,gems:1,completedAt:NOW-60000}];
  const {getState}=renderTasks(initial,true);
  expect(screen.getByText('1 of 2 done')).toBeVisible();
  expect(screen.getByText(/Checklist checks are kept/)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Reset checks'}));
  expect(getState().timer.tasks).toEqual([{id:'a',text:'Read',done:false},{id:'b',text:'Practice',done:false}]);
  expect(getState().timer.tags).toEqual(['Study']);
  expect(getState().history[0].tasks[0].done).toBe(true);
  expect(screen.getByText('0 of 2 done')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Reset checks'})).not.toBeInTheDocument();
});

test('the editable collapsed summary shows additional tasks and first-task completion',()=>{
  const timer={...createInitialState(NOW).timer,tasks:[{id:'a',text:'Read',done:true},{id:'b',text:'Practice',done:false},{id:'c',text:'Review',done:false}]};
  const {container}=render(<SessionTasks timer={timer} minimal act={jest.fn()} />);
  expect(screen.getByText('1 of 3 done · 2 more tasks')).toBeVisible();
  expect(container.querySelector('.session-tasks')).toHaveClass('first-task-done');
  expect(screen.getByRole('textbox',{name:'Session task'})).toHaveValue('Read');
});
