// Self-contained "Mua nhanh hơn với GreenDrop App" banner — no real app
// store links exist, this is decorative/marketing content.
angular.module('app').directive('gdAppPromo', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'views/partials/section-app-promo.html',
    controllerAs: 'vm',
    controller: function (placeholderImagesService) {
      var appImage = placeholderImagesService.named('app_promotion.png');
      this.screens = [appImage, appImage, appImage, appImage, appImage];
    },
  };
});
