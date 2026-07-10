angular.module('app').factory('authInterceptor', function (sessionService) {
  return {
    request: function (config) {
      var token = sessionService.getToken();
      if (token) config.headers.Authorization = 'Bearer ' + token;
      config.headers['X-Session-Token'] = sessionService.getSessionToken();
      return config;
    },
  };
});

angular.module('app').config(function ($httpProvider, $routeProvider, $locationProvider) {
  $httpProvider.interceptors.push('authInterceptor');
  $locationProvider.hashPrefix('!');
});
