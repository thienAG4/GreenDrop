// Minimal native HTML5 drag-and-drop bridge for the Combo Builder canvas.
// AngularJS core has no drag/drop directives, so this wraps the native events.
angular.module('app')
  .directive('gdDraggableItem', function () {
    return {
      restrict: 'A',
      scope: { gdDraggableItem: '&' },
      link: function (scope, element) {
        element.on('dragstart', function () {
          scope.gdDraggableItem();
        });
      },
    };
  })
  .directive('gdDropzone', function () {
    return {
      restrict: 'A',
      scope: { gdDropzone: '&' },
      link: function (scope, element) {
        element.on('dragover', function (event) {
          event.preventDefault();
        });
        element.on('drop', function (event) {
          event.preventDefault();
          scope.$apply(function () {
            scope.gdDropzone({ $event: event });
          });
        });
      },
    };
  });
