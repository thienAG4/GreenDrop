angular.module('app').factory('authService', function ($http, $rootScope, API_BASE_URL, sessionService, cartService, wishlistService) {
  function applyAuth(response) {
    var payload = response.data.data;
    sessionService.setAuth(payload.token, payload.user);
    $rootScope.$broadcast('gd:auth-changed');
    // Reload the cart so the header badge reflects the freshly logged-in
    // user's cart instead of the previous (guest) session's stale count.
    cartService.refresh();
    return payload.user;
  }

  function register(body) {
    return $http.post(API_BASE_URL + '/auth/register', body).then(applyAuth);
  }

  function login(credentials) {
    return $http.post(API_BASE_URL + '/auth/login', credentials).then(applyAuth);
  }

  function logout() {
    sessionService.clearAuth();
    $rootScope.$broadcast('gd:auth-changed');
    // Reset per-session UI state so the header badges don't keep showing the
    // logged-out user's items: the cart badge reads an in-memory cache (stale
    // until refreshed) and the wishlist is browser-local localStorage. Both
    // otherwise linger after logout until the user opens that page
    // (improvement.md #4).
    wishlistService.clear();
    cartService.refresh();
  }

  function me() {
    return $http.get(API_BASE_URL + '/auth/me').then(function (res) {
      return res.data.data;
    });
  }

  function forgotPassword(email) {
    return $http.post(API_BASE_URL + '/auth/forgot-password', { email: email }).then(function (res) {
      return res.data;
    });
  }

  function verifyResetCode(email, code) {
    return $http.post(API_BASE_URL + '/auth/verify-reset-code', { email: email, code: code }).then(function (res) {
      return res.data.data;
    });
  }

  function resetPassword(resetToken, newPassword) {
    return $http
      .post(API_BASE_URL + '/auth/reset-password', { reset_token: resetToken, new_password: newPassword })
      .then(function (res) {
        return res.data;
      });
  }

  function changePassword(currentPassword, newPassword) {
    return $http
      .post(API_BASE_URL + '/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      .then(function (res) {
        return res.data;
      });
  }

  return {
    register: register,
    login: login,
    logout: logout,
    me: me,
    forgotPassword: forgotPassword,
    verifyResetCode: verifyResetCode,
    resetPassword: resetPassword,
    changePassword: changePassword,
  };
});
