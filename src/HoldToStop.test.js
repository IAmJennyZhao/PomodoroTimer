import { act, fireEvent, render, screen } from "@testing-library/react";
import HoldToStop from "./HoldToStop";

const originalPointerEvent = window.PointerEvent;
beforeEach(() => { jest.useFakeTimers(); window.PointerEvent = MouseEvent; });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); window.PointerEvent = originalPointerEvent; });
const advance = ms => act(() => jest.advanceTimersByTime(ms));
const setup = () => {
  const onStop = jest.fn();
  const view = render(<HoldToStop onStop={onStop} />);
  return { ...view, onStop, button: screen.getByRole("button", { name: "Stop session" }) };
};

test("a click or early release cannot stop; a fresh continuous hold stops once at five seconds", () => {
  const { button, onStop } = setup();
  fireEvent.click(button);
  advance(6000);
  expect(onStop).not.toHaveBeenCalled();
  fireEvent.pointerDown(button, { button: 0 });
  advance(4900);
  expect(onStop).not.toHaveBeenCalled();
  fireEvent.pointerUp(button);
  advance(1000);
  expect(onStop).not.toHaveBeenCalled();
  fireEvent.pointerDown(button, { button: 0 });
  advance(4999);
  expect(onStop).not.toHaveBeenCalled();
  advance(1);
  expect(onStop).toHaveBeenCalledTimes(1);
  fireEvent.pointerUp(button);
  advance(5000);
  expect(onStop).toHaveBeenCalledTimes(1);
});

test.each([" ", "Enter"])("keyboard hold with %s requires five seconds and ignores auto-repeat", key => {
  const { button, onStop } = setup();
  fireEvent.keyDown(button, { key });
  advance(2500);
  fireEvent.keyDown(button, { key, repeat: true });
  fireEvent.keyUp(button, { key });
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
  fireEvent.keyDown(button, { key });
  advance(5000);
  expect(onStop).toHaveBeenCalledTimes(1);
});

test.each(["pointerCancel", "blur", "lostPointerCapture"])("%s cancels an in-progress pointer hold", type => {
  const { button, onStop } = setup();
  fireEvent.pointerDown(button, { button: 0 });
  advance(3000);
  fireEvent[type](button);
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
});

test("leaving the button, leaving the tab, or losing the window cancels the hold", () => {
  const { button, onStop } = setup();
  const original = window.PointerEvent;
  window.PointerEvent = MouseEvent;
  jest.spyOn(button, "getBoundingClientRect").mockReturnValue({ left: 10, right: 110, top: 10, bottom: 50 });
  fireEvent.pointerDown(button, { button: 0 });
  advance(2000);
  fireEvent.pointerMove(button, { clientX: 120, clientY: 20 });
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
  window.PointerEvent = original;
  fireEvent.keyDown(button, { key: " " });
  advance(2000);
  jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
  fireEvent.keyDown(button, { key: " " });
  advance(2000);
  fireEvent(window, new Event("blur"));
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
});

test("disabled state and unmount prevent pending holds from firing", () => {
  const { button, onStop, rerender, unmount } = setup();
  fireEvent.pointerDown(button, { button: 0 });
  advance(3000);
  rerender(<HoldToStop onStop={onStop} disabled />);
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
  rerender(<HoldToStop onStop={onStop} />);
  fireEvent.keyDown(button, { key: "Enter" });
  advance(3000);
  unmount();
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
});

test("cancellation gives brief feedback, and a fresh hold resets progress and its five-second deadline", () => {
  const { button, onStop } = setup();
  fireEvent.keyDown(button, { key: "Enter" });
  expect(button).toHaveAttribute("data-hold", "holding");
  advance(2000);
  fireEvent.keyUp(button, { key: "Enter" });
  expect(button).toHaveAttribute("data-hold", "cancelled");
  expect(button.style.getPropertyValue("--hold-cancel-fraction")).toBe("0.4");
  expect(screen.getByRole("status")).toHaveTextContent("Stop cancelled");
  advance(100);
  fireEvent.keyDown(button, { key: "Enter" });
  expect(button).toHaveAttribute("data-hold", "holding");
  expect(button.style.getPropertyValue("--hold-fraction")).toBe("0");
  advance(4999);
  expect(button).toHaveAttribute("data-hold", "holding");
  expect(onStop).not.toHaveBeenCalled();
  advance(1);
  expect(onStop).toHaveBeenCalledTimes(1);
});

test("Escape cancels a keyboard hold and the feedback clears without a late stop", () => {
  const { button, onStop } = setup();
  fireEvent.keyDown(button, { key: " " });
  advance(2400);
  fireEvent.keyDown(button, { key: "Escape" });
  expect(button).toHaveAttribute("data-hold", "cancelled");
  advance(400);
  expect(button).toHaveAttribute("data-hold", "idle");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  advance(5000);
  expect(onStop).not.toHaveBeenCalled();
});
