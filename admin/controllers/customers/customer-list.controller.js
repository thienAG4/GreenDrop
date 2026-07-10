angular.module('adminApp').controller('CustomerListController', function (usersService) {
  var vm = this;
  vm.loading = true;
  vm.customers = [];
  vm.meta = { total: 0, page: 1, limit: 20 };

  var STATUS_LABELS = { active: 'Đang hoạt động', inactive: 'Ngừng hoạt động', banned: 'Bị khoá' };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };

  function load() {
    vm.loading = true;
    usersService.listAdmin({ role: 'customer', page: vm.meta.page, limit: vm.meta.limit }).then(function (res) {
      vm.customers = res.data.data;
      vm.meta = res.data.meta;
      vm.loading = false;
    });
  }
  load();

  vm.totalPages = function () { return Math.max(1, Math.ceil(vm.meta.total / vm.meta.limit)); };
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
});
