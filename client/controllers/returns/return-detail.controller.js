angular.module('app').controller('ReturnDetailController', function ($routeParams, returnsService) {
  var vm = this;
  vm.loading = true;
  vm.notFound = false;
  vm.returnRequest = null;

  var STATUS_META = {
    pending: { label: 'Đang xét duyệt', badge: 'gd-badge-info' },
    approved: { label: 'Đã chấp nhận', badge: 'gd-badge-success' },
    rejected: { label: 'Trả hàng thất bại', badge: 'gd-badge-error' },
  };
  vm.latestRefund = function () {
    if (!vm.returnRequest || !vm.returnRequest.refunds.length) return null;
    return vm.returnRequest.refunds[vm.returnRequest.refunds.length - 1];
  };
  // RETURN_REQUESTS.status = 'completed' only means the item was received and
  // passed inspection - it says nothing about whether the refund itself has
  // actually finished, so the top badge has to follow the real REFUNDS row,
  // not a static per-return-status label (that's what caused the top badge
  // to say "Đang hoàn tiền" while the refund list below already said "Đã
  // hoàn tiền" for the same request).
  vm.statusMeta = function () {
    if (!vm.returnRequest) return { label: '', badge: 'gd-badge-neutral' };
    if (vm.returnRequest.status === 'completed') {
      var refund = vm.latestRefund();
      if (refund && refund.status === 'completed') return { label: 'Đã hoàn tiền', badge: 'gd-badge-success' };
      if (refund && refund.status === 'failed') return { label: 'Hoàn tiền thất bại', badge: 'gd-badge-error' };
      return { label: 'Đang hoàn tiền', badge: 'gd-badge-info' };
    }
    return STATUS_META[vm.returnRequest.status] || { label: vm.returnRequest.status, badge: 'gd-badge-neutral' };
  };

  // Same wording as return-flow.controller.js's request-form dropdown.
  var REASON_LABELS = {
    damaged: 'Sản phẩm bị hư hỏng/vỡ',
    wrong_item: 'Giao sai sản phẩm',
    shipping_error: 'Lỗi vận chuyển',
    defective: 'Sản phẩm lỗi/cây chết',
    not_as_described: 'Không đúng mô tả',
    order_cancelled: 'Huỷ đơn hàng (hoàn tiền)',
  };
  vm.reasonLabel = function (reason) { return REASON_LABELS[reason] || reason; };

  var REFUND_STATUS_LABELS = {
    pending: 'Chờ xử lý', processing: 'Đang xử lý', completed: 'Đã hoàn tiền', failed: 'Hoàn tiền thất bại',
  };
  vm.refundStatusLabel = function (status) { return REFUND_STATUS_LABELS[status] || status; };

  returnsService.get($routeParams.id).then(function (returnRequest) {
    vm.returnRequest = returnRequest;
    vm.loading = false;
  }).catch(function () {
    vm.loading = false;
    vm.notFound = true;
  });
});
