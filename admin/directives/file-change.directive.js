// ng-model doesn't work on <input type="file">, so this bridges the native
// change event's FileList into an Angular callback.
angular.module('adminApp').directive('gdFileChange', function () {
  return {
    restrict: 'A',
    scope: { gdFileChange: '&' },
    link: function (scope, element) {
      element.on('change', function (event) {
        scope.$apply(function () {
          scope.gdFileChange({ files: event.target.files });
        });
      });
    },
  };
});
