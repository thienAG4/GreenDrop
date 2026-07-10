angular.module('app').controller('CheckoutController', function (
  $location, $rootScope, cartService, usersService, ordersService, vouchersService
) {
  var vm = this;
  vm.loading = true;
  vm.cart = { items: [], subtotal: 0 };
  vm.addresses = [];
  vm.selectedAddressId = null;
  vm.showAddressModal = false;
  vm.showConfirmModal = false;
  vm.showStockOutModal = false;
  vm.submitting = false;
  vm.errorMessage = null;

  vm.isLoggedIn = $rootScope.isLoggedIn;

  vm.guest = { full_name: '', phone: '', email: '' };
  vm.newAddress = { address_line: '', city: '', district: '', save_for_later: true };
  vm.usingNewAddress = false;

  // Voucher is chosen/previewed on the cart page and just carried over here
  // (read-only) - see vouchersService's shared applied-voucher state.
  var appliedVoucher = vouchersService.getApplied();
  vm.voucherCode = appliedVoucher.code;
  vm.voucherResult = appliedVoucher.result;

  vm.SHIPPING_FEE = 20000; // flat fee, matches backend constants.SHIPPING_FEE

  vm.paymentMethods = [
    { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash' },
    { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng (ATM)', icon: 'bi-bank' },
    { value: 'e_wallet', label: 'Ví điện tử (Momo)', icon: 'bi-wallet2' },
    { value: 'credit_card', label: 'Thẻ tín dụng (Visa/Mastercard)', icon: 'bi-credit-card' },
  ];
  vm.paymentMethod = 'cod';

  cartService.refresh().then(function (cart) {
    vm.cart = cart;
    vm.loading = false;
    if (!cart.items.length) $location.path('/gio-hang');
  });

  if (vm.isLoggedIn) {
    usersService.listAddresses().then(function (addresses) {
      vm.addresses = addresses;
      var def = addresses.filter(function (a) { return a.is_default; })[0];
      vm.selectedAddressId = def ? def.address_id : (addresses[0] ? addresses[0].address_id : null);
      vm.usingNewAddress = !addresses.length;
    });
  } else {
    vm.usingNewAddress = true;
  }

  vm.selectAddress = function (id) {
    vm.selectedAddressId = id;
    vm.usingNewAddress = false;
    vm.showAddressModal = false;
  };

  vm.addNewAddress = function () {
    vm.usingNewAddress = true;
    vm.showAddressModal = false;
  };

  vm.total = function () {
    var discount = vm.voucherResult ? vm.voucherResult.discount_amount : 0;
    return vm.cart.subtotal - discount + vm.SHIPPING_FEE;
  };

  vm.backToCart = function () {
    $location.path('/gio-hang');
  };

  vm.openConfirm = function () {
    if (!vm.isLoggedIn && (!vm.guest.full_name || !vm.guest.phone)) {
      vm.errorMessage = 'Vui lòng nhập họ tên và số điện thoại.';
      return;
    }
    if (!vm.usingNewAddress && !vm.selectedAddressId) {
      vm.errorMessage = 'Vui lòng chọn địa chỉ giao hàng.';
      return;
    }
    if (vm.usingNewAddress && !vm.newAddress.address_line) {
      vm.errorMessage = 'Vui lòng nhập địa chỉ giao hàng.';
      return;
    }
    vm.errorMessage = null;
    vm.showConfirmModal = true;
  };

  vm.confirmOrder = function () {
    vm.showConfirmModal = false;
    vm.submitting = true;

    var body = {
      payment_method: vm.paymentMethod,
      voucher_code: vm.voucherResult ? vm.voucherCode : undefined,
    };
    if (vm.usingNewAddress) {
      body.new_address = vm.newAddress;
    } else {
      body.address_id = vm.selectedAddressId;
    }
    if (!vm.isLoggedIn) {
      body.guest_full_name = vm.guest.full_name;
      body.guest_phone = vm.guest.phone;
      body.guest_email = vm.guest.email;
    }

    ordersService.checkout(body).then(function (result) {
      vm.submitting = false;
      vouchersService.clearApplied();
      if (result.payment) {
        $location.path('/checkout/thanh-toan/' + result.order.order_id);
      } else {
        $location.path('/checkout/thanh-cong/' + result.order.order_id);
      }
    }).catch(function (err) {
      vm.submitting = false;
      var message = (err.data && err.data.error) || 'Đã xảy ra lỗi.';
      if (err.status === 409) {
        vm.showStockOutModal = true;
        setTimeout(function () {
          $location.path('/gio-hang');
          $rootScope.$apply();
        }, 3000);
      } else {
        vm.errorMessage = message;
      }
    });
  };
});
