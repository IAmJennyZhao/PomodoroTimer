import React, { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Presence, useSurfaceTransition, exitProps } from "./Transitions";
import { MotionPreferenceContext } from "./useReducedMotion";

const originalAnimate = HTMLElement.prototype.animate;
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers(); jest.restoreAllMocks();
  if (originalAnimate) HTMLElement.prototype.animate = originalAnimate;
  else delete HTMLElement.prototype.animate;
});
const advance = ms => act(() => jest.advanceTimersByTime(ms));
const surfaces = value => <Presence value={value}>{(name, active) => <div {...exitProps(active)} data-testid={name}>{name}</div>}</Presence>;

test("close keeps the last surface inert for 200ms, with no animation-event dependency", () => {
  const { rerender } = render(surfaces("A"));
  const old = screen.getByTestId("A");
  rerender(surfaces(null));
  expect(old).toHaveAttribute("inert");
  expect(old).toHaveAttribute("aria-hidden", "true");
  advance(199);
  expect(old).toBeInTheDocument();
  advance(1);
  expect(old).not.toBeInTheDocument();
});

test("reopening reverses the same surface and an old deadline cannot remove it", () => {
  const { rerender } = render(surfaces("A"));
  const original = screen.getByTestId("A");
  rerender(surfaces(null));
  advance(80);
  rerender(surfaces("A"));
  expect(screen.getByTestId("A")).toBe(original);
  expect(original).not.toHaveAttribute("inert");
  advance(500);
  expect(original).toBeInTheDocument();
});

test("rapid switching bounds retained surfaces and settles on the latest request", () => {
  const { rerender } = render(surfaces("A"));
  rerender(surfaces("B"));
  advance(80);
  rerender(surfaces("C"));
  expect(screen.queryByTestId("A")).not.toBeInTheDocument();
  expect(screen.getByTestId("B")).toHaveAttribute("inert");
  expect(screen.getByTestId("C")).not.toHaveAttribute("inert");
  advance(120);
  expect(screen.getByTestId("B")).toBeInTheDocument();
  advance(80);
  expect(screen.queryByTestId("B")).not.toBeInTheDocument();
  expect(screen.getByTestId("C")).toBeInTheDocument();
});

test("switching to reduced motion immediately retires a pending exit", () => {
  const tree = (value, reduced) => <MotionPreferenceContext.Provider value={reduced}>{surfaces(value)}</MotionPreferenceContext.Provider>;
  const { rerender } = render(tree("A", false));
  rerender(tree(null, false));
  expect(screen.getByTestId("A")).toHaveAttribute("inert");
  rerender(tree(null, true));
  expect(screen.queryByTestId("A")).not.toBeInTheDocument();
  advance(500);
  expect(screen.queryByTestId("A")).not.toBeInTheDocument();
});

test("inactive surfaces block descendants' action, edit and keyboard handlers", () => {
  const action = jest.fn();
  const edit = jest.fn();
  const key = jest.fn();
  render(<div {...exitProps(false)}><button onClick={action} onKeyDown={key}>Old action</button><input aria-label="Old edit" onChange={edit} /></div>);
  fireEvent.click(screen.getByText("Old action"));
  fireEvent.keyDown(screen.getByText("Old action"), { key: "Enter" });
  fireEvent.change(screen.getByLabelText("Old edit"), { target: { value: "late" } });
  expect(action).not.toHaveBeenCalled();
  expect(edit).not.toHaveBeenCalled();
  expect(key).not.toHaveBeenCalled();
});

test("surface reversal samples the interrupted frame and cancels native animations on unmount", () => {
  const motions = [];
  HTMLElement.prototype.animate = jest.fn(() => {
    const motion = { cancel: jest.fn(), finished: new Promise(() => {}) };
    motions.push(motion);
    return motion;
  });
  jest.spyOn(window, "getComputedStyle").mockReturnValue({ opacity: "0.43", translate: "0px 3px" });
  function Surface({ active }) {
    const ref = useRef(null);
    useSurfaceTransition(ref, active);
    return <div ref={ref} {...exitProps(active)} />;
  }
  const { rerender, unmount } = render(<Surface active />);
  rerender(<Surface active={false} />);
  expect(motions[0].cancel).toHaveBeenCalled();
  expect(HTMLElement.prototype.animate.mock.calls[1][0][0]).toEqual({ opacity: "0.43", translate: "0px 3px" });
  rerender(<Surface active />);
  expect(motions[1].cancel).toHaveBeenCalled();
  unmount();
  expect(motions[2].cancel).toHaveBeenCalled();
});
