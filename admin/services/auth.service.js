angular.module('adminApp').factory('authService', function ($http, $rootScope, API_BASE_URL, sessionService) {
  function login(credentials) {
    return $http.post(API_BASE_URL + '/auth/login', credentials).then(function (response) {
      var payload = response.data.data;
      if (payload.user.role !== 'admin' && payload.user.role !== 'staff') {
        throw { data: { error: 'Tài khoản này không có quyền truy cập trang quản trị.' } };
      }
      sessionService.setAuth(payload.token, payload.user);
      $rootScope.$broadcast('gd:auth-changed');
      return payload.user;
    });
  }

  function logout() {
    sessionService.clearAuth();
    $rootScope.$broadcast('gd:auth-changed');
  }

  function me() {
    return $http.get(API_BASE_URL + '/auth/me').then(function (res) { return res.data.data; });
  }

  return { login: login, logout: logout, me: me };
});
