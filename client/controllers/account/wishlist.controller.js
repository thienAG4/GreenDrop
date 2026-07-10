angular.module('app').controller('WishlistController', function ($rootScope, $q, wishlistService, cartService, notifyModalService) {
  var vm = this;
  vm.items = wishlistService.getAll();

  $rootScope.$on('gd:wishlist-changed', function (event, items) {
    vm.items = items;
  });

  vm.isCombo = function (item) { return item.item_type === 'combo'; };
  vm.itemLink = function (item) {
    return vm.isCombo(item) ? '/combo/' + item.combo_id : '/san-pham/' + item.product_id;
  };
  // Combos aren't stock-tracked as a unit (stock_quantity is null), so they're
  // always considered orderable here - an out-of-stock component is caught by
  // the backend on add and surfaced as an error instead.
  vm.isAvailable = function (item) {
    return vm.isCombo(item) || item.stock_quantity > 0;
  };

  vm.remove = function (item) {
    wishlistService.removeEntry(item);
  };

  function cartBody(item) {
    return vm.isCombo(item)
      ? { item_type: 'combo', combo_id: item.combo_id, quantity: 1 }
      : { item_type: 'product', product_id: item.product_id, quantity: 1 };
  }

  vm.addToCart = function (item) {
    cartService.addItem(cartBody(item)).then(function () {
      notifyModalService.success('Đã thêm vào giỏ hàng!');
    });
  };

  vm.addAllToCart = function () {
    var available = vm.items.filter(vm.isAvailable);
    $q.all(available.map(function (item) {
      return cartService.addItem(cartBody(item));
    })).then(function () {
      if (available.length) notifyModalService.success('Đã thêm tất cả sản phẩm vào giỏ hàng!');
    });
  };

  vm.clearAll = function () {
    wishlistService.clear();
  };
});
