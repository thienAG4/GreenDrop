angular.module('adminApp').controller('CategoriesController', function (categoriesService, notifyModalService) {
  var vm = this;
  vm.loading = true;
  vm.categories = [];
  vm.newName = '';
  vm.editingId = null;
  vm.editingName = '';

  function load() {
    categoriesService.list().then(function (cats) {
      vm.categories = cats;
      vm.loading = false;
    });
  }
  load();

  vm.errorMessage = null;

  vm.add = function () {
    var name = (vm.newName || '').trim();
    if (!name) return;
    vm.errorMessage = null;
    categoriesService.create({ name: name }).then(function () {
      vm.newName = '';
      notifyModalService.success('Thêm danh mục thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể thêm danh mục';
    });
  };

  vm.startEdit = function (cat) {
    vm.editingId = cat.category_id;
    vm.editingName = cat.name;
    vm.errorMessage = null;
  };

  vm.saveEdit = function () {
    var name = (vm.editingName || '').trim();
    if (!name) return;
    categoriesService.update(vm.editingId, { name: name }).then(function () {
      vm.editingId = null;
      notifyModalService.success('Cập nhật danh mục thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể cập nhật danh mục';
    });
  };

  vm.remove = function (cat) {
    categoriesService.remove(cat.category_id).then(load).catch(function (err) {
      alert((err.data && err.data.error) || 'Không thể xoá danh mục');
    });
  };
});
