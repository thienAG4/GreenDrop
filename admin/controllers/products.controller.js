angular.module('adminApp').controller('ProductsController', function (productsService, categoriesService, uploadsService, notifyModalService) {
  var vm = this;
  vm.loading = true;
  vm.products = [];
  vm.categories = [];
  vm.showForm = false;
  vm.editingId = null;
  vm.form = {};
  vm.errorMessage = null;
  vm.uploading = false;
  vm.meta = { total: 0, page: 1, limit: 12 };

  var STATUS_LABELS = { active: 'Đang bán', inactive: 'Ngừng bán', out_of_stock: 'Hết hàng' };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };

  function load() {
    vm.loading = true;
    productsService.list({ admin: true, page: vm.meta.page, limit: vm.meta.limit }).then(function (res) {
      vm.products = res.items;
      vm.meta = res.meta;
      vm.loading = false;
    });
  }
  load();
  categoriesService.list().then(function (cats) { vm.categories = cats; });

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

  vm.newProduct = function () {
    vm.form = { sku: '', name: '', description: '', price: 0, category_id: null, status: 'active', stock_quantity: 0, images: [] };
    vm.editingId = null;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  vm.editProduct = function (product) {
    productsService.get(product.product_id).then(function (full) {
      vm.form = angular.copy(full);
      vm.editingId = product.product_id;
      vm.showForm = true;
      vm.errorMessage = null;
    });
  };

  vm.onImagesSelected = function (files) {
    if (!files || !files.length) return;
    vm.uploading = true;
    uploadsService.uploadImages('products', files).then(function (uploaded) {
      uploaded.forEach(function (img) { vm.form.images.push(img); });
    }).catch(function () {
      vm.errorMessage = 'Không thể tải ảnh lên, vui lòng thử lại';
    }).finally(function () { vm.uploading = false; });
  };
  vm.removeImageField = function (index) { vm.form.images.splice(index, 1); };

  vm.save = function () {
    var payload = angular.copy(vm.form);
    var isEditing = !!vm.editingId;
    var promise = isEditing ? productsService.update(vm.editingId, payload) : productsService.create(payload);
    promise.then(function () {
      vm.showForm = false;
      notifyModalService.success(isEditing ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể lưu sản phẩm';
    });
  };

  vm.remove = function (product) {
    if (!confirm('Xoá sản phẩm "' + product.name + '"?')) return;
    productsService.remove(product.product_id).then(load).catch(function (err) {
      alert((err.data && err.data.error) || 'Không thể xoá sản phẩm');
    });
  };

  vm.cancel = function () { vm.showForm = false; };
});
