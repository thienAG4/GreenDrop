angular.module('adminApp').controller('ReturnsController', function (returnsService) {
  var vm = this;
  vm.tab = 'requests';
  vm.loading = true;
  vm.returns = [];
  vm.refunds = [];
  vm.statusFilter = '';

  var RETURN_STATUS_LABELS = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối', completed: 'Đã nhận hàng' };
  vm.returnStatusLabel = function (status) { return RETURN_STATUS_LABELS[status] || status; };
  var RETURN_STATUS_BADGE = { pending: 'gd-badge-warning', approved: 'gd-badge-info', rejected: 'gd-badge-error', completed: 'gd-badge-success' };
  vm.returnStatusBadgeClass = function (status) { return RETURN_STATUS_BADGE[status] || 'gd-badge-neutral'; };

  var REFUND_STATUS_LABELS = { pending: 'Chờ xử lý', processing: 'Đang xử lý', completed: 'Hoàn tất', failed: 'Thất bại' };
  vm.refundStatusLabel = function (status) { return REFUND_STATUS_LABELS[status] || status; };

  function loadReturns() {
    vm.loading = true;
    returnsService.listAll({ status: vm.statusFilter || undefined }).then(function (returns) {
      vm.returns = returns;
      vm.loading = false;
    });
  }
  function loadRefunds() {
    vm.loading = true;
    returnsService.listRefunds().then(function (refunds) {
      vm.refunds = refunds;
      vm.loading = false;
    });
  }

  vm.setTab = function (tab) {
    vm.tab = tab;
    if (tab === 'requests') loadReturns(); else loadRefunds();
  };
  vm.reload = loadReturns;
  loadReturns();

  vm.approve = function (r) {
    returnsService.approve(r.return_id).then(loadReturns);
  };
  vm.reject = function (r) {
    var reason = prompt('Lý do từ chối:');
    if (!reason) return;
    returnsService.reject(r.return_id, reason).then(loadReturns);
  };
  vm.itemReceived = function (r) {
    returnsService.itemReceived(r.return_id, { restock: true }).then(loadReturns);
  };

  vm.retryRefund = function (refund) {
    var outcome = confirm('Giả lập hoàn tiền THÀNH CÔNG? (Huỷ = giả lập thất bại)') ? 'success' : 'fail';
    returnsService.retryRefund(refund.refund_id, outcome).then(loadRefunds);
  };
});
