angular.module('adminApp').controller('BlogController', function (blogService, uploadsService, notifyModalService) {
  var vm = this;
  vm.loading = true;
  vm.posts = [];
  vm.meta = { total: 0, page: 1, limit: 10 };
  vm.showForm = false;
  vm.editingId = null;
  vm.form = {};
  vm.errorMessage = null;
  vm.uploading = false;

  var STATUS_LABELS = { draft: 'Bản nháp', published: 'Đã đăng' };
  vm.statusLabel = function (status) { return STATUS_LABELS[status] || status; };

  function load() {
    vm.loading = true;
    blogService.listAllAdmin({ page: vm.meta.page, limit: vm.meta.limit }).then(function (res) {
      vm.posts = res.items;
      vm.meta = res.meta;
      vm.loading = false;
    });
  }
  load();

  vm.totalPages = function () { return Math.max(1, Math.ceil(vm.meta.total / vm.meta.limit)); };
  vm.goToPage = function (page) {
    if (page < 1 || page > vm.totalPages()) return;
    vm.meta.page = page;
    load();
  };
  vm.pageRange = function () {
    var total = vm.totalPages();
    var current = vm.meta.page;
    var start = Math.max(1, current - 2);
    var end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    var pages = [];
    for (var i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  vm.newPost = function () {
    vm.form = { title: '', excerpt: '', content: '', image_url: '', author: 'GreenDrop Team', status: 'draft' };
    vm.editingId = null;
    vm.showForm = true;
    vm.errorMessage = null;
  };

  vm.editPost = function (post) {
    blogService.get(post.post_id).then(function (full) {
      vm.form = angular.copy(full);
      vm.editingId = post.post_id;
      vm.showForm = true;
      vm.errorMessage = null;
    });
  };

  vm.onImageSelected = function (files) {
    if (!files || !files.length) return;
    vm.uploading = true;
    uploadsService.uploadImages('blog', [files[0]]).then(function (uploaded) {
      vm.form.image_url = uploaded[0].url;
    }).catch(function () {
      vm.errorMessage = 'Không thể tải ảnh lên, vui lòng thử lại';
    }).finally(function () { vm.uploading = false; });
  };

  vm.save = function () {
    var isEditing = !!vm.editingId;
    var promise = isEditing ? blogService.update(vm.editingId, vm.form) : blogService.create(vm.form);
    promise.then(function () {
      vm.showForm = false;
      notifyModalService.success(isEditing ? 'Cập nhật bài viết thành công!' : 'Thêm bài viết thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể lưu bài viết';
    });
  };

  vm.remove = function (post) {
    if (!confirm('Xoá bài viết "' + post.title + '"?')) return;
    blogService.remove(post.post_id).then(load).catch(function (err) {
      alert((err.data && err.data.error) || 'Không thể xoá bài viết');
    });
  };

  vm.cancel = function () { vm.showForm = false; };
});
