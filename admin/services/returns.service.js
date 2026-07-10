angular.module('adminApp').factory('returnsService', function ($http, API_BASE_URL) {
  function listAll(params) {
    return $http.get(API_BASE_URL + '/returns/all', { params: params }).then(function (res) { return res.data.data; });
  }
  function get(id) {
    return $http.get(API_BASE_URL + '/returns/' + id).then(function (res) { return res.data.data; });
  }
  function approve(id) {
    return $http.post(API_BASE_URL + '/returns/' + id + '/approve', {}).then(function (res) { return res.data.data; });
  }
  function reject(id, reject_reason) {
    return $http.post(API_BASE_URL + '/returns/' + id + '/reject', { reject_reason: reject_reason }).then(function (res) {
      return res.data.data;
    });
  }
  function itemReceived(id, body) {
    return $http.post(API_BASE_URL + '/returns/' + id + '/item-received', body || {}).then(function (res) {
      return res.data.data;
    });
  }
  function listRefunds(params) {
    return $http.get(API_BASE_URL + '/returns/refunds', { params: params }).then(function (res) { return res.data.data; });
  }
  function retryRefund(refundId, simulateOutcome) {
    return $http.post(API_BASE_URL + '/returns/refunds/' + refundId + '/retry', { simulate_outcome: simulateOutcome }).then(
      function (res) { return res.data.data; }
    );
  }
  return {
    listAll: listAll, get: get, approve: approve, reject: reject,
    itemReceived: itemReceived, listRefunds: listRefunds, retryRefund: retryRefund,
  };
});
