// Shared image+overlay+CTA banner card — used by the Special Promo Banners
// (2-up) and Weekly Green Offer sections (the Full-Width Inspiration Banner
// hand-rolls the same .gd-promo-banner-overlay markup directly in home.html
// instead of using this directive - see the comment there).
// layout: 'overlay' (centered text over a full-bleed image, no split),
// 'split' (image one side, text+CTA the other), or 'seasonal' (left-aligned
// text over a left-to-right gradient, date pill top-right, big highlight
// value - used by Special Promo Banners).
angular.module('app').directive('gdPromoBanner', function () {
  return {
    restrict: 'E',
    scope: {
      image: '=',
      layout: '@',
      title: '@',
      subtitle: '@',
      ctaText: '@',
      ctaLink: '@',
      dateRange: '@',
      line1: '@',
      line2: '@',
      highlightValue: '@',
      disclaimer: '@',
    },
    templateUrl: 'views/partials/promo-banner.html',
    controllerAs: 'vm',
    controller: function ($scope) {
      var vm = this;
      vm.layoutClass = 'gd-promo-banner-' + ($scope.layout || 'overlay');
    },
  };
});
