angular.module('app').factory('auditLogsService', function ($http, API_BASE_URL) {
  function list(params) {
    return $http.get(API_BASE_URL + '/audit-logs', { params: params }).then(function (res) { return res.data.data; });
  }
  return { list: list };
});
