import { completedSessions, dayKey, focusAnalytics, formatFocusTime } from "./analytics";

const localTime = (year, month, day, hour = 12, minute = 0) => new Date(year, month - 1, day, hour, minute).getTime();
const NOW = localTime(2026, 10, 1, 15);
const session = (id, minutes, completedAt) => ({ id, task: id, minutes, completedAt });

test("today includes local midnight, groups by completion hour, and excludes future records", () => {
  const stats = focusAnalytics([
    session("before", 10, localTime(2026, 9, 30, 23, 59)),
    session("midnight", 25, localTime(2026, 10, 1, 0)),
    session("afternoon", 50, localTime(2026, 10, 1, 14)),
    session("future", 15, localTime(2026, 10, 1, 16)),
  ], "today", NOW);
  expect(stats).toMatchObject({ minutes: 75, sessionCount: 2, averageMinutes: 38, activeDays: 1, rangeDays: 1 });
  expect(stats.sessions.map((entry) => entry.id)).toEqual(["afternoon", "midnight"]);
  expect(stats.hours).toHaveLength(24);
  expect(stats.hours[0]).toMatchObject({ minutes: 25, sessions: 1 });
  expect(stats.hours[14]).toMatchObject({ minutes: 50, sessions: 1 });
  expect(stats.days).toEqual([{ key: "2026-10-01", timestamp: localTime(2026, 10, 1, 0), minutes: 75, sessions: 2 }]);
});

test("seven days means today plus six calendar days and fills empty dates", () => {
  const stats = focusAnalytics([
    session("too-old", 50, localTime(2026, 9, 24, 23, 59)),
    session("boundary", 15, localTime(2026, 9, 25, 0)),
    session("same-day", 25, localTime(2026, 9, 25, 17)),
    session("today", 10, NOW),
  ], "week", NOW);
  expect(stats).toMatchObject({ minutes: 50, sessionCount: 3, averageMinutes: 17, activeDays: 2, rangeDays: 7 });
  expect(stats.days.map((day) => day.key)).toEqual(["2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]);
  expect(stats.days[0]).toMatchObject({ minutes: 40, sessions: 2 });
  expect(stats.days[1]).toMatchObject({ minutes: 0, sessions: 0 });
});

test("thirty days crosses year boundaries without including day thirty-one", () => {
  const now = localTime(2027, 1, 10);
  const stats = focusAnalytics([
    session("inside", 25, localTime(2026, 12, 12, 0)),
    session("outside", 50, localTime(2026, 12, 11, 23, 59)),
  ], "month", now);
  expect(stats.days).toHaveLength(30);
  expect(stats.days[0].key).toBe("2026-12-12");
  expect(stats.days[29].key).toBe("2027-01-10");
  expect(stats.minutes).toBe(25);
});

test.each([
  ["spring", localTime(2026, 3, 10), "2026-03-04"],
  ["autumn", localTime(2026, 11, 3), "2026-10-28"],
])("calendar buckets stay at midnight across the %s daylight-saving transition", (_, now, expectedStart) => {
  const stats = focusAnalytics([], "week", now);
  expect(stats.days[0].key).toBe(expectedStart);
  expect(new Set(stats.days.map((day) => day.key)).size).toBe(7);
  expect(stats.days.every((day) => new Date(day.timestamp).getHours() === 0)).toBe(true);
  expect(stats.days[6].key).toBe(dayKey(now));
});

test("empty history yields meaningful zeros without NaN averages", () => {
  expect(focusAnalytics([], "month", NOW)).toMatchObject({ minutes: 0, averageMinutes: 0, activeDays: 0, sessionCount: 0, rangeDays: 30 });
  expect(focusAnalytics([], "invalid-period", NOW).period).toBe("today");
});

test("history is sorted without mutation and ignores incomplete, malformed, and future records", () => {
  const older = session("older", 15, NOW - 60000);
  const newer = session("newer", 25, NOW);
  const source = [older, newer, null, { minutes: 25 }, session("zero", 0, NOW), session("negative", -5, NOW), session("future", 10, NOW + 1)];
  expect(completedSessions(source, NOW)).toEqual([newer, older]);
  expect(source.slice(0, 2)).toEqual([older, newer]);
  expect(completedSessions(null, NOW)).toEqual([]);
});

test.each([[0, "0m"], [25, "25m"], [60, "1h"], [95, "1h 35m"], [150, "2h 30m"]])("focus time formats %i minutes as %s", (minutes, result) => {
  expect(formatFocusTime(minutes)).toBe(result);
});

test("tag totals include each session once per tag, combine tag casing, and explain untagged history", () => {
  const stats = focusAnalytics([
    { ...session("chem", 25, NOW), tags: ["Chemistry", " chemistry ", "Study", "", null] },
    { ...session("second", 15, NOW - 60000), tags: ["chemistry"] },
    session("legacy", 10, NOW - 120000),
    { ...session("old", 60, NOW - 86400000), tags: ["Work"] },
  ], "today", NOW);
  expect(stats.minutes).toBe(50);
  expect(stats.tags).toEqual([
    { tag: "Chemistry", minutes: 40, sessions: 2, averageMinutes: 20 },
    { tag: "Study", minutes: 25, sessions: 1, averageMinutes: 25 },
    { tag: null, minutes: 10, sessions: 1, averageMinutes: 10 },
  ]);
});

test("empty tag lists and malformed tags count as untagged and empty periods have no tag totals", () => {
  expect(focusAnalytics([
    { ...session("empty", 25, NOW), tags: [] },
    { ...session("malformed", 15, NOW), tags: "Work" },
    { ...session("blank", 10, NOW), tags: ["  ", 12] },
  ], "today", NOW).tags).toEqual([{ tag: null, minutes: 50, sessions: 3, averageMinutes: 17 }]);
  expect(focusAnalytics([], "today", NOW).tags).toEqual([]);
});
