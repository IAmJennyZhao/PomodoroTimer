'use strict';

const { showcaseState } = require('./showcase-data.cjs');

function demoState(now = Date.now()) {
  const state = showcaseState(now);
  const tasks = [
    ['Read a chapter', 'Reading'], ['Practice piano', 'Creative'],
    ['Draft a short story', 'Writing'], ['Review study notes', 'Study'],
    ['Plan the week', 'Planning'],
  ];
  state.history = [];
  for (let day = 0; day < 28; day += 1) {
    const count = day % 5 === 4 ? 1 : 3;
    for (let session = 0; session < count; session += 1) {
      const index = day * 3 + session;
      const [task, tag] = tasks[index % tasks.length];
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(8 + session * 3, 15, 0, 0);
      const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
      const completedAt = day === 0
        ? Math.max(midnight.getTime(), Math.min(date.getTime(), now - (count - session) * 60000))
        : date.getTime();
      const minutes = [25, 40, 15, 50, 30][index % 5];
      state.history.push({ id: `demo:journal:${index}`, task,
        tasks: [{ id: `demo:journal-task:${index}`, text: task, done: true }],
        tags: [tag], minutes, gems: minutes, completedAt });
    }
  }
  state.timer.tasks = [];
  state.timer.task = '';
  state.timer.tags = [];
  state.scratchpad = 'Demo notes\n\nRead a chapter, practice a little, then take a tea break.';
  return state;
}

module.exports = { demoState };
