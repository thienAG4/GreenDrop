// Global notification modal, triggered via notifyModalService.success(...) or
// .info(...) from anywhere (login, register, admin create/update actions, a
// guest being told a feature needs an account, ...) instead of each page
// wiring up its own modal.
angular.module('app').directive('gdSuccessModal', function () {
  var ICONS = { success: 'bi-check-lg', info: 'bi-info-circle' };
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'views/partials/success-modal.html',
    controllerAs: 'vm',
    controller: function ($scope, $rootScope, $timeout) {
      var vm = this;
      vm.visible = false;
      vm.message = '';
      vm.type = 'success';
      vm.icon = ICONS.success;
      var hideTimer;

      $rootScope.$on('gd:notify', function (event, payload) {
        vm.message = (payload && payload.message) || 'Thao tác thành công!';
        vm.type = (payload && payload.type) || 'success';
        vm.icon = ICONS[vm.type] || ICONS.success;
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
