// No backend table/endpoint for contact submissions (out of scope for the
// fixed schema), so this is a client-only form that simulates a success state.
angular.module('app').controller('ContactController', function () {
  var vm = this;
  vm.form = { name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', message: '' };
  vm.sent = false;

  vm.submit = function () {
    vm.sent = true;
  };
});
