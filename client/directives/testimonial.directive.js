// Quote + avatar + prev/next toggler. No TESTIMONIALS table exists (this is
// distinct from real product REVIEWS), so the array is passed in as static
// content from the page controller. Avatars are CSS-only colored-circle
// initials rather than fake stock photos, since no real customer photos exist.
angular.module('app').directive('gdTestimonial', function () {
  var AVATAR_COLORS = ['#2F5B3B', '#09AD2A', '#F5B83D', '#3498DB', '#E74C3C', '#78C27B'];

  return {
    restrict: 'E',
    scope: { testimonials: '=' },
    templateUrl: 'views/partials/testimonial.html',
    controllerAs: 'vm',
    controller: function ($scope) {
      var vm = this;
      vm.index = 0;

      vm.current = function () {
        return ($scope.testimonials || [])[vm.index];
      };
      vm.initials = function (name) {
        if (!name) return '';
        var parts = name.trim().split(/\s+/);
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
      };
      vm.avatarColor = function () {
        return AVATAR_COLORS[vm.index % AVATAR_COLORS.length];
      };
      vm.next = function () {
        var list = $scope.testimonials || [];
        if (list.length) vm.index = (vm.index + 1) % list.length;
      };
      vm.prev = function () {
        var list = $scope.testimonials || [];
        if (list.length) vm.index = (vm.index - 1 + list.length) % list.length;
      };
    },
  };
});
