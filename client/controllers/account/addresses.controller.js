angular.module('app').controller('AddressesController', function (usersService, notifyModalService) {
  var vm = this;
  vm.loading = true;
  vm.addresses = [];
  vm.showForm = false;
  vm.editingId = null;
  vm.form = {};

  function load() {
    usersService.listAddresses().then(function (addresses) {
      vm.addresses = addresses;
      vm.loading = false;
    });
  }
  load();

  vm.newAddress = function () {
    vm.form = { address_line: '', city: '', district: '', is_default: false };
    vm.editingId = null;
    vm.showForm = true;
  };

  vm.editAddress = function (address) {
    vm.form = angular.copy(address);
    vm.editingId = address.address_id;
    vm.showForm = true;
  };

  vm.save = function () {
    var isEditing = !!vm.editingId;
    var promise = isEditing
      ? usersService.updateAddress(vm.editingId, vm.form)
      : usersService.addAddress(vm.form);
    promise.then(function () {
      vm.showForm = false;
      notifyModalService.success(isEditing ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ thành công!');
      load();
    });
  };

  vm.remove = function (address) {
    usersService.deleteAddress(address.address_id).then(load);
  };

  vm.cancel = function () {
    vm.showForm = false;
  };
});
