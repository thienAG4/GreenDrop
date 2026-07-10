angular.module('app').controller('ResetPasswordController', function ($location, $routeParams, authService) {
  var vm = this;
  vm.resetToken = $routeParams.token;
  vm.form = { new_password: '', confirm_password: '' };
  vm.errorMessage = null;
  vm.submitting = false;

  vm.passwordMismatch = function () {
    return vm.form.confirm_password && vm.form.new_password !== vm.form.confirm_password;
  };

  vm.submit = function () {
    if (!vm.form.new_password || vm.passwordMismatch()) return;
    vm.submitting = true;
    vm.errorMessage = null;
    authService.resetPassword(vm.resetToken, vm.form.new_password).then(function () {
      vm.submitting = false;
      $location.path('/dang-nhap');
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Không thể đặt lại mật khẩu';
    });
  };
});
