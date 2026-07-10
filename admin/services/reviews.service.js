angular.module('adminApp').factory('reviewsService', function ($http, API_BASE_URL) {
  function listAllAdmin(params) {
    return $http.get(API_BASE_URL + '/reviews/admin', { params: params }).then(function (res) {
      return { items: res.data.data, meta: res.data.meta };
    });
  }
  function setVisibility(id, isVisible) {
    return $http.put(API_BASE_URL + '/reviews/' + id + '/visibility', { is_visible: isVisible }).then(function (res) {
      return res.data;
    });
  }
  return { listAllAdmin: listAllAdmin, setVisibility: setVisibility };
});
