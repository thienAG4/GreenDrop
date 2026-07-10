angular.module('app').factory('ordersService', function ($http, API_BASE_URL) {
  function checkout(body) {
    return $http.post(API_BASE_URL + '/orders', body).then(function (res) { return res.data.data; });
  }
  function mine() {
    return $http.get(API_BASE_URL + '/orders/mine').then(function (res) { return res.data.data; });
  }
  function adminList(params) {
    return $http.get(API_BASE_URL + '/orders/admin', { params: params }).then(function (res) { return res.data.data; });
  }
  function track(orderId, phone) {
    return $http.get(API_BASE_URL + '/orders/track', { params: { order_id: orderId, phone: phone } }).then(function (res) {
      return res.data.data;
    });
  }
  function get(id) {
    return $http.get(API_BASE_URL + '/orders/' + id).then(function (res) { return res.data.data; });
  }
  function confirmPayment(id, outcome) {
    return $http.post(API_BASE_URL + '/orders/' + id + '/payment/confirm', { outcome: outcome }).then(function (res) {
      return res.data.data;
    });
  }
  function cancel(id, reason, bankInfo) {
    return $http.post(API_BASE_URL + '/orders/' + id + '/cancel', { reason: reason, bank_info: bankInfo }).then(function (res) {
      return res.data.data;
    });
  }
  function updateStatus(id, status) {
    return $http.post(API_BASE_URL + '/orders/' + id + '/status', { status: status }).then(function (res) { return res.data.data; });
  }
  function adminCancel(id, reason) {
    return $http.post(API_BASE_URL + '/orders/' + id + '/admin-cancel', { reason: reason }).then(function (res) { return res.data.data; });
  }
  return {
    checkout: checkout, mine: mine, adminList: adminList, track: track, get: get,
    confirmPayment: confirmPayment, cancel: cancel, updateStatus: updateStatus, adminCancel: adminCancel,
  };
});
