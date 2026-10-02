import { render, screen } from "@testing-library/react";
import TimerCard from "./TimerCard";
import { createInitialState, gameReducer } from "./game";

const NOW = new Date(2026, 9, 2, 12).getTime();
const actOn = (state, type, now = NOW) => gameReducer(state, { type, now });
const renderTimer = (state, now = NOW) => render(<TimerCard state={state} now={now} act={jest.fn()} ready blocked={false}
  onToggleTimer={jest.fn()} openPanel={jest.fn()} setFocusView={jest.fn()} tip={["Stretch", "Take a breath"]} />);

test("Pomodoro displays its two one-minute pauses and a live remaining pause allowance", () => {
  let state = createInitialState(NOW);
  const { rerender } = renderTimer(state);
  expect(screen.getByRole("img", { name: "2 of 2 pauses left, one minute each" })).toBeInTheDocument();
  state = actOn(state, "START");
  state = actOn(state, "PAUSE", NOW + 10000);
  rerender(<TimerCard state={state} now={NOW + 40000} act={jest.fn()} ready onToggleTimer={jest.fn()} />);
  expect(screen.getByRole("timer", { name: "00:30 pause remaining" })).toHaveTextContent("00:30");
  expect(screen.getByRole("img", { name: "1 of 2 pauses left, one minute each" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
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
