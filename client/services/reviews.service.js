angular.module('app').factory('reviewsService', function ($http, API_BASE_URL) {
  function forProduct(productId) {
    return $http.get(API_BASE_URL + '/reviews/product/' + productId).then(function (res) { return res.data.data; });
  }
  function mine() {
    return $http.get(API_BASE_URL + '/reviews/mine').then(function (res) { return res.data.data; });
  }
  function listAllAdmin() {
    return $http.get(API_BASE_URL + '/reviews/admin').then(function (res) { return res.data.data; });
  }
  function create(formData) {
    return $http
      .post(API_BASE_URL + '/reviews', formData, { headers: { 'Content-Type': undefined }, transformRequest: angular.identity })
      .then(function (res) { return res.data.data; });
  }
  function setVisibility(id, isVisible) {
    return $http.put(API_BASE_URL + '/reviews/' + id + '/visibility', { is_visible: isVisible }).then(function (res) {
      return res.data;
    });
  }
  return { forProduct: forProduct, mine: mine, listAllAdmin: listAllAdmin, create: create, setVisibility: setVisibility };
});
