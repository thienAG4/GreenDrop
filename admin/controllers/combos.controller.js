// Admin-authored combos use the AI Builder type only - BR-07 (section 1.2.2)
// restricts the 3D Terrarium Studio to Customer accounts, and the backend
// (combos.controller.js#create) already 403s a non-customer 3D submission.
// Editing/deleting, on the other hand, is allowed on ANY user's design - the
// backend lets an admin bypass the created_by_user_id ownership check
// (combos.service.js updateCombo/deleteCombo's isAdmin param) since this page
// is itself admin-only (route guard + GET /combos/admin's requireAdmin).
angular.module('adminApp').controller('CombosController', function (
  combosService, categoriesService, productsService, notifyModalService
) {
  var vm = this;
  vm.loading = true;
  vm.combos = [];
  vm.showForm = false;
  vm.editingId = null;
  vm.library = [];
  vm.placed = [];
  vm.comboName = '';
  vm.errorMessage = null;
  vm.libraryLoading = false;

  var TYPE_LABELS = { ai_builder: 'AI Terrarium Builder', '3d_builder': '3D Terrarium Studio' };
  vm.typeLabel = function (type) { return TYPE_LABELS[type] || type; };

  var ASSEMBLY_FEE = 30000; // mirrors backend utils/constants.js BUILDER_ASSEMBLY_FEE
  // Keyed off the real seeded CATEGORIES rows, same mapping the customer-facing
  // Combo Builder uses (client/controllers/builder/combo-builder.controller.js).
  var ROLE_BY_CATEGORY = {
    'Bình & Chậu Thủy Tinh': 'pot',
    'Đất & Giá Thể': 'soil',
    'Cây Không Khí & Phụ Kiện Xanh': 'plant',
    'Tượng & Phụ Kiện Trang Trí': 'accessory',
  };
  var ROLE_LABELS = { pot: 'Chậu/Bình', soil: 'Đất & giá thể', plant: 'Cây', accessory: 'Phụ kiện' };
  vm.roleLabel = function (role) { return ROLE_LABELS[role] || role; };

  function load() {
    vm.loading = true;
    combosService.listAllAdmin().then(function (combos) {
      vm.combos = combos;
      vm.loading = false;
    });
  }
  load();

  function loadLibrary() {
    vm.libraryLoading = true;
    return categoriesService.list().then(function (categories) {
      var relevant = categories.filter(function (c) { return ROLE_BY_CATEGORY[c.name]; });
      return Promise.all(relevant.map(function (cat) {
        return productsService.list({ category_id: cat.category_id, limit: 50 }).then(function (res) {
          return { category: cat.name, role: ROLE_BY_CATEGORY[cat.name], products: res.items.filter(function (p) { return p.stock_quantity > 0; }) };
        });
      }));
    }).then(function (groups) {
      vm.library = groups;
      vm.libraryLoading = false;
    });
  }

  vm.newCombo = function () {
    vm.comboName = 'Thiết kế Terrarium';
    vm.placed = [];
    vm.editingId = null;
    vm.showForm = true;
    vm.errorMessage = null;
    loadLibrary();
  };

  vm.editCombo = function (combo) {
    combosService.get(combo.combo_id).then(function (full) {
      vm.comboName = full.name;
      vm.editingId = combo.combo_id;
      vm.placed = full.items.map(function (i) {
        return { product_id: i.product_id, name: i.name, price: i.price, role: i.component_role, quantity: i.quantity };
      });
      vm.showForm = true;
      vm.errorMessage = null;
      loadLibrary();
    });
  };

  vm.addComponent = function (product, role) {
    var existing = vm.placed.filter(function (i) { return i.product_id === product.product_id; })[0];
    if (existing) { existing.quantity += 1; return; }
    vm.placed.push({ product_id: product.product_id, name: product.name, price: product.price, role: role, quantity: 1 });
  };
  vm.removeComponent = function (index) { vm.placed.splice(index, 1); };
  vm.incrementQty = function (item) { item.quantity += 1; };
  vm.decrementQty = function (item) { if (item.quantity > 1) item.quantity -= 1; };

  vm.hasPot = function () { return vm.placed.some(function (i) { return i.role === 'pot'; }); };
  vm.hasSoil = function () { return vm.placed.some(function (i) { return i.role === 'soil'; }); };
  vm.meetsMinimum = function () { return vm.hasPot() && vm.hasSoil(); }; // BR-02

  vm.componentsTotal = function () {
    return vm.placed.reduce(function (sum, i) { return sum + i.price * i.quantity; }, 0);
  };
  vm.totalPrice = function () { return vm.componentsTotal() + ASSEMBLY_FEE; };

  vm.save = function () {
    if (!vm.meetsMinimum()) {
      vm.errorMessage = 'Thiết kế cần có ít nhất 1 chậu/bình và 1 loại đất/giá thể';
      return;
    }
    var items = vm.placed.map(function (i) {
      return { product_id: i.product_id, quantity: i.quantity, component_role: i.role };
    });
    var isEditing = !!vm.editingId;
    var promise = isEditing
      ? combosService.update(vm.editingId, { name: vm.comboName, items: items })
      : combosService.create({ combo_type: 'ai_builder', name: vm.comboName, items: items });
    promise.then(function () {
      vm.showForm = false;
      notifyModalService.success(isEditing ? 'Cập nhật thiết kế thành công!' : 'Tạo thiết kế thành công!');
      load();
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể lưu thiết kế';
    });
  };

  vm.remove = function (combo) {
    if (!confirm('Xoá thiết kế "' + combo.name + '"?')) return;
    combosService.remove(combo.combo_id).then(load).catch(function (err) {
      alert((err.data && err.data.error) || 'Không thể xoá thiết kế');
    });
  };

  vm.cancel = function () { vm.showForm = false; };
});
