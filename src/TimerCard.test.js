import { render, screen } from "@testing-library/react";
import TimerCard from "./TimerCard";
import { createInitialState, gameReducer } from "./game";

const NOW = new Date(2026, 9, 2, 12).getTime();
const actOn = (state, type, now = NOW) => gameReducer(state, { type, now });
const renderTimer = (state, now = NOW) => render(<TimerCard state={state} now={now} act={jest.fn()} ready blocked={false}
  onToggleTimer={jest.fn()} openPanel={jest.fn()} setFocusView={jest.fn()} tip={["Stretch", "Take a breath"]} />);

test("pause counts stay in the small Pause button and the pause clock remains live", () => {
  let state = createInitialState(NOW);
  const { rerender } = renderTimer(state);
  expect(screen.queryByRole("img", { name: /pauses left/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reset timer" })).not.toBeInTheDocument();
  expect(screen.queryByText("Pomodoro")).not.toBeInTheDocument();
  state = actOn(state, "START");
  rerender(<TimerCard state={state} now={NOW} act={jest.fn()} ready onToggleTimer={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Pause (2/2)" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Stop session" })).toBeEnabled();
  state = actOn(state, "PAUSE", NOW + 10000);
  rerender(<TimerCard state={state} now={NOW + 40000} act={jest.fn()} ready onToggleTimer={jest.fn()} />);
  expect(screen.getByRole("timer", { name: "00:30 pause remaining" })).toHaveTextContent("00:30");
  expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
  state = actOn(state, "START", NOW + 40000);
  rerender(<TimerCard state={state} now={NOW + 40000} act={jest.fn()} ready onToggleTimer={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Pause (1/2)" })).toBeEnabled();
});

test("forfeited Pomodoro rewards clearly show zero without hiding session controls", () => {
  let state = actOn(createInitialState(NOW), "START");
  state = actOn(state, "PAUSE", NOW + 10000);
  state = actOn(state, "TICK", NOW + 71000);
  renderTimer(state, NOW + 71000);
  expect(screen.getByRole("alert")).toHaveTextContent("Pause endedSession gems lost");
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("0 Shilligems this session")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Pomodoro pause allowance")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Resume" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
});

test("count-up sessions have no Pomodoro pause budget", () => {
  const state = gameReducer(createInitialState(NOW), { type: "SET_SETTINGS", settings: { workMode: "countup" }, now: NOW });
  renderTimer(state);
  expect(screen.queryByLabelText("Pomodoro pause allowance")).not.toBeInTheDocument();
});

test("projected rewards include maxed-pet bonuses without floating-point rounding losses", () => {
  const state = gameReducer(createInitialState(NOW), { type: "SET_SETTINGS", settings: { focusMinutes: 45 }, now: NOW });
  state.animals = Array.from({ length: 4 }, (_, index) => ({ ...state.animals[0], id: `pet-${index}`, upgrades: 6 }));
  renderTimer(state);
  expect(screen.getByText("+63")).toBeInTheDocument();
});

test("the third pause names the limit instead of claiming its time expired", () => {
  let state = actOn(createInitialState(NOW), "START");
  for (let index = 0; index < 2; index += 1) {
    state = actOn(state, "PAUSE", NOW + index * 2000);
    state = actOn(state, "START", NOW + index * 2000 + 1000);
  }
  state = actOn(state, "PAUSE", NOW + 5000);
  renderTimer(state, NOW + 5000);
  expect(screen.getByRole("alert")).toHaveTextContent("Pause limit reached");
  expect(screen.getByRole("button", { name: "Resume" })).toHaveFocus();
});

test("completed sessions retain the recorded reward after preferences change", () => {
  let state = actOn(createInitialState(NOW), "START");
  state = actOn(state, "TICK", NOW + 25 * 60000);
  state = gameReducer(state, { type: "SET_SETTINGS", settings: { focusMinutes: 50 }, now: NOW + 25 * 60000 });
  renderTimer(state, NOW + 25 * 60000);
  expect(screen.getByLabelText("Session result")).toHaveTextContent("+2525 min");
  expect(screen.getByLabelText("25 Shilligems earned")).toBeInTheDocument();
  expect(screen.queryByText("What are you working on?")).not.toBeInTheDocument();
  expect(screen.getByText("Session complete")).toBeInTheDocument();
});

test("a forfeited completion keeps its recorded minutes and zero reward", () => {
  let state = actOn(createInitialState(NOW), "START");
  state = actOn(state, "PAUSE", NOW + 10000);
  state = actOn(state, "TICK", NOW + 71000);
  state = actOn(state, "START", NOW + 71000);
  state = actOn(state, "TICK", NOW + 27 * 60000);
  renderTimer(state, NOW + 27 * 60000);
  expect(screen.getByLabelText("0 Shilligems earned")).toBeInTheDocument();
  expect(screen.getByLabelText("Session result")).toHaveTextContent("25 min");
});
