angular.module('adminApp').factory('ordersService', function ($http, API_BASE_URL) {
  function adminList(params) {
    return $http.get(API_BASE_URL + '/orders/admin', { params: params }).then(function (res) {
      return { items: res.data.data, meta: res.data.meta };
    });
  }
  function adminStats() {
    return $http.get(API_BASE_URL + '/orders/admin/stats').then(function (res) { return res.data.data; });
  }
  function get(id) {
    return $http.get(API_BASE_URL + '/orders/' + id).then(function (res) { return res.data.data; });
  }
  function updateStatus(id, status) {
    return $http.post(API_BASE_URL + '/orders/' + id + '/status', { status: status }).then(function (res) { return res.data.data; });
  }
  function adminCancel(id, reason) {
    return $http.post(API_BASE_URL + '/orders/' + id + '/admin-cancel', { reason: reason }).then(function (res) { return res.data.data; });
  }
  return {
    adminList: adminList,
    adminStats: adminStats,
    get: get,
    updateStatus: updateStatus,
    adminCancel: adminCancel,
  };
});
