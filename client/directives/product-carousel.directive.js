// Shared carousel for "standard product card" grids — used by the home
// page's Best Sellers, Highlighted Discounts, and Personalized Offers
// sections (per DESIGNS, all three mirror the same card anatomy/controls).
angular.module('app').directive('gdProductCarousel', function () {
  function chunkArr(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  return {
    restrict: 'E',
    scope: { products: '=', title: '@', subtitle: '@' },
    templateUrl: 'views/partials/product-carousel.html',
    controllerAs: 'vm',
    controller: function ($scope) {
      var vm = this;
      vm.chunks = [];
      vm._carousel = null;
      vm.carouselId = 'gdCarousel' + Math.floor(Math.random() * 1000000);

      vm.next = function () { if (vm._carousel) vm._carousel.next(); };
      vm.prev = function () { if (vm._carousel) vm._carousel.prev(); };

      $scope.$watchCollection('products', function (products) {
        vm.chunks = products && products.length ? chunkArr(products, 4) : [];
      });
    },
    link: function (scope, element) {
      var vm = scope.vm;
      scope.$watch('vm.chunks', function (chunks) {
        if (vm._carousel) { vm._carousel.dispose(); vm._carousel = null; }
        if (chunks && chunks.length > 1) {
          // Bootstrap's Carousel needs the ng-repeat'd slide DOM to already
          // exist, so defer to the next tick after Angular renders it.
          setTimeout(function () {
            var carouselEl = element[0].querySelector('.carousel');
            if (carouselEl && window.bootstrap) {
              vm._carousel = new window.bootstrap.Carousel(carouselEl, { interval: false, ride: false });
            }
          }, 0);
        }
      });
    },
  };
});
