angular.module('app').controller('BlogDetailController', function ($routeParams, blogService) {
  var vm = this;
  vm.article = null;
  vm.related = [];
  vm.loading = true;

  blogService.getBySlug($routeParams.slug).then(function (article) {
    vm.article = article;
    vm.loading = false;
  }).catch(function () {
    vm.loading = false;
  });

  blogService.list().then(function (articles) {
    vm.related = articles.filter(function (a) { return a.slug !== $routeParams.slug; }).slice(0, 3);
  });

  // No COMMENTS table in the schema; comments are ephemeral (in-memory only,
  // reset on page reload) rather than a real, persisted feature.
  vm.comments = [];
  vm.commentForm = { name: '', email: '', message: '' };
  vm.submitComment = function () {
    if (!vm.commentForm.message) return;
    vm.comments.push(angular.copy(vm.commentForm));
    vm.commentForm = { name: '', email: '', message: '' };
  };
});
