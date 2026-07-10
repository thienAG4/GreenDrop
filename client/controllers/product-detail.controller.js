angular.module('app').controller('ProductDetailController', function (
  $routeParams, $location, productsService, cartService, wishlistService, recentlyViewedService, notifyModalService
) {
  var vm = this;
  vm.loading = true;
  vm.product = null;
  vm.activeImage = null;
  vm.activeTab = 'description';
  vm.quantity = 1;
  vm.round = Math.round;
  vm.reviewFilter = null;

  vm.attributeGroups = [];
  vm.selectedAttribute = {};

  // Groups PRODUCT_ATTRIBUTES rows by their `type` for the interactive
  // selector - short values (e.g. a size code like "M") render as circular
  // buttons, longer descriptive values (e.g. "18cm x 18cm x 22cm" dimensions,
  // material descriptions) as rounded pills instead, since those overflow a
  // fixed-size circle and overlap surrounding text. Each product only ever
  // has one value per type in the seed data, so "selecting" is just a
  // cosmetic active state, not a real variant switch.
  var CIRCLE_MAX_LENGTH = 4;
  function buildAttributeGroups(attributes) {
    var byType = {};
    var order = [];
    (attributes || []).forEach(function (attr) {
      if (!byType[attr.type]) {
        byType[attr.type] = [];
        order.push(attr.type);
      }
      byType[attr.type].push(attr);
    });
    return order.map(function (type) {
      var values = byType[type];
      var allShort = values.every(function (attr) { return attr.value.length <= CIRCLE_MAX_LENGTH; });
      vm.selectedAttribute[type] = values[0];
      return { type: type, values: values, shape: allShort ? 'circle' : 'pill' };
    });
  }

  vm.selectAttribute = function (type, attr) {
    vm.selectedAttribute[type] = attr;
  };

  productsService.get($routeParams.id).then(function (product) {
    vm.product = product;
    vm.activeImage = product.images[0] ? product.images[0].url : 'https://placehold.co/600x600?text=No+Image';
    vm.attributeGroups = buildAttributeGroups(product.attributes);
    vm.loading = false;
    recentlyViewedService.record(product);
  });

  vm.setImage = function (url) { vm.activeImage = url; };
  vm.setTab = function (tab) { vm.activeTab = tab; };

  vm.changeQty = function (delta) {
    vm.quantity = Math.max(1, vm.quantity + delta);
  };

  vm.discountedPrice = function () {
    if (!vm.product) return 0;
    var discount = vm.product.active_discount_percent || 0;
    return Number(vm.product.price) * (1 - discount / 100);
  };

  vm.isWishlisted = function () {
    return vm.product && wishlistService.isWishlisted(vm.product.product_id);
  };
  vm.toggleWishlist = function () {
    wishlistService.toggle(vm.product);
  };

  vm.addToCart = function () {
    cartService.addItem({ item_type: 'product', product_id: vm.product.product_id, quantity: vm.quantity }).then(function () {
      vm.addedMessage = 'Đã thêm vào giỏ hàng!';
      notifyModalService.success('Đã thêm vào giỏ hàng!');
    });
  };

  vm.buyNow = function () {
    cartService.addItem({ item_type: 'product', product_id: vm.product.product_id, quantity: vm.quantity }).then(function () {
      $location.path('/gio-hang');
    });
  };

  vm.filteredReviews = function () {
    if (!vm.product) return [];
    if (!vm.reviewFilter) return vm.product.reviews;
    if (vm.reviewFilter === 'with-images') return vm.product.reviews.filter(function (r) { return r.image_url; });
    return vm.product.reviews.filter(function (r) { return r.rating === Number(vm.reviewFilter); });
  };
});
