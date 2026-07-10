angular.module('app').controller('OrderDetailController', function ($routeParams, $location, ordersService) {
  var vm = this;
  vm.loading = true;
  vm.order = null;
  vm.notFound = false;

  var STATUS_LABELS = {
    pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận (đang chuẩn bị)', shipping: 'Đang giao hàng',
    delivered: 'Đã giao', cancelled: 'Đã huỷ', returned: 'Đã trả hàng',
  };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };

  // Same wording as checkout.controller.js's payment method picker, so the
  // label a customer chose at checkout matches what they see here later.
  var PAYMENT_METHOD_LABELS = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng (ATM)',
    e_wallet: 'Ví điện tử (Momo)',
    credit_card: 'Thẻ tín dụng (Visa/Mastercard)',
  };
  var PAYMENT_STATUS_LABELS = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' };
  vm.paymentMethodLabel = function (method) { return PAYMENT_METHOD_LABELS[method] || method; };
  vm.paymentStatusLabel = function (status) { return PAYMENT_STATUS_LABELS[status] || status; };

  vm.timelineSteps = ['pending', 'confirmed', 'shipping', 'delivered'];
  vm.currentStepIndex = function () {
    return vm.order ? vm.timelineSteps.indexOf(vm.order.status) : -1;
  };

  function load() {
    // A `phone` query param means we arrived via the phone-based /track-order
    // form, so verify with it. Otherwise fetch by id - the backend already
    // allows anonymous GET /orders/:id (guest checkout issues no token, so
    // that's the only way a guest can open their own order right after
    // checkout), while still enforcing ownership for a logged-in request.
    var phone = $location.search().phone;
    var fetchPromise = phone ? ordersService.track($routeParams.id, phone) : ordersService.get($routeParams.id);
    fetchPromise.then(function (order) {
      vm.order = order;
      vm.loading = false;
    }).catch(function () {
      vm.loading = false;
      vm.notFound = true;
    });
  }
  load();

  vm.canCancel = function () { return vm.order && vm.order.status === 'confirmed'; };
  vm.canReturn = function () {
    return vm.order && vm.order.status === 'delivered' && vm.order.items.some(function (i) { return !i.is_returned; });
  };
  vm.canReview = function () {
    return vm.order && vm.order.status === 'delivered' && vm.order.items.some(function (i) { return !i.is_reviewed; });
  };
});
