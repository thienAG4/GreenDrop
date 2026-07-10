angular.module('adminApp').controller('OrdersListController', function (ordersService) {
  var vm = this;
  vm.loading = true;
  vm.orders = [];
  vm.statusFilter = '';
  vm.meta = { total: 0, page: 1, limit: 10 };
  vm.counts = { total: 0, pending: 0, confirmed: 0, shipping: 0, delivered: 0, cancelled: 0, returned: 0 };

  vm.STATUS_FILTERS = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ xác nhận' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'shipping', label: 'Đang giao' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'cancelled', label: 'Đã huỷ' },
  ];

  var STATUS_LABELS = {
    pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao hàng',
    delivered: 'Đã giao hàng', cancelled: 'Đã huỷ', returned: 'Đã trả hàng',
  };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };

  vm.NEXT_STATUS = { pending: 'confirmed', confirmed: 'shipping', shipping: 'delivered' };
  vm.NEXT_LABEL = {
    pending: 'Xác nhận đơn', confirmed: 'Chuyển sang giao hàng', shipping: 'Đánh dấu đã giao',
  };

  var PAYMENT_METHOD_LABELS = {
    cod: 'COD', bank_transfer: 'Chuyển khoản', e_wallet: 'Ví điện tử', credit_card: 'Thẻ tín dụng',
  };
  var PAYMENT_STATUS_LABELS = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' };
  vm.paymentMethodLabel = function (method) { return PAYMENT_METHOD_LABELS[method] || method; };
  vm.paymentStatusLabel = function (status) { return PAYMENT_STATUS_LABELS[status] || status; };

  function loadCounts() {
    ordersService.adminStats().then(function (counts) { vm.counts = counts; });
  }

  function load() {
    vm.loading = true;
    ordersService.adminList({ status: vm.statusFilter || undefined, page: vm.meta.page, limit: vm.meta.limit })
      .then(function (res) {
        vm.orders = res.items;
        vm.meta = res.meta;
        vm.loading = false;
      });
  }
  loadCounts();
  load();
  vm.reload = load;

  vm.setStatusFilter = function (status) {
    vm.statusFilter = status;
    vm.meta.page = 1;
    load();
  };

  vm.totalPages = function () {
    return Math.max(1, Math.ceil(vm.meta.total / vm.meta.limit));
  };
  vm.goToPage = function (page) {
    if (page < 1 || page > vm.totalPages()) return;
    vm.meta.page = page;
    load();
  };
  vm.pageRange = function () {
    var total = vm.totalPages();
    var current = vm.meta.page;
    var start = Math.max(1, current - 2);
    var end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    var pages = [];
    for (var i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  vm.advance = function (order) {
    ordersService.updateStatus(order.order_id, vm.NEXT_STATUS[order.status]).then(function () {
      load();
      loadCounts();
    });
  };

  vm.cancel = function (order) {
    var reason = prompt('Lý do huỷ đơn:');
    if (reason === null) return;
    ordersService.adminCancel(order.order_id, reason).then(function () {
      load();
      loadCounts();
    });
  };
});
