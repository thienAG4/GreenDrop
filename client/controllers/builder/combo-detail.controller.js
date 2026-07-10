// Detail page for a single saved Builder design. Any visitor can open it (from
// the community catalog or their own saved-designs list) to see the generated
// image, components and price, and add it to their cart / buy it - a combo is
// buyable regardless of who created it (backend cart has no ownership check).
angular.module('app').controller('ComboDetailController', function (
  $routeParams, $location, combosService, cartService, wishlistService, notifyModalService
) {
  var vm = this;
  vm.loading = true;
  vm.notFound = false;
  vm.combo = null;
  vm.adding = false;
  vm.errorMessage = null;

  combosService.get($routeParams.id).then(function (combo) {
    vm.combo = combo;
  }).catch(function () {
    vm.notFound = true;
  }).finally(function () {
    vm.loading = false;
  });

  // Same three-level fallback the saved-designs list uses: persisted AI preview
  // first, then a component's own product photo, then a generic placeholder.
  vm.thumbnail = function () {
    if (!vm.combo) return 'https://placehold.co/600x400?text=%20';
    if (vm.combo.images && vm.combo.images[0]) return vm.combo.images[0].url;
    var withImage = (vm.combo.items || []).filter(function (i) { return i.image_url; })[0];
    return withImage ? withImage.image_url : 'https://placehold.co/600x400?text=%20';
  };

  vm.typeLabel = function () {
    return vm.combo && vm.combo.combo_type === '3d_builder' ? '3D Terrarium Studio' : 'AI Terrarium Builder';
  };

  var ROLE_LABELS = { pot: 'Chậu/bình', soil: 'Đất nền', plant: 'Cây', accessory: 'Phụ kiện' };
  vm.roleLabel = function (role) { return ROLE_LABELS[role] || role; };

  vm.isWishlisted = function () {
    return vm.combo && wishlistService.isWishlisted(vm.combo.combo_id, 'combo');
  };
  vm.toggleWishlist = function () {
    wishlistService.toggle(vm.combo, 'combo');
  };

  function addToCart() {
    vm.adding = true;
    vm.errorMessage = null;
    return cartService.addItem({ item_type: 'combo', combo_id: vm.combo.combo_id, quantity: 1 })
      .catch(function (err) {
        vm.errorMessage = (err.data && err.data.error) || 'Không thể thêm combo vào giỏ hàng';
        return Promise.reject(err);
      })
      .finally(function () { vm.adding = false; });
  }

  vm.addToCart = function () {
    addToCart().then(function () {
      notifyModalService.success('Đã thêm combo vào giỏ hàng!');
    });
  };

  vm.buyNow = function () {
    addToCart().then(function () {
      $location.path('/gio-hang');
    });
  };
});
