angular.module('adminApp').controller('ShellController', function ($location, $rootScope, authService) {
  var vm = this;

  vm.isActive = function (path) {
    return $location.path() === path;
  };

  vm.isLoginPage = function () {
    return $location.path() === '/dang-nhap';
  };

  vm.isAdmin = function () {
    return $rootScope.currentUser && $rootScope.currentUser.role === 'admin';
  };

  vm.logout = function () {
    authService.logout();
    $location.path('/dang-nhap');
  };
});
