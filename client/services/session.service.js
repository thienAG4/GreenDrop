angular.module('app').factory('sessionService', function () {
  var TOKEN_KEY = 'gd_token';
  var USER_KEY = 'gd_user';
  var SESSION_KEY = 'gd_session_token';

  function uuid() {
    return 'sess-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionToken() {
    var token = localStorage.getItem(SESSION_KEY);
    if (!token) {
      token = uuid();
      localStorage.setItem(SESSION_KEY, token);
    }
    return token;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    var raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  function setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  return {
    getSessionToken: getSessionToken,
    getToken: getToken,
    getUser: getUser,
    setAuth: setAuth,
    clearAuth: clearAuth,
    isLoggedIn: isLoggedIn,
  };
});
