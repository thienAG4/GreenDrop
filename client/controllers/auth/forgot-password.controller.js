angular.module('app').controller('ForgotPasswordController', function ($location, authService) {
  var vm = this;
  vm.email = '';
  vm.errorMessage = null;
  vm.submitting = false;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  vm.emailInvalid = function () {
    return vm.email && !EMAIL_RE.test(vm.email);
  };

  vm.submit = function () {
    if (!vm.email || vm.emailInvalid()) {
      vm.errorMessage = 'Email không hợp lệ, vui lòng kiểm tra lại';
      return;
    }
    vm.errorMessage = null;
    vm.submitting = true;
    authService.forgotPassword(vm.email).then(function () {
      vm.submitting = false;
      $location.path('/ma-xac-thuc').search({ email: vm.email });
    });
  };
});
