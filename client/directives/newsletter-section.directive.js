// Self-contained newsletter signup banner — no backend endpoint to receive
// subscriptions (decorative, like the Contact page form).
angular.module('app').directive('gdNewsletter', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'views/partials/section-newsletter.html',
    controllerAs: 'vm',
    controller: function (placeholderImagesService) {
      var vm = this;
      vm.image = placeholderImagesService.named('newsletter.png');
      vm.subscribed = false;
      vm.subscribe = function () { vm.subscribed = true; };
    },
  };
});
