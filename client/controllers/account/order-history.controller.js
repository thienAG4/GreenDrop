angular.module('app').controller('OrderHistoryController', function (ordersService) {
  var vm = this;
  vm.loading = true;
  vm.orders = [];
  vm.statusFilter = '';

  var STATUS_LABELS = {
    pending: { label: 'Chờ xác nhận', badge: 'gd-badge-warning' },
    confirmed: { label: 'Đã xác nhận', badge: 'gd-badge-info' },
    shipping: { label: 'Đang giao', badge: 'gd-badge-info' },
    delivered: { label: 'Đã giao', badge: 'gd-badge-success' },
    cancelled: { label: 'Đã huỷ', badge: 'gd-badge-error' },
    returned: { label: 'Đã trả hàng', badge: 'gd-badge-neutral' },
  };
  vm.statusMeta = function (status) { return STATUS_LABELS[status] || { label: status, badge: 'gd-badge-neutral' }; };

  // Same wording as order-detail.controller.js's payment method picker.
  var PAYMENT_METHOD_LABELS = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng (ATM)',
    e_wallet: 'Ví điện tử (Momo)',
    credit_card: 'Thẻ tín dụng (Visa/Mastercard)',
  };
  vm.paymentMethodLabel = function (method) { return PAYMENT_METHOD_LABELS[method] || method; };

  ordersService.mine().then(function (orders) {
    vm.orders = orders;
    vm.loading = false;
  });

  vm.filteredOrders = function () {
    if (!vm.statusFilter) return vm.orders;
    return vm.orders.filter(function (o) { return o.status === vm.statusFilter; });
  };

  vm.canCancel = function (order) { return order.status === 'confirmed'; };
  vm.canReview = function (order) {
    return order.status === 'delivered' && order.items.some(function (i) { return !i.is_reviewed; });
  };
  // Nothing left to "track" once an order has reached a final state.
  vm.viewOrTrackLabel = function (order) {
    return (order.status === 'cancelled' || order.status === 'delivered') ? 'Xem đơn hàng' : 'Theo dõi đơn hàng';
  };
});
