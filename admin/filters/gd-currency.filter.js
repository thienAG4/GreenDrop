// Formats a number the way VND prices are written in the design spec: "450.000đ"
angular.module('adminApp').filter('gdCurrency', function () {
  return function (value) {
    var n = Math.round(Number(value) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  };
});
