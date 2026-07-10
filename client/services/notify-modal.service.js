// Central trigger for the global notification modal (gd-success-modal,
// mounted once in index.html outside ng-view so it survives route changes).
// Controllers call notifyModalService.success('...') after an action completes,
// or .info('...') for a neutral heads-up (e.g. "sign in to use this feature")
// that isn't confirming anything succeeded - instead of each page building
// its own modal markup/state.
angular.module('app').factory('notifyModalService', function ($rootScope) {
  function notify(message, type) {
    $rootScope.$broadcast('gd:notify', { message: message, type: type });
  }
  function success(message) { notify(message, 'success'); }
  function info(message) { notify(message, 'info'); }
  return { success: success, info: info };
});
