angular.module('adminApp').controller('VouchersController', function (vouchersService, notifyModalService, datetimeLocalUtil) {
  var vm = this;
  vm.loading = true;
  vm.vouchers = [];
  vm.showForm = false;
  vm.editingId = null;
  vm.form = {};
  vm.errorMessage = null;

  function load() {
    vouchersService.list().then(function (vouchers) {
      vm.vouchers = vouchers;
      vm.loading = false;
    });
  }
  load();

  vm.newVoucher = function () {
    vm.form = { code: '', discount_type: 'percent', discount_value: 10, min_order_value: 0, max_usage: 0, start_at: '', end_at: '' };
    vm.editingId = null;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  vm.editVoucher = function (v) {
    vm.form = angular.copy(v);
    // Raw MySQL datetime strings don't render in a datetime-local picker -
    // see datetime-local.service.js.
    vm.form.start_at = datetimeLocalUtil.toDate(v.start_at);
    vm.form.end_at = datetimeLocalUtil.toDate(v.end_at);
    vm.editingId = v.voucher_id;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  vm.save = function () {
    var isEditing = !!vm.editingId;
    var promise = isEditing ? vouchersService.update(vm.editingId, vm.form) : vouchersService.create(vm.form);
    promise.then(function () {
      vm.showForm = false;
      notifyModalService.success(isEditing ? 'Cập nhật voucher thành công!' : 'Thêm voucher thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể lưu voucher';
    });
  };

  vm.remove = function (v) {
    vouchersService.remove(v.voucher_id).then(load);
  };

  vm.cancel = function () { vm.showForm = false; };
});
