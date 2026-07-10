angular.module('adminApp').factory('bannersService', function ($http, API_BASE_URL) {
  function listAll() {
    return $http.get(API_BASE_URL + '/banners/all').then(function (res) { return res.data.data; });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/banners', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/banners/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/banners/' + id).then(function (res) { return res.data; });
  }
  return { listAll: listAll, create: create, update: update, remove: remove };
});
