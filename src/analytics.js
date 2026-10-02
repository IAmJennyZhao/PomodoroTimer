export const PERIODS = [
  { id: "today", name: "Today", days: 1 },
  { id: "week", name: "7 days", days: 7 },
  { id: "month", name: "30 days", days: 30 },
];

export function dayKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatFocusTime(minutes) {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const remainder = total % 60;
  return `${Math.floor(total / 60)}h${remainder ? ` ${remainder}m` : ""}`;
}

export function completedSessions(history, now = Date.now()) {
  return (Array.isArray(history) ? history : [])
    .filter(
      (entry) =>
        entry &&
        Number.isFinite(entry.completedAt) &&
        entry.completedAt >= 0 &&
        entry.completedAt <= now &&
        Number.isFinite(entry.minutes) &&
        entry.minutes > 0,
    )
    .sort((a, b) => b.completedAt - a.completedAt);
}

export function sessionTags(entry) {
  const seen = new Set();
  return (Array.isArray(entry.tags) ? entry.tags : []).filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim().replace(/\s+/g, " ")).filter((tag) => {
      const key = tag.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function focusAnalytics(history, period = "today", now = Date.now()) {
  const selected = PERIODS.find((item) => item.id === period) || PERIODS[0];
  const start = startOfDay(now);
  // Calendar arithmetic preserves midnight boundaries across daylight-saving changes.
  start.setDate(start.getDate() - selected.days + 1);
  const sessions = completedSessions(history, now).filter(
    (entry) => entry.completedAt >= start.getTime(),
  );
  const days = Array.from({ length: selected.days }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return {
      key: dayKey(date),
      timestamp: date.getTime(),
      minutes: 0,
      sessions: 0,
    };
  });
  const dayMap = new Map(days.map((day) => [day.key, day]));
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    hour,
    minutes: 0,
    sessions: 0,
  }));
  const tagMap = new Map();
  for (const entry of sessions) {
    const day = dayMap.get(dayKey(entry.completedAt));
    if (day) {
      day.minutes += entry.minutes;
      day.sessions += 1;
    }
    const hour = hours[new Date(entry.completedAt).getHours()];
    hour.minutes += entry.minutes;
    hour.sessions += 1;
    const tags = sessionTags(entry);
    for (const tag of tags.length ? tags : [null]) {
      const key = tag?.toLowerCase() ?? null;
      const bucket = tagMap.get(key) || { tag, minutes: 0, sessions: 0 };
      bucket.minutes += entry.minutes;
      bucket.sessions += 1;
      tagMap.set(key, bucket);
    }
  }
  const minutes = sessions.reduce((total, entry) => total + entry.minutes, 0);
  return {
    period: selected.id,
    rangeDays: selected.days,
    sessions,
    minutes,
    sessionCount: sessions.length,
    averageMinutes: sessions.length ? Math.round(minutes / sessions.length) : 0,
    activeDays: days.filter((day) => day.sessions > 0).length,
    days,
    hours,
    tags: [...tagMap.values()].map((tag) => ({ ...tag, averageMinutes: Math.round(tag.minutes / tag.sessions) }))
      .sort((a, b) => b.minutes - a.minutes || (a.tag || "Untagged").localeCompare(b.tag || "Untagged")),
  };
}
