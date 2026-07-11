angular.module('app').factory('combosService', function ($http, API_BASE_URL) {
  // Returns an array of AI-generated candidate previews ({ image_url, generated_at }).
  function aiPreview(items) {
    return $http.post(API_BASE_URL + '/combos/ai-preview', { items: items }).then(function (res) { return res.data.data.previews; });
  }
  function mine() {
    return $http.get(API_BASE_URL + '/combos/mine').then(function (res) { return res.data.data; });
  }
  function list() {
    return $http.get(API_BASE_URL + '/combos').then(function (res) { return res.data.data; });
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
  return { aiPreview: aiPreview, mine: mine, list: list, get: get, create: create, update: update, remove: remove };
});
