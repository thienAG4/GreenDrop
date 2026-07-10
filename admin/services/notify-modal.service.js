// Central trigger for the global success-confirmation modal (gd-success-modal,
// mounted once in index.html outside ng-view so it survives route changes).
// Controllers call notifyModalService.success('...') after an action completes
// instead of each page building its own modal markup/state.
angular.module('adminApp').factory('notifyModalService', function ($rootScope) {
  function success(message) {
    $rootScope.$broadcast('gd:notify-success', message);
  }
  return { success: success };
});
