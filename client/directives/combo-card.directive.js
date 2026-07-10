// Card for a community Builder combo, shaped like gd-product-card but flexible
// for the fields a combo actually has (no category/rating/stock; it carries a
// creator, item count and a single thumbnail). Used on the product list page so
// shoppers can discover and buy designs other customers built.
angular.module('app').directive('gdComboCard', function () {
  return {
    restrict: 'E',
    scope: { combo: '=' },
    templateUrl: 'views/partials/combo-card.html',
    controllerAs: 'vm',
    controller: function ($scope, wishlistService, cartService, notifyModalService) {
      var vm = this;

      vm.thumbnail = function () {
        return $scope.combo.thumbnail_url || 'https://placehold.co/400x400?text=Combo';
      };
      vm.typeLabel = function () {
        return $scope.combo.combo_type === '3d_builder' ? '3D Studio' : 'AI Builder';
      };

      vm.isWishlisted = function () {
        return wishlistService.isWishlisted($scope.combo.combo_id, 'combo');
      };
      vm.toggleWishlist = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        wishlistService.toggle($scope.combo, 'combo');
      };

      vm.quickAdd = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        cartService.addItem({ item_type: 'combo', combo_id: $scope.combo.combo_id, quantity: 1 }).then(function () {
          notifyModalService.success('Đã thêm combo vào giỏ hàng!');
        }).catch(function (err) {
          notifyModalService.info((err.data && err.data.error) || 'Không thể thêm combo vào giỏ hàng');
        });
      };
    },
  };
});
