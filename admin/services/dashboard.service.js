angular.module('adminApp').factory('dashboardService', function ($http, API_BASE_URL) {
  function getStats() {
    return $http.get(API_BASE_URL + '/dashboard/stats').then(function (res) { return res.data.data; });
  }
  return { getStats: getStats };
});
