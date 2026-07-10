angular.module('app').controller('TrackOrderController', function ($location, ordersService) {
  var vm = this;
  vm.form = { order_id: '', phone: '' };
  vm.errorMessage = null;
  vm.submitting = false;

  vm.submit = function () {
    if (!vm.form.order_id || !vm.form.phone) {
      vm.errorMessage = 'Vui lòng nhập mã đơn hàng và số điện thoại.';
      return;
    }
    vm.errorMessage = null;
    vm.submitting = true;
    ordersService.track(vm.form.order_id, vm.form.phone).then(function (order) {
      vm.submitting = false;
      $location.path('/don-hang/' + order.order_id).search({ phone: vm.form.phone });
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Không tìm thấy đơn hàng';
    });
  };
});
