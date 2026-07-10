angular.module('app').controller('ProfileController', function ($rootScope, authService, usersService) {
  var vm = this;
  vm.loading = true;
  vm.saved = false;

  authService.me().then(function (user) {
    vm.form = angular.copy(user);
    vm.loading = false;
  });

  vm.update = function () {
    vm.saved = false;
    usersService.updateProfile({
      full_name: vm.form.full_name,
      phone: vm.form.phone,
      gender: vm.form.gender,
    }).then(function (user) {
      vm.saved = true;
      var current = angular.extend({}, $rootScope.currentUser, user);
      localStorage.setItem('gd_user', JSON.stringify(current));
      $rootScope.$broadcast('gd:auth-changed');
    });
  };
});
