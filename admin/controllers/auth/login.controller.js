angular.module('adminApp').controller('AdminLoginController', function ($location, authService) {
  var vm = this;
  vm.credentials = { email: '', password: '' };
  vm.errorMessage = null;
  vm.submitting = false;

  vm.submit = function () {
    vm.errorMessage = null;
    vm.submitting = true;
    authService.login(vm.credentials).then(function () {
      vm.submitting = false;
      $location.path('/');
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Email hoặc mật khẩu không đúng.';
    });
  };
});
