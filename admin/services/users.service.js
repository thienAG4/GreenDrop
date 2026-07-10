angular.module('adminApp').factory('usersService', function ($http, API_BASE_URL) {
  function listAdmin(params) {
    return $http.get(API_BASE_URL + '/users', { params: params }).then(function (res) { return res; });
  }
  function getDetail(id) {
    return $http.get(API_BASE_URL + '/users/' + id).then(function (res) { return res.data.data; });
  }
  return { listAdmin: listAdmin, getDetail: getDetail };
});
