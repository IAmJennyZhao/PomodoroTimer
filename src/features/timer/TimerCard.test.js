import { fireEvent, render, screen } from "@testing-library/react";
import TimerCard from "./TimerCard";
import { createInitialState, gameReducer } from "../../domain/game";

const NOW = new Date(2026, 9, 2, 12).getTime();
const actOn = (state, type, now = NOW) => gameReducer(state, { type, now });
const renderTimer = (state, now = NOW) => render(<TimerCard state={state} now={now} act={jest.fn()} ready blocked={false}
  onToggleTimer={jest.fn()} openPanel={jest.fn()} setFocusView={jest.fn()} />);

test("pause counts stay in the small Pause button and the pause clock remains live", () => {
  let state = createInitialState(NOW);
  const { rerender } = renderTimer(state);
  const settings = screen.getByRole("button", { name: "Session settings" });
  expect(settings).toHaveTextContent(/^$/);
  expect(settings.querySelector(".icon-sliders")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Focus timer" }).querySelectorAll(".icon-info")).toHaveLength(1);
  expect(screen.queryByRole("img", { name: /pauses left/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reset timer" })).not.toBeInTheDocument();
  expect(screen.queryByText("Pomodoro")).not.toBeInTheDocument();
  state = actOn(state, "START");
  rerender(<TimerCard state={state} now={NOW} act={jest.fn()} ready onToggleTimer={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Pause (2/2)" })).toBeEnabled();
  expect(screen.getByRole("region", { name: "Focus timer" }).querySelectorAll(".icon-info")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Abandon session" })).toBeEnabled();
  state = actOn(state, "PAUSE", NOW + 10000);
  rerender(<TimerCard state={state} now={NOW + 40000} act={jest.fn()} ready onToggleTimer={jest.fn()} />);
  expect(screen.getByRole("timer", { name: "00:30 pause remaining" })).toHaveTextContent("00:30");
  expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
  expect(screen.getByRole("region", { name: "Focus timer" }).querySelectorAll(".icon-info")).toHaveLength(1);
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
  expect(screen.getByRole("region", { name: "Focus timer" }).querySelectorAll(".icon-info")).toHaveLength(1);
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
  expect(screen.queryByText("Session complete")).not.toBeInTheDocument();
  expect(screen.getByRole("button", {name:"Reset timer"})).toBeEnabled();
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
  expect(screen.getByLabelText("Session result")).toHaveTextContent("+025 min");
});

test('pause consequences are visible before starting and before an unrewarded third pause', () => {
  let state=createInitialState(NOW);
  const {rerender}=renderTimer(state);
  expect(screen.queryByText(/Exceed either limit/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Session info"}));
  expect(screen.getByText(/Exceed either limit/)).toBeVisible();
  expect(screen.getByRole("note", {name:"Session info"}).querySelectorAll(".info-body > p")).toHaveLength(3);
  state=actOn(state,'START');
  for(let i=0;i<2;i++) {state=actOn(state,'PAUSE',NOW+i*2000);state=actOn(state,'START',NOW+i*2000+1000);}
  const toggle=jest.fn();
  rerender(<TimerCard state={state} now={NOW+5000} ready act={jest.fn()} onToggleTimer={toggle} />);
  const pause=screen.getByRole('button',{name:'Pause · lose gems'});
  expect(pause).toHaveTextContent("lose gems");
  fireEvent.click(pause);
  expect(toggle).toHaveBeenCalledTimes(1);
});

test('pausing and reward loss keep the remaining focus time in view',()=>{
  let state=actOn(createInitialState(NOW),'START');
  state=actOn(state,'PAUSE',NOW+10000);
  const {rerender}=renderTimer(state,NOW+20000);
  expect(screen.getByText('Focus remaining: 24:50')).toBeVisible();
  state=actOn(state,'TICK',NOW+71000);
  rerender(<TimerCard state={state} now={NOW+71000} ready act={jest.fn()} onToggleTimer={jest.fn()} />);
  expect(screen.getByText('Focus remaining: 24:50')).toBeVisible();
  expect(screen.getByText(/focus minutes and egg progress are kept/)).toBeVisible();
});

test('finish is visibly labeled, blocked saves disable it, and overtime has no misleading abandon action',()=>{
  let state=gameReducer(createInitialState(NOW),{type:'SET_SETTINGS',settings:{workMode:'countup'},now:NOW});
  state=actOn(state,'START');
  const {rerender}=renderTimer(state);
  expect(screen.getByRole('button',{name:'Finish session'})).toHaveTextContent('Finish session');
  expect(screen.getByRole('button',{name:'Abandon session'})).toHaveTextContent('Hold 5s');
  rerender(<TimerCard state={state} now={NOW} ready blocked act={jest.fn()} />);
  expect(screen.getByRole('button',{name:'Finish session'})).toBeDisabled();
  state=gameReducer(createInitialState(NOW),{type:'SET_SETTINGS',settings:{focusMinutes:1,endBehavior:'overtime'},now:NOW});
  state=actOn(actOn(state,'START'),'TICK',NOW+60000);
  rerender(<TimerCard state={state} now={NOW+70000} ready act={jest.fn()} />);
  expect(screen.queryByRole('button',{name:'Abandon session'})).not.toBeInTheDocument();
  expect(screen.getByText("1 gems pending")).toBeVisible();
  state=actOn(state,'FINISH_FOCUS',NOW+70000);
  rerender(<TimerCard state={state} now={NOW+70000} ready act={jest.fn()} />);
  expect(screen.getByLabelText("Session result")).toHaveTextContent("+11 min");
});

test('break controls start a new focus session or cancel without explanatory copy', () => {
  let state = actOn(createInitialState(NOW),'START');
  state.timer.cycle = 3;
  state = actOn(state,'TICK',NOW+25*60000);
  state = gameReducer(state,{type:'START_BREAK',now:NOW+25*60000});
  const act = jest.fn();
  render(<TimerCard state={state} now={NOW+25*60000} ready act={act} />);
  expect(screen.getByRole('timer')).toHaveTextContent('15:00');
  expect(screen.queryByText(/recommended/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Open nest'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Start new session'}));
  expect(act.mock.calls.map(([action])=>action)).toEqual([{type:'SET_MODE',mode:'focus'},{type:'START'}]);
  act.mockClear();
  fireEvent.click(screen.getByRole('button',{name:'Cancel break'}));
  expect(act).toHaveBeenCalledWith({type:'SET_MODE',mode:'focus'});
});
