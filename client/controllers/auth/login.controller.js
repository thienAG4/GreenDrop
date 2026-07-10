angular.module('app').controller('LoginController', function ($location, authService, notifyModalService) {
  var vm = this;
  vm.credentials = { email: '', password: '' };
  vm.showPassword = false;
  vm.errorMessage = null;
  vm.submitting = false;

  vm.togglePassword = function () { vm.showPassword = !vm.showPassword; };

  vm.submit = function () {
    vm.errorMessage = null;
    vm.submitting = true;
    authService.login(vm.credentials).then(function () {
      vm.submitting = false;
      notifyModalService.success('Đăng nhập thành công!');
      $location.path('/');
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Đăng nhập thất bại';
    });
  };
});
