angular.module('adminApp').controller('ReviewsController', function (reviewsService) {
  var vm = this;
  vm.loading = true;
  vm.reviews = [];
  vm.filter = 'pending';
  vm.meta = { total: 0, page: 1, limit: 10 };
  vm.selected = null;

  function load() {
    vm.loading = true;
    reviewsService.listAllAdmin({ status: vm.filter, page: vm.meta.page, limit: vm.meta.limit }).then(function (res) {
      vm.reviews = res.items;
      vm.meta = res.meta;
      vm.loading = false;
    });
  }
  load();

  vm.setFilter = function (filter) {
    vm.filter = filter;
    vm.meta.page = 1;
    load();
  };

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

  vm.viewDetail = function (r) { vm.selected = r; };
  vm.closeDetail = function () { vm.selected = null; };

  vm.approve = function (r) {
    reviewsService.setVisibility(r.review_id, true).then(function () {
      vm.selected = null;
      load();
    });
  };
  vm.hide = function (r) {
    reviewsService.setVisibility(r.review_id, false).then(function () {
      vm.selected = null;
      load();
    });
  };
});
