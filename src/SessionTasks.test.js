import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SessionTasks from "./SessionTasks";
import { createInitialState, gameReducer } from "./game";

const NOW = new Date(2026, 9, 2, 12).getTime();

function renderTasks(initial = createInitialState(NOW), compact = false) {
  let latest;
  function Harness() {
    const [state, setState] = useState(initial);
    latest = state;
    return <SessionTasks timer={state.timer} history={state.history} compact={compact}
      act={(action) => setState((previous) => gameReducer(previous, { ...action, now: NOW }))} />;
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
