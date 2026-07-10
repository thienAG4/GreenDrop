angular.module('adminApp').controller('OrderDetailController', function ($routeParams, ordersService) {
  var vm = this;
  vm.loading = true;
  vm.order = null;
  vm.notFound = false;

  var STATUS_LABELS = {
    pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận (đang chuẩn bị)', shipping: 'Đang giao hàng',
    delivered: 'Đã giao', cancelled: 'Đã huỷ', returned: 'Đã trả hàng',
  };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };

  var PAYMENT_METHOD_LABELS = {
    cod: 'Thanh toán khi nhận hàng (COD)', bank_transfer: 'Chuyển khoản ngân hàng (ATM)',
    e_wallet: 'Ví điện tử (Momo)', credit_card: 'Thẻ tín dụng (Visa/Mastercard)',
  };
  var PAYMENT_STATUS_LABELS = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' };
  vm.paymentMethodLabel = function (method) { return PAYMENT_METHOD_LABELS[method] || method; };
  vm.paymentStatusLabel = function (status) { return PAYMENT_STATUS_LABELS[status] || status; };

  vm.timelineSteps = ['pending', 'confirmed', 'shipping', 'delivered'];
  vm.currentStepIndex = function () {
    return vm.order ? vm.timelineSteps.indexOf(vm.order.status) : -1;
  };

  vm.NEXT_STATUS = { pending: 'confirmed', confirmed: 'shipping', shipping: 'delivered' };
  vm.NEXT_LABEL = { pending: 'Xác nhận đơn', confirmed: 'Chuyển sang giao hàng', shipping: 'Đánh dấu đã giao' };

  function load() {
    ordersService.get($routeParams.id).then(function (order) {
      vm.order = order;
      vm.loading = false;
    }).catch(function () {
      vm.loading = false;
      vm.notFound = true;
    });
  }
  load();

  vm.advance = function () {
    ordersService.updateStatus(vm.order.order_id, vm.NEXT_STATUS[vm.order.status]).then(load);
  };

  vm.cancel = function () {
    var reason = prompt('Lý do huỷ đơn:');
    if (reason === null) return;
    ordersService.adminCancel(vm.order.order_id, reason).then(load);
  };
});
