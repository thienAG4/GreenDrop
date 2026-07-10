angular.module('app').controller('CancelOrderController', function ($routeParams, $location, ordersService) {
  var vm = this;
  vm.loading = true;
  vm.order = null;
  vm.step = 'select'; // select -> reason -> confirm -> result | not-satisfied
  // Same wording as order-detail.controller.js's payment method picker.
  var PAYMENT_METHOD_LABELS = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng (ATM)',
    e_wallet: 'Ví điện tử (Momo)',
    credit_card: 'Thẻ tín dụng (Visa/Mastercard)',
  };
  vm.paymentMethodLabel = function () {
    return vm.order ? (PAYMENT_METHOD_LABELS[vm.order.payment_method] || vm.order.payment_method) : '';
  };

  vm.reasonOptions = [
    { value: 'change_address', label: 'Muốn thay đổi địa chỉ giao hàng' },
    { value: 'better_price', label: 'Tìm được giá tốt hơn ở nơi khác' },
    { value: 'wrong_product', label: 'Đặt nhầm sản phẩm' },
    { value: 'other', label: 'Lý do khác' },
  ];
  vm.selectedReason = null;
  vm.otherReasonText = '';
  vm.submitting = false;
  vm.errorMessage = null;

  // COD orders have no card/wallet on file to refund to automatically, so the
  // customer supplies one before the cancel request is sent (collected here,
  // not after cancellation, so there's a single round trip - see the "confirm"
  // step, not a separate step after "result").
  vm.bankMethods = [
    { value: 'bank', label: 'Chuyển khoản ngân hàng' },
    { value: 'card', label: 'Thẻ Visa/Mastercard' },
    { value: 'momo', label: 'Ví Momo' },
  ];
  vm.bankInfo = { method: 'bank', bank_name: '', account_number: '', card_number: '', momo_number: '' };

  ordersService.get($routeParams.id).then(function (order) {
    vm.order = order;
    vm.loading = false;
    if (order.status !== 'confirmed') vm.step = 'not-satisfied';
  }).catch(function () {
    vm.loading = false;
    vm.step = 'not-satisfied';
  });

  vm.reasonLabel = function () {
    var opt = vm.reasonOptions.filter(function (o) { return o.value === vm.selectedReason; })[0];
    return vm.selectedReason === 'other' ? vm.otherReasonText : (opt ? opt.label : '');
  };

  vm.isOnlinePayment = function () {
    return vm.order && vm.order.payment_method !== 'cod';
  };
  vm.needsBankInfo = function () { return vm.order && !vm.isOnlinePayment(); };

  vm.goToReason = function () { vm.step = 'reason'; };
  vm.goToConfirm = function () {
    if (!vm.selectedReason) return;
    vm.step = 'confirm';
  };

  vm.bankInfoValid = function () {
    if (!vm.needsBankInfo()) return true;
    if (vm.bankInfo.method === 'bank') return !!(vm.bankInfo.bank_name && vm.bankInfo.account_number);
    if (vm.bankInfo.method === 'card') return !!vm.bankInfo.card_number;
    if (vm.bankInfo.method === 'momo') return !!vm.bankInfo.momo_number;
    return false;
  };

  vm.confirmCancel = function () {
    if (!vm.bankInfoValid()) {
      vm.errorMessage = 'Vui lòng nhập đầy đủ thông tin nhận hoàn tiền';
      return;
    }
    vm.errorMessage = null;
    vm.submitting = true;
    var bankInfo = vm.needsBankInfo() ? vm.bankInfo : null;
    ordersService.cancel(vm.order.order_id, vm.reasonLabel(), bankInfo).then(function (order) {
      vm.order = order;
      vm.submitting = false;
      vm.step = 'result';
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Không thể huỷ đơn hàng';
    });
  };
});
