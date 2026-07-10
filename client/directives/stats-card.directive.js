// Green 3-stat block for the About Us section, e.g. [{value:'25+', label:'Danh mục'}, ...]
angular.module('app').directive('gdStatsCard', function () {
  return {
    restrict: 'E',
    scope: { stats: '=' },
    templateUrl: 'views/partials/stats-card.html',
  };
});
