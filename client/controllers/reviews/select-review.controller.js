angular.module('app').controller('SelectReviewController', function ($location, ordersService) {
  var vm = this;
  vm.loading = true;
  vm.filter = 'pending'; // pending | reviewed
  vm.reviewableItems = [];

  var orderIdFilter = $location.search().order_id ? Number($location.search().order_id) : null;

  ordersService.mine().then(function (orders) {
    var items = [];
    orders.filter(function (o) { return o.status === 'delivered'; }).forEach(function (order) {
      order.items.forEach(function (item) {
        items.push(angular.extend({}, item, { order_id: order.order_id, order_date: order.order_date }));
      });
    });
    vm.reviewableItems = orderIdFilter ? items.filter(function (i) { return i.order_id === orderIdFilter; }) : items;
    vm.loading = false;
  });

  vm.filteredItems = function () {
    return vm.reviewableItems.filter(function (i) {
      return vm.filter === 'pending' ? !i.is_reviewed : i.is_reviewed;
    });
  };

  vm.startReview = function (item) {
    $location.path('/danh-gia/' + item.order_item_id);
  };
});
