import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AnimalArt, clampNotepadPosition, Drawer } from "./ui";
import DecoratePanel from "./DecoratePanel";
import { createInitialState } from "./game";

test("notepad moves with keyboard, saves its position, and stays visible on resize", () => {
  const rect = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 100, top: 100, width: 320, height: 340 });
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  const onMove = jest.fn();
  render(<Drawer name="notes" position={{ x: .1, y: .1 }} onMove={onMove} onClose={() => {}}><textarea aria-label="Notes" /></Drawer>);
  const handle = screen.getByRole("button", { name: "Move notepad" });
  const panel = screen.getByRole("dialog", { name: "Scratchpad" });
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  expect(onMove.mock.calls[0][0].x).toBeCloseTo((originalWidth * .1 + 10) / originalWidth);
  expect(onMove.mock.calls[0][0].y).toBeCloseTo(.1);
  fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
  expect(parseFloat(panel.style.top)).toBeCloseTo(originalHeight * .1 + 40);

  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 360 });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 400 });
  fireEvent(window, new Event("resize"));
  expect(parseFloat(panel.style.left)).toBeLessThanOrEqual(28);
  expect(parseFloat(panel.style.top)).toBeLessThanOrEqual(48);
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: originalWidth });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: originalHeight });
  rect.mockRestore();
});

test("dragging the notepad saves the clamped location on pointer release", () => {
  const rect = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 100, top: 100, width: 320, height: 340 });
  const originalPointerEvent = window.PointerEvent;
  window.PointerEvent = MouseEvent;
  const onMove = jest.fn();
  render(<Drawer name="notes" position={null} onMove={onMove} onClose={() => {}}><textarea aria-label="Notes" /></Drawer>);
  const handle = screen.getByRole("button", { name: "Move notepad" });
  fireEvent.pointerDown(handle, { button: 0, clientX: 150, clientY: 120 });
  fireEvent.pointerMove(handle, { clientX: -200, clientY: -100 });
  expect(onMove).not.toHaveBeenCalled();
  fireEvent.pointerUp(handle);
  expect(onMove).toHaveBeenLastCalledWith({ x: 12 / window.innerWidth, y: 12 / window.innerHeight });
  expect(clampNotepadPosition({ left: 10000, top: 10000 }, { width: 320, height: 340 }, { width: 400, height: 600 })).toEqual({ left: 68, top: 248 });
  window.PointerEvent = originalPointerEvent;
  rect.mockRestore();
});

test("decoration library uses an explicit arrange action and places free furniture", () => {
  const state = createInitialState(1);
  state.room.decorations = [];
  const dispatch = jest.fn();
  const setArranging = jest.fn();
  render(<DecoratePanel state={state} act={dispatch} arranging={false} setArranging={setArranging} selection={null} setSelection={() => {}} />);
  expect(screen.queryByRole("checkbox", { name: "Arrange room" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Arrange room" }));
  expect(setArranging).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole("button", { name: "Add Soft sofa" }));
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "PLACE_DECORATION", item: "couch" }));
});

test("arrangement arrow controls move pets above the floor and clamp at the upper boundary", () => {
  const state = createInitialState(1);
  state.animals[0].y = 35;
  const dispatch = jest.fn();
  const props = { state, act: dispatch, arranging: true, setArranging: () => {}, selection: { type: "animal", id: state.animals[0].id }, setSelection: () => {} };
  const { rerender } = render(<DecoratePanel {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Move selected item up" }));
  expect(dispatch).toHaveBeenLastCalledWith({ type: "MOVE_ANIMAL", id: state.animals[0].id, y: 34 });
  state.animals[0].y = 20;
  rerender(<DecoratePanel {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Move selected item up" }));
  expect(dispatch).toHaveBeenLastCalledWith({ type: "MOVE_ANIMAL", id: state.animals[0].id, y: 20 });
});

test("placed library furniture stays selectable and cycles copies without placing another", () => {
  const state = createInitialState(1);
  state.room.decorations = [{ id: "sofa-one", item: "couch", x: 60, y: 60 }, { id: "sofa-two", item: "couch", x: 70, y: 70 }];
  state.owned.decorationCounts = { ...state.owned.decorationCounts, couch: 3 };
  const dispatch = jest.fn();
  const select = jest.fn();
  const { rerender } = render(<DecoratePanel state={state} act={dispatch} arranging setArranging={() => {}} selection={null} setSelection={select} />);
  fireEvent.click(screen.getByRole("button", { name: "Select Soft sofa, 2 in room" }));
  expect(select).toHaveBeenLastCalledWith({ type: "decoration", id: "sofa-one" });
  expect(dispatch).not.toHaveBeenCalled();
  rerender(<DecoratePanel state={state} act={dispatch} arranging setArranging={() => {}} selection={{ type: "decoration", id: "sofa-one" }} setSelection={select} />);
  expect(screen.getByRole("combobox", { name: "Selected item" })).toHaveValue("decoration:sofa-one");
  fireEvent.click(screen.getByRole("button", { name: "Select Soft sofa, 2 in room" }));
  expect(select).toHaveBeenLastCalledWith({ type: "decoration", id: "sofa-two" });
  fireEvent.click(screen.getByRole("button", { name: "Add Soft sofa, 1 available" }));
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "PLACE_DECORATION", item: "couch" }));
});

test("library widgets select and use arrow controls without exposing Remove", () => {
  const state = createInitialState(1);
  const select = jest.fn();
  const nudge = jest.fn();
  render(<DecoratePanel state={state} act={() => {}} arranging setArranging={() => {}} selection={{ type: "widget", id: "timer" }} setSelection={select} onNudgeWidget={nudge} />);
  fireEvent.click(screen.getByRole("button", { name: "Select Daily goal" }));
  expect(select).toHaveBeenCalledWith({ type: "widget", id: "goal" });
  expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Move selected item right" }));
  expect(nudge).toHaveBeenCalledWith("timer", "right");
});

test("duplicate upgrades unlock additional visible room animations", () => {
  jest.useFakeTimers();
  const { container } = render(<AnimalArt animal={{ species: "cat", rarity: "basic", upgrades: 2 }} className="idle-animal" />);
  // Decorative artwork is intentionally hidden from assistive technology; inspect its motion hook directly.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  const pet = container.querySelector(".animal-art");
  expect(pet).toHaveAttribute("data-animations", "3");
  expect(pet).toHaveClass("pet-motion-breathe");
  act(() => jest.advanceTimersByTime(12000));
  expect(pet).toHaveClass("pet-motion-sway");
  act(() => jest.advanceTimersByTime(12000));
  expect(pet).toHaveClass("pet-motion-hop");
  act(() => jest.advanceTimersByTime(12000));
  expect(pet).toHaveClass("pet-motion-breathe");
  jest.useRealTimers();
});
