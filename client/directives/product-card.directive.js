angular.module('app').directive('gdProductCard', function () {
  return {
    restrict: 'E',
    scope: { product: '=' },
    templateUrl: 'views/partials/product-card.html',
    controllerAs: 'vm',
    controller: function ($scope, wishlistService, cartService, notifyModalService) {
      var vm = this;
      vm.round = Math.round;

      vm.isWishlisted = function () {
        return wishlistService.isWishlisted($scope.product.product_id);
      };

      vm.toggleWishlist = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        wishlistService.toggle($scope.product);
      };

      vm.discountPercent = function () {
        return $scope.product.active_discount_percent || 0;
      };

      vm.discountedPrice = function () {
        var discount = vm.discountPercent();
        if (!discount) return Number($scope.product.price);
        return Number($scope.product.price) * (1 - discount / 100);
      };

      vm.quickAdd = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        cartService.addItem({ item_type: 'product', product_id: $scope.product.product_id, quantity: 1 }).then(function () {
          notifyModalService.success('Đã thêm vào giỏ hàng!');
        });
      };
    },
  };
});
