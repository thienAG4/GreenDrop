angular.module('adminApp').factory('vouchersService', function ($http, API_BASE_URL) {
  function list() {
    return $http.get(API_BASE_URL + '/vouchers').then(function (res) { return res.data.data; });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/vouchers', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/vouchers/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/vouchers/' + id).then(function (res) { return res.data; });
  }
  return { list: list, create: create, update: update, remove: remove };
});
