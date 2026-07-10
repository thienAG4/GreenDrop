angular.module('app').factory('promotionsService', function ($http, API_BASE_URL) {
  function listActive() {
    return $http.get(API_BASE_URL + '/promotions').then(function (res) { return res.data.data; });
  }
  function listAll() {
    return $http.get(API_BASE_URL + '/promotions/all').then(function (res) { return res.data.data; });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/promotions', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/promotions/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/promotions/' + id).then(function (res) { return res.data; });
  }
  return { listActive: listActive, listAll: listAll, create: create, update: update, remove: remove };
});
