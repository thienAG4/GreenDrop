angular.module('app').controller('ChangePasswordController', function (authService, notifyModalService) {
  var vm = this;
  vm.form = { current_password: '', new_password: '', confirm_password: '' };
  vm.errorMessage = null;
  vm.success = false;
  vm.submitting = false;

  vm.passwordMismatch = function () {
    return vm.form.confirm_password && vm.form.new_password !== vm.form.confirm_password;
  };

  vm.submit = function () {
    if (vm.passwordMismatch()) return;
    vm.submitting = true;
    vm.errorMessage = null;
    vm.success = false;
    authService.changePassword(vm.form.current_password, vm.form.new_password).then(function () {
      vm.submitting = false;
      vm.success = true;
      notifyModalService.success('Đổi mật khẩu thành công!');
      vm.form = { current_password: '', new_password: '', confirm_password: '' };
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Không thể cập nhật mật khẩu';
    });
  };
});
