// Converts a MySQL datetime string ("YYYY-MM-DD HH:MM:SS", no timezone marker
// - backend/config/db.js sets dateStrings: true) into a JS Date object whose
// LOCAL getters match those exact wall-clock numbers, suitable for binding to
// <input type="datetime-local"> (AngularJS's built-in directive populates the
// native picker from the model's local Date getters, not from a string). Every
// admin "Sửa" form that does `vm.form = angular.copy(entity)` was assigning
// the raw string straight to a datetime-local-bound field, which the native
// picker can't render - the field just showed blank, even though vm.form.name
// etc. (plain text fields) populated fine. Symmetric with backend/utils/
// mysql-datetime.js on the write side - that one strips a Date's ISO string
// back down for MySQL, this one goes the other way for the picker.
angular.module('adminApp').factory('datetimeLocalUtil', function () {
  function toDate(mysqlString) {
    if (!mysqlString) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/.exec(mysqlString);
    if (!m) return new Date(mysqlString);
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  }
  return { toDate: toDate };
});
