angular.module('app').controller('CheckoutSuccessController', function ($routeParams, ordersService) {
  var vm = this;
  vm.loading = true;
  ordersService.get($routeParams.orderId).then(function (order) {
    vm.order = order;
    vm.loading = false;
  });
});
