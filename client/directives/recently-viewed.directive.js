// Self-contained "recently viewed products" section — drop it onto any page
// with no attributes needed. Optionally pass exclude-id (e.g. the current
// product on its own detail page) to keep it out of its own carousel.
angular.module('app').directive('gdRecentlyViewed', function () {
  return {
    restrict: 'E',
    scope: { excludeId: '=?' },
    templateUrl: 'views/partials/section-recently-viewed.html',
    controllerAs: 'vm',
    controller: function ($scope, recentlyViewedService) {
      var vm = this;
      var items = recentlyViewedService.list();
      if ($scope.excludeId) {
        items = items.filter(function (i) { return i.product_id !== $scope.excludeId; });
      }
      vm.items = items;
    },
  };
});
