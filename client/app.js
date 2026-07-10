angular.module('app', ['ngRoute', 'ngAnimate'])
  .constant('API_BASE_URL', 'http://localhost:4000/api')
  .config(function ($locationProvider) {
    $locationProvider.html5Mode({ enabled: true, requireBase: true });
  })
  .run(function ($rootScope, $location, sessionService, notifyModalService) {
    $rootScope.currentUser = sessionService.getUser();
    $rootScope.isLoggedIn = sessionService.isLoggedIn();

    // Tracks the last successfully-resolved URL so a blocked navigation can
    // put the address bar back where it was (ngRoute doesn't do this itself
    // when a route change is cancelled - the URL would otherwise show the
    // blocked destination while the old view stays on screen underneath).
    var lastAllowedUrl = null;

    $rootScope.$on('$routeChangeStart', function (event, next) {
      if (!next || !next.$$route) return;
      var access = next.$$route.access;
      if (!access) return;

      if (access.requiresAuth && !sessionService.isLoggedIn()) {
        event.preventDefault();
        notifyModalService.info('Vui lòng đăng nhập hoặc đăng ký để sử dụng tính năng này.');
        // A guest clicking a customer-only link/button stays on the page
        // they were already on instead of being dropped onto the login
        // screen. The only exception is landing here with no prior page at
        // all (a direct link or hard refresh straight into a protected
        // URL) - there's nothing to fall back to, so send them to login.
        // .url() (not .path()) because lastAllowedUrl may carry a query
        // string (e.g. "/san-pham?category_id=2"), which .path() would
        // mangle by treating the whole string as a literal path segment.
        $location.url(lastAllowedUrl || '/dang-nhap');
        return;
      }
      if (access.roles && access.roles.indexOf(sessionService.getUser().role) === -1) {
        event.preventDefault();
        $location.path('/');
      }
    });

    $rootScope.$on('$routeChangeSuccess', function () {
      lastAllowedUrl = $location.url();
    });

    $rootScope.$on('gd:auth-changed', function () {
      $rootScope.currentUser = sessionService.getUser();
      $rootScope.isLoggedIn = sessionService.isLoggedIn();
    });
  });
