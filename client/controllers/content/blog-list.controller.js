angular.module('app').controller('BlogListController', function (blogService) {
  var vm = this;
  vm.articles = [];
  vm.loading = true;

  blogService.list().then(function (articles) {
    vm.articles = articles;
    vm.loading = false;
  });
});
