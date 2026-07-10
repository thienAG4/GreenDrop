// Normalizes a datetime value into what MySQL's DATETIME columns accept
// ('YYYY-MM-DD HH:MM:SS'). Admin forms using `<input type="datetime-local">`
// bind to a JS Date object (AngularJS's built-in datetime-local directive),
// and $http's JSON serialization calls `Date.toISOString()` on it - producing
// something like '2026-07-10T09:16:00.000Z', which MySQL's strict SQL mode
// rejects outright ("Incorrect datetime value") instead of coercing it. This
// silently crashed voucher/promotion-event creation with a generic 500 until
// found by reading the actual server logs, not the frontend's error message.
function toMysqlDatetime(value) {
  if (!value) return value;
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(value);
  return match ? `${match[1]} ${match[2]}` : value;
}

module.exports = { toMysqlDatetime };
