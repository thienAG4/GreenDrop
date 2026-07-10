angular.module('app').controller('RegisterController', function ($location, authService, notifyModalService) {
  var vm = this;
  vm.form = { full_name: '', phone: '', email: '', password: '', confirm_password: '' };
  vm.showPassword = false;
  vm.errorMessage = null;
  vm.submitting = false;

  var PHONE_RE = /^0\d{9}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  vm.phoneInvalid = function () {
    return vm.form.phone && !PHONE_RE.test(vm.form.phone);
  };
  vm.emailInvalid = function () {
    return vm.form.email && !EMAIL_RE.test(vm.form.email);
  };
  vm.passwordMismatch = function () {
    return vm.form.confirm_password && vm.form.password !== vm.form.confirm_password;
  };

  vm.togglePassword = function () { vm.showPassword = !vm.showPassword; };

  vm.canSubmit = function () {
    return vm.form.full_name && vm.form.phone && vm.form.email && vm.form.password &&
      !vm.phoneInvalid() && !vm.emailInvalid() && !vm.passwordMismatch();
  };

  vm.submit = function () {
    if (!vm.canSubmit()) return;
    vm.errorMessage = null;
    vm.submitting = true;
    authService.register({
      full_name: vm.form.full_name,
      phone: vm.form.phone,
      email: vm.form.email,
      password: vm.form.password,
    }).then(function () {
      vm.submitting = false;
      notifyModalService.success('Đăng ký thành công!');
      $location.path('/');
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Đăng ký thất bại';
    });
  };
});
