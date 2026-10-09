import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import usePlacementGesture from "./usePlacementGesture";

const originalPointerEvent = window.PointerEvent;
beforeEach(() => {
  window.PointerEvent = class extends MouseEvent {
    constructor(type, options) { super(type, options); this.pointerId = options.pointerId ?? 1; }
  };
});
afterEach(() => { window.PointerEvent = originalPointerEvent; });

function Surface({ commit, cancel, enabled = true }) {
  const [saved, setSaved] = useState(100);
  const gesture = usePlacementGesture({ enabled,
    project: (origin, event) => ({ x: origin.x + event.clientX - origin.pointerX }),
    commit: next => { setSaved(next.x); commit(next.x); },
    onCancel: cancel,
  });
  return <button {...gesture.handlers} onPointerDown={event => gesture.start(event, { x: saved })}>{gesture.draft?.x ?? saved}</button>;
}

test("a batched move/release commits the latest pointer draft, and later capture loss cannot undo it", () => {
  const commit = jest.fn(), cancel = jest.fn();
  render(<Surface commit={commit} cancel={cancel} />);
  const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0, pointerId: 4, clientX: 20 });
  act(() => {
    fireEvent.pointerMove(button, { pointerId: 4, clientX: 70 });
    fireEvent.pointerMove(button, { pointerId: 4, clientX: 90 });
    fireEvent.pointerUp(button, { pointerId: 4 });
  });
  expect(commit.mock.calls).toEqual([[170]]);
  fireEvent.lostPointerCapture(button, { pointerId: 4 });
  expect(cancel).not.toHaveBeenCalled();
  expect(button).toHaveTextContent("170");
});

test("foreign pointer movement and release cannot move or terminate the active gesture", () => {
  const commit = jest.fn(), cancel = jest.fn();
  render(<Surface commit={commit} cancel={cancel} />);
  const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0, pointerId: 4, clientX: 20 });
  fireEvent.pointerMove(button, { pointerId: 9, clientX: 500 });
  fireEvent.pointerUp(button, { pointerId: 9 });
  fireEvent.pointerCancel(button, { pointerId: 9 });
  expect(button).toHaveTextContent("100");
  fireEvent.pointerMove(button, { pointerId: 4, clientX: 60 });
  fireEvent.pointerUp(button, { pointerId: 4 });
  expect(commit.mock.calls).toEqual([[140]]);
  expect(cancel).not.toHaveBeenCalled();
});

test("disabling a gesture restores its origin, and unmount never commits a draft", () => {
  const commit = jest.fn(), cancel = jest.fn();
  const view = render(<Surface commit={commit} cancel={cancel} />);
  const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0, clientX: 20 });
  fireEvent.pointerMove(button, { clientX: 60 });
  view.rerender(<Surface commit={commit} cancel={cancel} enabled={false} />);
  expect(button).toHaveTextContent("100");
  fireEvent.pointerUp(button);
  expect(commit).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledTimes(1);
  view.rerender(<Surface commit={commit} cancel={cancel} />);
  fireEvent.pointerDown(button, { button: 0, clientX: 20 });
  fireEvent.pointerMove(button, { clientX: 60 });
  view.unmount();
  fireEvent(window, new Event("blur"));
  expect(commit).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledTimes(1);
});
