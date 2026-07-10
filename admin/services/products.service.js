angular.module('adminApp').factory('productsService', function ($http, API_BASE_URL) {
  function list(params) {
    return $http.get(API_BASE_URL + '/products', { params: params }).then(function (res) {
      return { items: res.data.data, meta: res.data.meta };
    });
  }
  function get(id) {
    return $http.get(API_BASE_URL + '/products/' + id).then(function (res) { return res.data.data; });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/products', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/products/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/products/' + id).then(function (res) { return res.data; });
  }
  return { list: list, get: get, create: create, update: update, remove: remove };
});
