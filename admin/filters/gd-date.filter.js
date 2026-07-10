// The backend returns MySQL datetime strings as "YYYY-MM-DD HH:MM:SS"
// (config/db.js sets dateStrings: true - no 'T' separator, no timezone).
// AngularJS's built-in `date` filter only recognizes ISO 8601 strings (it
// requires a literal 'T' between date and time); anything else fails to
// parse and the filter silently falls back to echoing the raw input back
// unchanged - e.g. a voucher's "Hiệu lực" column showing
// "2026-07-04 06:35:44 - 2026-07-14 06:35:44" instead of a formatted date.
// This wraps the built-in filter, normalizing that shape first. Matches this
// app's existing convention of treating naive backend timestamps as UTC
// (see checkout-payment.controller.js's countdown parsing).
angular.module('adminApp').filter('gdDate', function ($filter) {
  return function (value, format, timezone) {
    if (typeof value === 'string' && value.indexOf('T') === -1 && value.indexOf(' ') > -1) {
      value = value.replace(' ', 'T') + 'Z';
    }
    return $filter('date')(value, format, timezone);
  };
});
