angular.module('adminApp').factory('blogService', function ($http, API_BASE_URL) {
  function listAllAdmin(params) {
    return $http.get(API_BASE_URL + '/blog/admin', { params: params }).then(function (res) {
      return { items: res.data.data, meta: res.data.meta };
    });
  }
  function get(id) {
    return $http.get(API_BASE_URL + '/blog/admin/' + id).then(function (res) { return res.data.data; });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/blog', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/blog/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/blog/' + id).then(function (res) { return res.data; });
  }
  return { listAllAdmin: listAllAdmin, get: get, create: create, update: update, remove: remove };
});
