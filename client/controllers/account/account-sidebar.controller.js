angular.module('app').controller('AccountSidebarController', function ($location, $rootScope, authService, notifyModalService) {
  var side = this;
  side.showLogoutConfirm = false;

  side.isActive = function (path) {
    return $location.path() === path;
  };

  side.confirmLogout = function () {
    authService.logout();
    side.showLogoutConfirm = false;
    notifyModalService.success('Đăng xuất thành công!');
    $location.path('/');
  };
});
