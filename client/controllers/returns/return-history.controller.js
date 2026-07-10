angular.module('app').controller('ReturnHistoryController', function (returnsService) {
  var vm = this;
  vm.loading = true;
  vm.returns = [];

  var STATUS_META = {
    pending: { label: 'Đang xét duyệt', badge: 'gd-badge-info' },
    approved: { label: 'Đã chấp nhận', badge: 'gd-badge-success' },
    rejected: { label: 'Trả hàng thất bại', badge: 'gd-badge-warning' },
  };
  // See return-detail.controller.js for why 'completed' can't use a static
  // label - it only means the item passed inspection, not that the refund
  // itself finished (or succeeded).
  vm.statusMeta = function (r) {
    if (r.status === 'completed') {
      var refund = r.refunds.length ? r.refunds[r.refunds.length - 1] : null;
      if (refund && refund.status === 'completed') return { label: 'Đã hoàn tiền', badge: 'gd-badge-success' };
      if (refund && refund.status === 'failed') return { label: 'Hoàn tiền thất bại', badge: 'gd-badge-error' };
      return { label: 'Đang hoàn tiền', badge: 'gd-badge-info' };
    }
    return STATUS_META[r.status] || { label: r.status, badge: 'gd-badge-neutral' };
  };

  vm.thumbnail = function (r) {
    var withPhoto = r.items.filter(function (i) { return i.photo_url; })[0];
    return withPhoto ? withPhoto.photo_url : 'https://placehold.co/60x60?text=%20';
  };
  vm.itemsSummary = function (r) {
    return r.items.map(function (i) { return i.item_name; }).join(', ');
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

  returnsService.mine().then(function (returns) {
    vm.returns = returns;
    vm.loading = false;
  });
});
