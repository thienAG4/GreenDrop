angular.module('app').controller('VerifyCodeController', function ($location, $routeParams, authService) {
  var vm = this;
  vm.email = $routeParams.email;
  vm.digits = ['', '', '', '', '', ''];
  vm.errorMessage = null;
  vm.submitting = false;
  vm.resent = false;

  vm.onDigitInput = function (index, $event) {
    if (vm.digits[index] && index < 5) {
      var next = $event.target.parentElement.children[index + 1];
      if (next) next.focus();
    }
  };

  vm.resend = function () {
    authService.forgotPassword(vm.email).then(function () {
      vm.resent = true;
    });
  };

  vm.submit = function () {
    var code = vm.digits.join('');
    if (code.length !== 6) {
      vm.errorMessage = 'Vui lòng nhập đủ 6 chữ số';
      return;
    }
    vm.submitting = true;
    vm.errorMessage = null;
    authService.verifyResetCode(vm.email, code).then(function (result) {
      vm.submitting = false;
      $location.path('/tao-mat-khau-moi').search({ token: result.reset_token });
    }).catch(function (err) {
      vm.submitting = false;
      vm.errorMessage = (err.data && err.data.error) || 'Mã xác thực không đúng';
    });
  };
});
