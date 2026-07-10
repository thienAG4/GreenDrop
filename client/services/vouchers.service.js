angular.module('app').factory('vouchersService', function ($http, API_BASE_URL) {
  // Applied-voucher state shared between the cart page (where it's chosen/previewed)
  // and the checkout page (which just reads it, per the improved voucher flow) -
  // this factory is a singleton for the life of the SPA, so it survives route changes.
  var applied = { code: null, result: null };

  function getApplied() {
    return applied;
  }

  function setApplied(code, result) {
    applied.code = code;
    applied.result = result;
  }

  function clearApplied() {
    applied.code = null;
    applied.result = null;
  }

  function list() {
    return $http.get(API_BASE_URL + '/vouchers').then(function (res) { return res.data.data; });
  }
  function listActive() {
    return $http.get(API_BASE_URL + '/vouchers/active').then(function (res) { return res.data.data; });
  }
  function check(code, subtotal) {
    return $http.get(API_BASE_URL + '/vouchers/check/' + code, { params: { subtotal: subtotal } }).then(function (res) {
      return res.data.data;
    });
  }
  function create(body) {
    return $http.post(API_BASE_URL + '/vouchers', body).then(function (res) { return res.data.data; });
  }
  function update(id, body) {
    return $http.put(API_BASE_URL + '/vouchers/' + id, body).then(function (res) { return res.data.data; });
  }
  function remove(id) {
    return $http.delete(API_BASE_URL + '/vouchers/' + id).then(function (res) { return res.data; });
  }
  return {
    list: list, listActive: listActive, check: check, create: create, update: update, remove: remove,
    getApplied: getApplied, setApplied: setApplied, clearApplied: clearApplied,
  };
});
