// Self-contained "Follow us on Instagram" photo grid — no backend Instagram
// integration exists, this is decorative content using local placeholder images.
angular.module('app').directive('gdInstagramFeed', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'views/partials/section-instagram-feed.html',
    controllerAs: 'vm',
    controller: function (placeholderImagesService) {
      this.images = placeholderImagesService.namedList([
        'social_media_1.png', 'social_media_2.png', 'social_media_3.png',
        'social_media_4.png', 'social_media_5.png', 'social_media_6.png',
      ]);
    },
  };
});
