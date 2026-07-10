angular.module('adminApp').controller('PromotionsController', function (promotionsService, productsService, categoriesService, notifyModalService, datetimeLocalUtil) {
  var vm = this;
  vm.loading = true;
  vm.events = [];
  vm.products = [];
  vm.categories = [];
  vm.showForm = false;
  vm.editingId = null;
  vm.form = {};
  vm.errorMessage = null;

  var STATUS_LABELS = { upcoming: 'Sắp diễn ra', active: 'Đang diễn ra', ended: 'Đã kết thúc' };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };
  var STATUS_BADGE = { upcoming: 'gd-badge-info', active: 'gd-badge-success', ended: 'gd-badge-neutral' };
  vm.statusBadgeClass = function (status) { return STATUS_BADGE[status] || 'gd-badge-neutral'; };

  function load() {
    promotionsService.listAll().then(function (events) {
      vm.events = events;
      vm.loading = false;
    });
  }
  load();
  productsService.list({ limit: 500 }).then(function (res) { vm.products = res.items; });
  categoriesService.list().then(function (cats) { vm.categories = cats; });

  function allProductIds() { return vm.products.map(function (p) { return p.product_id; }); }
  function productIdsForCategory(categoryId) {
    return vm.products.filter(function (p) { return p.category_id === categoryId; }).map(function (p) { return p.product_id; });
  }

  vm.newEvent = function () {
    vm.form = { name: '', discount_percent: 10, start_at: '', end_at: '', applyAll: true, category_ids: [] };
    vm.editingId = null;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  vm.editEvent = function (e) {
    vm.form = angular.copy(e);
    // Raw MySQL datetime strings don't render in a datetime-local picker -
    // see datetime-local.service.js.
    vm.form.start_at = datetimeLocalUtil.toDate(e.start_at);
    vm.form.end_at = datetimeLocalUtil.toDate(e.end_at);
    var productIds = e.products.map(function (p) { return p.product_id; });
    var eventCategoryIds = Array.from(new Set(e.products.map(function (p) { return p.category_id; })));

    // Infer whether this event was originally scoped as "all products" or a
    // specific set of categories, so re-opening the form for edit shows the
    // same selection back (rather than always defaulting to "all").
    var isAllProducts = allProductIds().length > 0 &&
      allProductIds().every(function (id) { return productIds.indexOf(id) > -1; }) &&
      productIds.length === allProductIds().length;

    vm.form.applyAll = isAllProducts;
    vm.form.category_ids = isAllProducts ? [] : eventCategoryIds;
    vm.editingId = e.event_id;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  // "Áp dụng cho tất cả sản phẩm" is exclusive; picking it clears any category
  // selections. Category options combine freely with each other, and picking
  // any of them turns "all products" back off.
  vm.selectAllProducts = function () {
    vm.form.applyAll = true;
    vm.form.category_ids = [];
  };
  vm.toggleCategory = function (categoryId) {
    vm.form.applyAll = false;
    var idx = vm.form.category_ids.indexOf(categoryId);
    if (idx > -1) vm.form.category_ids.splice(idx, 1); else vm.form.category_ids.push(categoryId);
  };
  vm.isCategorySelected = function (categoryId) { return vm.form.category_ids.indexOf(categoryId) > -1; };

  function resolvedProductIds() {
    if (vm.form.applyAll) return allProductIds();
    var ids = [];
    vm.form.category_ids.forEach(function (categoryId) {
      productIdsForCategory(categoryId).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    });
    return ids;
  }

  vm.save = function () {
    var isEditing = !!vm.editingId;
    var payload = angular.copy(vm.form);
    payload.product_ids = resolvedProductIds();
    if (!payload.product_ids.length) {
      vm.errorMessage = 'Vui lòng chọn ít nhất một phạm vi áp dụng';
      return;
    }
    var promise = isEditing ? promotionsService.update(vm.editingId, payload) : promotionsService.create(payload);
    promise.then(function () {
      vm.showForm = false;
      notifyModalService.success(isEditing ? 'Cập nhật sự kiện thành công!' : 'Thêm sự kiện thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể lưu sự kiện';
    });
  };

  vm.remove = function (e) {
    promotionsService.remove(e.event_id).then(load);
  };

  vm.cancel = function () { vm.showForm = false; };
});
