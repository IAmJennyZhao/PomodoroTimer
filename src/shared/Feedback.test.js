import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ToastNotice, useNoticeTimeout } from "./Feedback";

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });
const advance = ms => act(() => jest.advanceTimersByTime(ms));

function TimedNotice({ tone = "info" }) {
  const [notice, setNotice] = useState({ id: 1, visible: true, message: "First", tone });
  const [paused, setPaused] = useState(false);
  useNoticeTimeout(notice, paused, setNotice);
  return <><button onClick={() => { setNotice({ id: 2, visible: true, message: "Second", tone }); setPaused(false); }}>Replace</button>
    {notice && <ToastNotice notice={notice} onDismiss={() => setNotice(null)} onPauseChange={setPaused} />}</>;
}

test.each([["info", 3500], ["success", 4500], ["warning", 6500]])("%s notices use a bounded reading budget", (tone, duration) => {
  render(<TimedNotice tone={tone} />);
  advance(duration - 1);
  expect(screen.getByText("First")).toBeInTheDocument();
  advance(1);
  expect(screen.queryByText("First")).not.toBeInTheDocument();
});

test("reading pauses retain the remaining budget and a replacement receives a fresh deadline", () => {
  render(<TimedNotice />);
  advance(2000);
  const first = screen.getByText("First").closest(".toast");
  fireEvent.pointerEnter(first);
  advance(10000);
  expect(screen.getByText("First")).toBeInTheDocument();
  fireEvent.pointerLeave(first);
  advance(1400);
  expect(screen.getByText("First")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Replace" }));
  advance(100);
  expect(screen.getByText("Second")).toBeInTheDocument();
  advance(3399);
  expect(screen.getByText("Second")).toBeInTheDocument();
  advance(1);
  expect(screen.queryByText("Second")).not.toBeInTheDocument();
});

test("an outgoing notice cannot change reading pauses, dismiss again or intercept Escape", () => {
  const pause = jest.fn(), dismiss = jest.fn();
  render(<ToastNotice notice={{ id: 1, message: "Old", visible: true, tone: "info" }} active={false} onPauseChange={pause} onDismiss={dismiss} />);
  const notice = screen.getByText("Old").closest(".toast");
  fireEvent.pointerEnter(notice); fireEvent.pointerLeave(notice);
  fireEvent.focus(notice); fireEvent.blur(notice);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification", hidden: true }));
  fireEvent.keyDown(notice, { key: "Escape" });
  expect(pause).not.toHaveBeenCalled();
  expect(dismiss).not.toHaveBeenCalled();
});

test("Escape dismisses a focused notice and restores a visible timer instead of an inert opener", () => {
  function Harness() {
    const [open, setOpen] = useState(true);
    return <><header inert=""><button autoFocus>Old opener</button></header><section className="timer-card"><button className="pause-button">Pause</button></section>
      {open && <ToastNotice notice={{ id: 1, message: "Saved", visible: true, tone: "info" }} onDismiss={() => setOpen(false)} onPauseChange={() => {}} />}</>;
  }
  render(<Harness />);
  const dismiss = screen.getByRole("button", { name: "Dismiss notification" });
  dismiss.focus(); fireEvent.keyDown(dismiss, { key: "Escape" });
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pause" })).toHaveFocus();
});
