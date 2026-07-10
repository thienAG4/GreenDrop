angular.module('app').controller('OrderInvoiceController', function ($routeParams, $location, ordersService) {
  var vm = this;
  vm.loading = true;
  vm.order = null;
  vm.notFound = false;

  var PAYMENT_METHOD_LABELS = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng (ATM)',
    e_wallet: 'Ví điện tử (Momo)',
    credit_card: 'Thẻ tín dụng (Visa/Mastercard)',
  };
  var PAYMENT_STATUS_LABELS = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' };
  vm.paymentMethodLabel = function (method) { return PAYMENT_METHOD_LABELS[method] || method; };
  vm.paymentStatusLabel = function (status) { return PAYMENT_STATUS_LABELS[status] || status; };

  vm.print = function () { window.print(); };

  // Same anonymous-vs-phone-verified fetch rule as order-detail.controller.js.
  var phone = $location.search().phone;
  var fetchPromise = phone ? ordersService.track($routeParams.id, phone) : ordersService.get($routeParams.id);
  fetchPromise.then(function (order) {
    vm.order = order;
    vm.loading = false;
  }).catch(function () {
    vm.loading = false;
    vm.notFound = true;
  });
});
