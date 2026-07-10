angular.module('adminApp').controller('CustomerDetailController', function ($routeParams, usersService) {
  var vm = this;
  vm.loading = true;
  vm.customer = null;
  vm.notFound = false;

  var ORDER_STATUS_LABELS = {
    pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao',
    delivered: 'Đã giao', cancelled: 'Đã huỷ', returned: 'Đã trả hàng',
  };
  vm.statusLabel = function (status) { return ORDER_STATUS_LABELS[status] || status; };

  var CUSTOMER_STATUS_LABELS = { active: 'Đang hoạt động', inactive: 'Ngừng hoạt động', banned: 'Bị khoá' };
  vm.customerStatusLabel = function (status) { return CUSTOMER_STATUS_LABELS[status] || status; };

  usersService.getDetail($routeParams.id).then(function (customer) {
    vm.customer = customer;
    vm.loading = false;
  }).catch(function () {
    vm.loading = false;
    vm.notFound = true;
  });
});
