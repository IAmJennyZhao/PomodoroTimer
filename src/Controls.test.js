import React, { createRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Button, ChoiceInput, ControlFeedbackContext } from "./Controls";

const originalPointerEvent = window.PointerEvent;
beforeEach(() => { jest.useFakeTimers(); window.PointerEvent = MouseEvent; });
afterEach(() => { jest.useRealTimers(); window.PointerEvent = originalPointerEvent; });

function setup(props = {}) {
  const feedback = jest.fn();
  const onClick = jest.fn();
  const view = render(<ControlFeedbackContext.Provider value={feedback}><Button onClick={onClick} {...props}>Action</Button></ControlFeedbackContext.Provider>);
  return { ...view, feedback, onClick, button: screen.getByRole("button", { name: "Action" }) };
}

test("pointer feedback is immediate, hover is silent, and activation runs once without waiting for animation", () => {
  const { button, onClick, feedback } = setup();
  fireEvent.pointerEnter(button);
  expect(feedback).not.toHaveBeenCalled();
  fireEvent.pointerDown(button, { button: 0 });
  expect(button).toHaveAttribute("data-pressed", "true");
  expect(onClick).not.toHaveBeenCalled();
  fireEvent.pointerUp(button);
  expect(button).not.toHaveAttribute("data-pressed");
  fireEvent.click(button, { detail: 1 });
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(feedback).toHaveBeenCalledWith("tap");
});

test.each(["Enter", " "])("%s keeps native activation and clears on release without an extra pulse", key => {
  const { button, onClick, feedback } = setup();
  button.focus();
  fireEvent.keyDown(button, { key });
  expect(button).toHaveAttribute("data-pressed", "true");
  if (key === " ") fireEvent.keyUp(button, { key });
  // JSDOM does not generate the browser's native keyboard click.
  fireEvent.click(button, { detail: 0 });
  if (key === "Enter") fireEvent.keyUp(button, { key });
  expect(button).not.toHaveAttribute("data-pressed");
  expect(document.activeElement).toBe(button);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(feedback).toHaveBeenCalledTimes(1);
});

test("keyboard auto-repeat is prevented and assistive clicks get a short pulse", () => {
  const { button, onClick } = setup();
  fireEvent.keyDown(button, { key: "Enter" });
  expect(fireEvent.keyDown(button, { key: "Enter", repeat: true })).toBe(false);
  fireEvent.blur(button);
  fireEvent.click(button, { detail: 0 });
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(button).toHaveAttribute("data-pressed", "true");
  act(() => jest.advanceTimersByTime(100));
  expect(button).not.toHaveAttribute("data-pressed");
});

test.each(["pointerCancel", "pointerLeave", "blur", "lostPointerCapture"])("%s clears press feedback without activating", event => {
  const { button, onClick, feedback } = setup();
  fireEvent.pointerDown(button, { button: 0 });
  fireEvent[event](button);
  expect(button).not.toHaveAttribute("data-pressed");
  expect(onClick).not.toHaveBeenCalled();
  expect(feedback).not.toHaveBeenCalled();
});

test("an outside release, tab switch, and lost window focus cannot leave a stuck press", () => {
  const { button } = setup();
  fireEvent.pointerDown(button, { button: 0 });
  fireEvent.pointerUp(document.body);
  expect(button).not.toHaveAttribute("data-pressed");
  fireEvent.keyDown(button, { key: " " });
  fireEvent(window, new Event("blur"));
  expect(button).not.toHaveAttribute("data-pressed");
  fireEvent.keyDown(button, { key: " " });
  const visibility = jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  expect(button).not.toHaveAttribute("data-pressed");
  visibility.mockRestore();
});

test("disabled, aria-disabled, and inert controls have no activation or feedback", () => {
  const { button, feedback, onClick, rerender } = setup({ disabled: true });
  fireEvent.pointerDown(button, { button: 0 });
  fireEvent.click(button);
  expect(button).not.toHaveAttribute("data-pressed");
  expect(feedback).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  rerender(<ControlFeedbackContext.Provider value={feedback}><Button aria-disabled onClick={onClick}>Action</Button></ControlFeedbackContext.Provider>);
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
  rerender(<ControlFeedbackContext.Provider value={feedback}><div inert=""><Button onClick={onClick}>Action</Button></div></ControlFeedbackContext.Provider>);
  fireEvent.click(screen.getByRole("button", { name: "Action" }));
  expect(onClick).not.toHaveBeenCalled();
  expect(feedback).not.toHaveBeenCalled();
});

test("an interrupted press clears when disabled and callbacks/ref preserve native focus", () => {
  const ref = createRef();
  const { button, feedback, rerender } = setup({ ref });
  button.focus();
  fireEvent.pointerDown(button, { button: 0 });
  rerender(<ControlFeedbackContext.Provider value={feedback}><Button ref={ref} disabled>Action</Button></ControlFeedbackContext.Provider>);
  expect(ref.current).toBe(button);
  expect(button).not.toHaveAttribute("data-pressed");
});

test("selection controls get a tick and explicit preview ownership avoids duplicate sound", () => {
  const { button, feedback, rerender } = setup({ "aria-pressed": false });
  fireEvent.click(button);
  expect(feedback).toHaveBeenCalledWith("selection");
  rerender(<ControlFeedbackContext.Provider value={feedback}><Button sound={null}>Action</Button></ControlFeedbackContext.Provider>);
  feedback.mockClear();
  fireEvent.click(button);
  expect(feedback).not.toHaveBeenCalled();
});

test("choices update immediately and keep their focus and keyboard feedback", () => {
  const feedback = jest.fn();
  function Harness() {
    const [checked, setChecked] = useState(false);
    return <ChoiceInput type="checkbox" aria-label="Preference" checked={checked} onChange={event => setChecked(event.target.checked)} />;
  }
  render(<ControlFeedbackContext.Provider value={feedback}><Harness /></ControlFeedbackContext.Provider>);
  const choice = screen.getByRole("checkbox");
  choice.focus();
  fireEvent.keyDown(choice, { key: " " });
  expect(choice).toHaveAttribute("data-pressed", "true");
  fireEvent.keyUp(choice, { key: " " });
  fireEvent.click(choice);
  expect(choice).toBeChecked();
  expect(document.activeElement).toBe(choice);
  expect(feedback).toHaveBeenCalledWith("selection");
});

test("prevented actions and disabled choices stay silent", () => {
  const { button, feedback } = setup({ onClick: event => event.preventDefault() });
  fireEvent.click(button);
  expect(feedback).not.toHaveBeenCalled();
  render(<ControlFeedbackContext.Provider value={feedback}><ChoiceInput type="checkbox" disabled aria-label="Locked" /></ControlFeedbackContext.Provider>);
  const choice = screen.getByRole("checkbox", { name: "Locked" });
  fireEvent.pointerDown(choice, { button: 0 });
  fireEvent.click(choice);
  expect(choice).not.toHaveAttribute("data-pressed");
  expect(feedback).not.toHaveBeenCalled();
});
