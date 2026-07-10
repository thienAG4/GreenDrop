angular.module('adminApp').factory('combosService', function ($http, API_BASE_URL) {
  function listAllAdmin() {
    return $http.get(API_BASE_URL + '/combos/admin').then(function (res) { return res.data.data; });
  }
  function get(id) {
    return $http.get(API_BASE_URL + '/combos/' + id).then(function (res) { return res.data.data; });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/combos', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/combos/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/combos/' + id).then(function (res) { return res.data; });
  }
  return { listAllAdmin: listAllAdmin, get: get, create: create, update: update, remove: remove };
});
