import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import JournalPanel from "./JournalPanel";
import { createInitialState, gameReducer } from "./game";

const NOW = new Date(2026, 9, 1, 15).getTime();
function renderJournal(initial = createInitialState(NOW)) {
  let latest;
  function Harness() {
    const [state, setState] = useState(initial);
    latest = state;
    return <JournalPanel state={state} now={NOW} act={(action) => setState((previous) => gameReducer(previous, { ...action, now: NOW }))} />;
  }
  return { ...render(<Harness />), getState: () => latest };
}

test("overview period controls update totals, average, active days, chart, and recent sessions together", () => {
  const initial = createInitialState(NOW);
  initial.history = [
    { id: "earlier", task: "Yesterday's work", minutes: 15, completedAt: new Date(2026, 8, 30, 12).getTime() },
    { id: "today", task: "Today's work", minutes: 25, completedAt: NOW },
  ];
  renderJournal(initial);
  let summary = within(screen.getByLabelText("Focus summary"));
  expect(summary.getAllByText("25m")).toHaveLength(2);
  expect(summary.getByText("1 / 1")).toBeInTheDocument();
  expect(screen.getByText("Today's work")).toBeInTheDocument();
  expect(screen.queryByText("Yesterday's work")).not.toBeInTheDocument();
  expect(screen.getByLabelText("15:00: 25 focus minutes, 1 session")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "7 days" }));
  summary = within(screen.getByLabelText("Focus summary"));
  expect(summary.getByText("40m")).toBeInTheDocument();
  expect(summary.getByText("20m")).toBeInTheDocument();
  expect(summary.getByText("2 / 7")).toBeInTheDocument();
  expect(screen.getByText("Yesterday's work")).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Daily focus, focus minutes" }).children).toHaveLength(7);
  fireEvent.click(screen.getByRole("button", { name: "30 days" }));
  expect(screen.getByRole("list", { name: "Daily focus, focus minutes" }).children).toHaveLength(30);
});

test("daily goal remains today's goal across analytics periods and can be adjusted", () => {
  const initial = createInitialState(NOW);
  initial.history = [{ id: "earlier", task: "Old work", minutes: 25, completedAt: NOW - 86400000 }];
  const { getState } = renderJournal(initial);
  fireEvent.click(screen.getByRole("button", { name: "7 days" }));
  expect(screen.getByRole("progressbar", { name: "Daily focus goal" })).toHaveAttribute("value", "0");
  fireEvent.click(screen.getByRole("button", { name: "Decrease daily goal" }));
  expect(getState().settings.dailyGoal).toBe(3);
  fireEvent.click(screen.getByRole("button", { name: "Increase daily goal" }));
  expect(getState().settings.dailyGoal).toBe(4);
});

test("monthly chart spaces concise date labels and keeps complete accessible dates", () => {
  renderJournal();
  fireEvent.click(screen.getByRole("button", { name: "30 days" }));
  const chart = screen.getByRole("list", { name: "Daily focus, focus minutes" });
  const visibleLabels = within(chart).getAllByRole("listitem").map((item) => item.textContent).filter(Boolean);
  const label = (month, day) => new Date(2026, month - 1, day).toLocaleDateString([], { month: "numeric", day: "numeric" });
  expect(visibleLabels).toEqual([label(9, 2), label(9, 9), label(9, 16), label(9, 23), label(10, 1)]);
  const fullDate = new Date(2026, 9, 1).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  expect(within(chart).getByLabelText(`${fullDate}: 0 focus minutes, 0 sessions`)).toBeInTheDocument();
});

test("history includes older records and loads more without losing entries", () => {
  const initial = createInitialState(NOW);
  initial.history = Array.from({ length: 25 }, (_, index) => ({ id: `session-${index}`, task: `Work ${index}`, minutes: 25, completedAt: NOW - index * 86400000 }));
  renderJournal(initial);
  fireEvent.click(screen.getByRole("button", { name: "History" }));
  expect(screen.getByText("Work 0")).toBeInTheDocument();
  expect(screen.queryByText("Work 24")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(screen.getByText("Work 24")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
});

test("scratchpad saves edits while details stay behind its info control", () => {
  const { getState } = renderJournal();
  fireEvent.click(screen.getByRole("button", { name: "Scratchpad" }));
  expect(screen.queryByText(/Saved on this computer/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), { target: { value: "Remember this after focus." } });
  expect(getState().scratchpad).toBe("Remember this after focus.");
  fireEvent.click(screen.getByRole("button", { name: "About scratchpad" }));
  expect(screen.getByText(/Saved on this computer/)).toBeVisible();
});

test("journal shows multiple tasks, session tags and tag statistics for the selected period", () => {
  const initial = createInitialState(NOW);
  initial.history = [
    { id: "today", task: "Chemistry", tasks: [{ id: "a", text: "Read chapter", done: true }, { id: "b", text: "Practice problems", done: false }], tags: ["Chemistry", "Study"], minutes: 25, completedAt: NOW, rewardForfeited: true },
    { id: "yesterday", task: "Lab report", tags: ["Chemistry"], minutes: 15, completedAt: NOW - 86400000 },
    { id: "legacy", task: "Old task", minutes: 10, completedAt: NOW },
  ];
  renderJournal(initial);
  expect(screen.getByText("Read chapter · Practice problems")).toBeInTheDocument();
  expect(screen.getByText("1 of 2 tasks done")).toBeInTheDocument();
  expect(screen.getByText("Session Shilligems forfeited")).toBeInTheDocument();
  const tags = within(screen.getByRole("region", { name: "Focus by tag" }));
  expect(tags.getByLabelText("Chemistry: 25 focus minutes, 1 session")).toBeInTheDocument();
  expect(tags.getByLabelText("Study: 25 focus minutes, 1 session")).toBeInTheDocument();
  expect(tags.getByLabelText("Untagged: 10 focus minutes, 1 session")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "7 days" }));
  expect(tags.getByLabelText("Chemistry: 40 focus minutes, 2 sessions")).toHaveTextContent("20m average");
  fireEvent.click(tags.getByRole("button", { name: "About tag statistics" }));
  expect(screen.getByText(/tag totals can overlap/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "History" }));
  expect(screen.getByText("Read chapter · Practice problems")).toBeInTheDocument();
  expect(screen.getAllByLabelText("Session tags")).toHaveLength(2);
});
