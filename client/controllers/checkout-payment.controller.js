angular.module('app').controller('CheckoutPaymentController', function (
  $routeParams, $location, $interval, ordersService
) {
  var vm = this;
  vm.loading = true;
  vm.order = null;
  vm.remainingSeconds = 0;
  vm.expired = false;
  vm.processing = false;
  vm.errorMessage = null;
  vm.loadError = null;

  var QR_EXPIRY_MINUTES = 15; // mirrors backend utils/constants.js QR_EXPIRY_MINUTES
  var countdownTimer;

  // Backend datetimes come back as MySQL-formatted UTC strings, e.g.
  // "2026-07-09 10:32:33" (see backend config/db.js's dateStrings:true), with
  // no timezone marker. `new Date(str)` reads that as *local* time in the
  // browser instead of UTC, so anyone outside UTC got a countdown that was
  // already negative (immediately "expired") - this is what broke online
  // payment: the QR page appeared cancelled before it could ever be paid.
  function parseUtcDate(mysqlDateString) {
    return new Date(mysqlDateString.replace(' ', 'T') + 'Z');
  }

  function startCountdown() {
    var expiresAt = parseUtcDate(vm.order.created_at).getTime() + QR_EXPIRY_MINUTES * 60 * 1000;
    countdownTimer = $interval(function () {
      var diff = Math.round((expiresAt - Date.now()) / 1000);
      vm.remainingSeconds = Math.max(0, diff);
      if (diff <= 0) {
        $interval.cancel(countdownTimer);
        vm.expired = true;
        ordersService.get(vm.order.order_id); // triggers the backend's lazy auto-cancel
      }
    }, 1000);
  }

  vm.formattedTime = function () {
    var m = Math.floor(vm.remainingSeconds / 60);
    var s = vm.remainingSeconds % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };

  ordersService.get($routeParams.orderId).then(function (order) {
    vm.order = order;
    vm.loading = false;
    if (order.status === 'cancelled') {
      vm.expired = true;
    } else {
      startCountdown();
    }
  });

  vm.qrImageUrl = function () {
    return 'http://localhost:4000/uploads/images/QR_code.jpg';
  };

  vm.simulateOutcome = function (outcome) {
    vm.processing = true;
    ordersService.confirmPayment(vm.order.order_id, outcome).then(function (order) {
      vm.processing = false;
      if (countdownTimer) $interval.cancel(countdownTimer);
      if (order.payment_status === 'paid') {
        $location.path('/checkout/thanh-cong/' + order.order_id);
      } else {
        vm.order = order;
        vm.expired = true;
      }
    });
  };
});
