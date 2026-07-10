// Single card for the "Why choose GreenDrop?" 4-card row.
angular.module('app').directive('gdValuePropCard', function () {
  return {
    restrict: 'E',
    scope: { image: '=', title: '@', description: '@', ctaText: '@' },
    templateUrl: 'views/partials/value-prop-card.html',
  };
});
