angular.module('app').controller('CartController', function ($location, cartService, wishlistService, vouchersService, notifyModalService) {
  var vm = this;
  vm.loading = true;
  vm.cart = { items: [], subtotal: 0 };
  vm.vouchers = [];

  var appliedVoucher = vouchersService.getApplied();
  vm.voucherCode = appliedVoucher.code || '';
  vm.voucherResult = appliedVoucher.result;
  vm.voucherError = null;

  cartService.refresh().then(function (cart) {
    vm.cart = cart;
    vm.loading = false;
  });

  vouchersService.listActive().then(function (vouchers) { vm.vouchers = vouchers; });

  // Preview only - the discount isn't committed to an order until checkout.
  vm.applyVoucher = function (code) {
    vm.voucherError = null;
    var useCode = code || vm.voucherCode;
    if (!useCode) return;
    vouchersService.check(useCode, vm.cart.subtotal).then(function (result) {
      vm.voucherCode = useCode;
      vm.voucherResult = result;
      vouchersService.setApplied(useCode, result);
    }).catch(function (err) {
      vm.voucherResult = null;
      vouchersService.clearApplied();
      vm.voucherError = (err.data && err.data.error) || 'Voucher không hợp lệ';
    });
  };

  vm.disableVoucher = function () {
    vm.voucherCode = '';
    vm.voucherResult = null;
    vm.voucherError = null;
    vouchersService.clearApplied();
  };

  vm.total = function () {
    var discount = vm.voucherResult ? vm.voucherResult.discount_amount : 0;
    return vm.cart.subtotal - discount;
  };

  vm.changeQty = function (line, delta) {
    var next = line.quantity + delta;
    if (next < 1) return;
    if (line.item_type === 'product' && next > line.stock_quantity) return;
    cartService.updateItem({ item_type: line.item_type, product_id: line.product_id, combo_id: line.combo_id, quantity: next }).then(
      function (cart) { vm.cart = cart; }
    );
  };

  vm.removeItem = function (line) {
    cartService.removeItem({ item_type: line.item_type, product_id: line.product_id, combo_id: line.combo_id }).then(
      function (cart) { vm.cart = cart; }
    );
  };

  // "Thêm vào yêu thích" = add to the wishlist. It only adds (keeps the item in
  // the cart) - it used to also remove the line, which read as the cart being
  // cleared. Works for both products and combos; add-only/idempotent so a
  // second click doesn't toggle it back off.
  vm.addToWishlist = function (line) {
    var type = line.item_type;
    var id = type === 'combo' ? line.combo_id : line.product_id;
    if (wishlistService.isWishlisted(id, type)) {
      notifyModalService.info('Sản phẩm đã có trong danh sách yêu thích');
      return;
    }
    var entity = type === 'combo'
      ? { combo_id: line.combo_id, name: line.name, total_price: line.unit_price, thumbnail_url: line.image_url }
      : { product_id: line.product_id, name: line.name, price: line.unit_price, stock_quantity: line.stock_quantity, image: line.image_url };
    wishlistService.toggle(entity, type);
    notifyModalService.success('Đã thêm vào yêu thích!');
  };

  vm.isVoucherExpired = function (voucher) {
    return new Date(voucher.end_at) < new Date();
  };

  vm.goToCheckout = function () {
    $location.path('/checkout');
  };
});
