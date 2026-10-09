'use strict';

// A deliberately fictional, populated profile for publication captures.
// Never read or copy the ordinary local save directory.
const { scenarioState } = require('./release-qa.cjs');
const CAPTURE_TIME = Date.parse('2026-10-09T16:00:00Z');

function showcaseState(now = CAPTURE_TIME) {
  const state = scenarioState('fresh', now);
  state.gems = 425;
  state.scratchpad = 'Read one chapter, then make tea.\n\nIdeas for later:\n- Sketch a reading nook\n- Pick a book for the weekend';
  state.timer.tasks = [
    { id: 'demo:task:1', text: 'Read a chapter', done: false },
    { id: 'demo:task:2', text: 'Write three takeaways', done: false },
  ];
  state.timer.task = state.timer.tasks[0].text;
  state.timer.tags = ['Reading'];
  state.animals = [
    { ...state.animals[0], upgrades: 4, accessory: 'bow', x: 80, y: 68 },
    { id: 'demo:dog', species: 'dog', rarity: 'basic', name: 'Mochi', accessory: 'none', upgrades: 1, placed: true, x: 63, y: 80 },
    { id: 'demo:fox', species: 'fox', rarity: 'rare', name: 'Maple', accessory: 'none', upgrades: 2, placed: true, x: 16, y: 83 },
  ];
  state.owned.accessories = ['none', 'bow'];
  state.owned.backgrounds = ['sunroom', 'moonroom', 'greenhouse'];
  state.owned.decorations.push('plant', 'bookshelf');
  state.owned.decorationCounts.plant = 1;
  state.owned.decorationCounts.bookshelf = 1;
  state.room.decorations.push({ id: 'demo:plant', item: 'plant', x: 10, y: 74 });
  state.eggs = [
    { id: 'demo:egg:1', rarity: 'basic', requiredMinutes: 25, progressMinutes: 20, createdAt: now - 86400000 },
    { id: 'demo:egg:2', rarity: 'rare', requiredMinutes: 75, progressMinutes: 75, createdAt: now - 3600000 },
  ];
  state.selectedEggId = state.eggs[0].id;
  const sessions = [
    ['Read a chapter', 'Reading', 25, 0, 10],
    ['Outline a short story', 'Writing', 35, 0, 13],
    ['Plan a reading list', 'Planning', 15, 0, 14],
    ['Sketch a quiet corner', 'Creative', 50, 1, 11],
    ['Read a chapter', 'Reading', 25, 2, 10],
    ['Draft a short scene', 'Writing', 40, 3, 13],
    ['Review story notes', 'Writing', 25, 4, 11],
    ['Plan the week', 'Planning', 20, 5, 10],
    ['Read a chapter', 'Reading', 30, 6, 12],
  ];
  state.history = sessions.map(([task, tag, minutes, days, hour], index) => {
    const date = new Date(now); date.setUTCDate(date.getUTCDate() - days); date.setUTCHours(hour, 0, 0, 0);
    return { id: `demo:history:${index}`, task, tasks: [{ id: `demo:history-task:${index}`, text: task, done: true }], tags: [tag], minutes, gems: minutes, completedAt: date.getTime() };
  });
  return state;
}

module.exports = { showcaseState, CAPTURE_TIME };
