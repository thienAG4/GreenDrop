angular.module('adminApp').controller('BannersController', function (bannersService, uploadsService, notifyModalService, datetimeLocalUtil) {
  var vm = this;
  vm.loading = true;
  vm.banners = [];
  vm.showForm = false;
  vm.editingId = null;
  vm.form = {};
  vm.errorMessage = null;
  vm.uploading = false;

  var STATUS_LABELS = { active: 'Đang hiển thị', inactive: 'Đã ẩn' };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };
  var POSITION_LABELS = { home_top: 'Đầu trang chủ', home_middle: 'Giữa trang chủ' };
  vm.positionLabel = function (position) { return POSITION_LABELS[position] || position; };

  function load() {
    bannersService.listAll().then(function (banners) {
      vm.banners = banners;
      vm.loading = false;
    });
  }
  load();

  vm.newBanner = function () {
    vm.form = { image_url: '', position: 'home_top', start_at: '', end_at: '', status: 'active' };
    vm.editingId = null;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  vm.editBanner = function (b) {
    vm.form = angular.copy(b);
    // Raw MySQL datetime strings don't render in a datetime-local picker -
    // see datetime-local.service.js.
    vm.form.start_at = datetimeLocalUtil.toDate(b.start_at);
    vm.form.end_at = datetimeLocalUtil.toDate(b.end_at);
    vm.editingId = b.banner_id;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  vm.onImageSelected = function (files) {
    if (!files || !files.length) return;
    vm.uploading = true;
    uploadsService.uploadImages('banners', [files[0]]).then(function (uploaded) {
      vm.form.image_url = uploaded[0].url;
    }).catch(function () {
      vm.errorMessage = 'Không thể tải ảnh lên, vui lòng thử lại';
    }).finally(function () { vm.uploading = false; });
  };

  vm.save = function () {
    if (!vm.form.image_url) {
      vm.errorMessage = 'Vui lòng tải lên hình ảnh banner';
      return;
    }
    var isEditing = !!vm.editingId;
    var promise = isEditing ? bannersService.update(vm.editingId, vm.form) : bannersService.create(vm.form);
    promise.then(function () {
      vm.showForm = false;
      notifyModalService.success(isEditing ? 'Cập nhật banner thành công!' : 'Thêm banner thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể lưu banner';
    });
  };

  vm.remove = function (b) {
    bannersService.remove(b.banner_id).then(load);
  };

  vm.cancel = function () { vm.showForm = false; };
});
