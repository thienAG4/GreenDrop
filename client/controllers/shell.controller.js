angular.module('app').controller('HeaderController', function ($rootScope, $location, sessionService, cartService, wishlistService, authService, notifyModalService) {
  var vm = this;
  vm.mobileNavOpen = false;

  vm.isActive = function (path) {
    return $location.path() === path;
  };

  vm.cartCount = function () {
    return cartService.itemCount();
  };

  vm.wishlistCount = function () {
    return wishlistService.getAll().length;
  };

  vm.toggleMobileNav = function () {
    vm.mobileNavOpen = !vm.mobileNavOpen;
  };

  vm.logout = function () {
    authService.logout();
    notifyModalService.success('Đăng xuất thành công!');
    $location.path('/');
  };

  cartService.refresh();
});

angular.module('app').controller('FooterController', function () {
  var vm = this;
  vm.year = new Date().getFullYear();
});
