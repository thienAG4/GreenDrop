angular.module('app').factory('usersService', function ($http, API_BASE_URL) {
  function updateProfile(body) {
    return $http.put(API_BASE_URL + '/users/me', body).then(function (res) { return res.data.data; });
  }
  function listAddresses() {
    return $http.get(API_BASE_URL + '/users/me/addresses').then(function (res) { return res.data.data; });
  }
  function addAddress(body) {
    return $http.post(API_BASE_URL + '/users/me/addresses', body).then(function (res) { return res.data.data; });
  }
  function updateAddress(id, body) {
    return $http.put(API_BASE_URL + '/users/me/addresses/' + id, body).then(function (res) { return res.data.data; });
  }
  function deleteAddress(id) {
    return $http.delete(API_BASE_URL + '/users/me/addresses/' + id).then(function (res) { return res.data; });
  }
  function listAdmin(params) {
    return $http.get(API_BASE_URL + '/users', { params: params }).then(function (res) { return res.data.data; });
  }
  function setStatus(id, status) {
    return $http.put(API_BASE_URL + '/users/' + id + '/status', { status: status }).then(function (res) { return res.data; });
  }
  return {
    updateProfile: updateProfile, listAddresses: listAddresses, addAddress: addAddress,
    updateAddress: updateAddress, deleteAddress: deleteAddress, listAdmin: listAdmin, setStatus: setStatus,
  };
});
