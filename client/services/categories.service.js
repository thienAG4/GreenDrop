angular.module('app').factory('categoriesService', function ($http, API_BASE_URL) {
  function list() {
    return $http.get(API_BASE_URL + '/categories').then(function (res) { return res.data.data; });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/categories', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/categories/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/categories/' + id).then(function (res) { return res.data; });
  }
  return { list: list, create: create, update: update, remove: remove };
});
