import { fireEvent, render, screen } from "@testing-library/react";
import { useOutcomeFeedback, OutcomeFeedbackContext } from "./OutcomeFeedback";
import { RoomVisual, usePetResponses } from "./RoomInteraction";
import { MotionPreferenceContext } from "./useReducedMotion";

const originalAnimate = HTMLElement.prototype.animate;
beforeEach(() => { HTMLElement.prototype.animate = jest.fn(() => ({ cancel: jest.fn() })); });
afterEach(() => { HTMLElement.prototype.animate = originalAnimate; jest.useRealTimers(); });

function Pet({ enabled = true, reduced = false }) {
  const [feedback, show] = useOutcomeFeedback();
  const respond = usePetResponses(show, enabled);
  return <MotionPreferenceContext.Provider value={reduced}><OutcomeFeedbackContext.Provider value={feedback}>
    <button onClick={() => respond("miso")}>Miso</button>
    <RoomVisual target="animal:miso">Cat art</RoomVisual>
  </OutcomeFeedbackContext.Provider></MotionPreferenceContext.Provider>;
}

test("direct pet responses are limited per pet and never start a repeating animation", () => {
  jest.useFakeTimers();
  jest.setSystemTime(10000);
  render(<Pet />);
  fireEvent.click(screen.getByRole("button"));
  expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(1);
  expect(HTMLElement.prototype.animate.mock.calls[0][1].duration).toBe(480);
  fireEvent.click(screen.getByRole("button"));
  expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(1);
  jest.setSystemTime(12500);
  fireEvent.click(screen.getByRole("button"));
  expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(2);
});

test("focus/arrangement suppression and reduced motion prevent pet gestures", () => {
  const view = render(<Pet enabled={false} />);
  fireEvent.click(screen.getByRole("button"));
  expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
  view.rerender(<Pet reduced />);
  fireEvent.click(screen.getByRole("button"));
  expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
});

test("enabling motion after a muted visual response never replays that response", () => {
  const view = render(<Pet reduced />);
  fireEvent.click(screen.getByRole("button"));
  expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
  view.rerender(<Pet />);
  expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
});
