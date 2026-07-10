// Global success-confirmation modal, triggered via notifyModalService.success(...)
// from anywhere (login, register, admin create/update actions, ...) instead of
// each page wiring up its own modal.
angular.module('adminApp').directive('gdSuccessModal', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'views/partials/success-modal.html',
    controllerAs: 'vm',
    controller: function ($scope, $rootScope, $timeout) {
      var vm = this;
      vm.visible = false;
      vm.message = '';
      var hideTimer;

      $rootScope.$on('gd:notify-success', function (event, message) {
        vm.message = message || 'Thao tác thành công!';
        vm.visible = true;
        if (hideTimer) $timeout.cancel(hideTimer);
        hideTimer = $timeout(function () { vm.visible = false; }, 2500);
      });

      vm.close = function () {
        if (hideTimer) $timeout.cancel(hideTimer);
        vm.visible = false;
      };

      $scope.$on('$destroy', function () {
        if (hideTimer) $timeout.cancel(hideTimer);
      });
    },
  };
});
