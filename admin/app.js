angular.module('adminApp', ['ngRoute', 'ngAnimate'])
  .constant('API_BASE_URL', 'http://localhost:4000/api')
  .config(function ($locationProvider) {
    $locationProvider.html5Mode({ enabled: true, requireBase: true });
  })
  .run(function ($rootScope, $location, sessionService) {
    $rootScope.currentUser = sessionService.getUser();
    $rootScope.isLoggedIn = sessionService.isLoggedIn();

    function isStaffOrAdmin() {
      var role = sessionService.getUser().role;
      return role === 'admin' || role === 'staff';
    }

    // Every route needs a staff/admin session except the login page itself -
    // simpler than client/app.js's per-route access config since this whole
    // app is admin-only (no customer-facing routes to distinguish).
    $rootScope.$on('$routeChangeStart', function (event, next) {
      if (!next || !next.$$route) return;
      if (next.$$route.originalPath === '/dang-nhap') return;

      if (!sessionService.isLoggedIn() || !isStaffOrAdmin()) {
        event.preventDefault();
        $location.path('/dang-nhap');
      }
    });

    $rootScope.$on('gd:auth-changed', function () {
      $rootScope.currentUser = sessionService.getUser();
      $rootScope.isLoggedIn = sessionService.isLoggedIn();
    });
  });
