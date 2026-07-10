angular.module('app').controller('ProductListController', function ($location, productsService, categoriesService, combosService) {
  var vm = this;
  var query = $location.search();

  vm.loading = true;
  vm.items = [];
  vm.categories = [];
  // Community Builder combos surfaced on the catalog page so shoppers can
  // discover and buy designs other customers made (no separate nav page).
  vm.combos = [];
  combosService.list().then(function (combos) { vm.combos = combos; });
  vm.meta = { total: 0, page: 1, limit: 9 };
  vm.filters = {
    q: query.q || '',
    category_id: query.category_id ? Number(query.category_id) : null,
    min_price: query.min_price || null,
    max_price: query.max_price || null,
    sort: query.sort || 'featured',
    page: query.page ? Number(query.page) : 1,
  };

  vm.sortOptions = [
    { value: 'featured', label: 'Nổi bật' },
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price_asc', label: 'Giá tăng dần' },
    { value: 'price_desc', label: 'Giá giảm dần' },
    { value: 'rating', label: 'Đánh giá cao nhất' },
  ];

  categoriesService.list().then(function (cats) { vm.categories = cats; });

  function syncUrl() {
    $location.search(angular.extend({}, vm.filters, { limit: undefined }));
  }

  vm.load = function () {
    vm.loading = true;
    syncUrl();
    productsService.list(angular.extend({ limit: vm.meta.limit }, vm.filters)).then(function (res) {
      vm.items = res.items;
      vm.meta = res.meta;
      vm.loading = false;
    });
  };

  vm.applyFilters = function () {
    vm.filters.page = 1;
    vm.load();
  };

  vm.toggleCategory = function (categoryId) {
    vm.filters.category_id = vm.filters.category_id === categoryId ? null : categoryId;
    vm.applyFilters();
  };

  vm.removeFilter = function (key) {
    vm.filters[key] = key === 'sort' ? 'featured' : null;
    vm.applyFilters();
  };

  vm.hasActiveFilters = function () {
    return !!(vm.filters.q || vm.filters.category_id || vm.filters.min_price || vm.filters.max_price || vm.filters.sort !== 'featured');
  };

  vm.clearAllFilters = function () {
    vm.filters = { q: '', category_id: null, min_price: null, max_price: null, sort: 'featured', page: 1 };
    vm.load();
  };

  vm.categoryName = function (id) {
    var cat = vm.categories.filter(function (c) { return c.category_id === id; })[0];
    return cat ? cat.name : '';
  };

  vm.totalPages = function () {
    return Math.max(1, Math.ceil(vm.meta.total / vm.meta.limit));
  };

  vm.goToPage = function (page) {
    if (page < 1 || page > vm.totalPages()) return;
    vm.filters.page = page;
    vm.load();
  };

  // Windowed page numbers - current page plus up to 2 neighbors on each side
  // (~5-6 buttons max), instead of listing every page. The bar's bar-left/
  // bar-right arrows still jump straight to page 1 / the last page.
  vm.pageRange = function () {
    var total = vm.totalPages();
    var current = vm.filters.page;
    var start = Math.max(1, current - 2);
    var end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    var pages = [];
    for (var i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  vm.load();
});
