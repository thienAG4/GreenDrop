// Simplification agreed with the user: the "AI Terrarium Builder" generates 3
// candidate preview images (placeholder images when no PIXAZO_API_KEY is set)
// and lets the customer pick the one they like best to save/buy, while the
// "3D Terrarium Studio" is a 2D click-to-place canvas (not true WebGL/Three.js)
// with no AI image generation - it's purely about interacting with the shape.
// Both still exercise the real backend business rules (stock checks, pot+soil
// minimum, pricing, save/add-to-cart).
angular.module('app').controller('ComboBuilderController', function (
  $rootScope, productsService, categoriesService, combosService, cartService, notifyModalService
) {
  var vm = this;
  vm.mode = 'ai'; // 'ai' or '3d'
  vm.isCustomer = $rootScope.currentUser && $rootScope.currentUser.role === 'customer';
  vm.library = [];
  vm.loading = true;
  vm.placed = []; // { product, role, x, y, quantity } - x/y are % offsets within the pot shape, only meaningful in 3D mode
  vm.aiPreviews = []; // up to 3 AI-generated candidate images (AI mode only)
  vm.selectedPreview = null; // the candidate the customer picked to save/buy
  vm.generatingPreview = false;
  vm.errorMessage = null;
  vm.comboName = 'My Terrarium Design';

  // Keyed off the real seeded CATEGORIES rows (init.sql) - a category named
  // "Bể Tiểu Cảnh Terrarium" (finished terrariums, not a raw component) is
  // deliberately excluded, same as before.
  var ROLE_BY_CATEGORY = {
    'Bình & Chậu Thủy Tinh': 'pot',
    'Đất & Giá Thể': 'soil',
    'Cây Không Khí & Phụ Kiện Xanh': 'plant',
    'Tượng & Phụ Kiện Trang Trí': 'accessory',
  };
  // Pot must always be pickable first (BR-02 needs it, and the 3D canvas can't
  // render a shape until one is chosen) - sort the library groups explicitly
  // rather than trusting the backend's alphabetical category order.
  var ROLE_ORDER = { pot: 0, soil: 1, plant: 2, accessory: 3 };

  // Front-view silhouettes for the 8 seeded glass containers (products 185-192,
  // "Bình thủy tinh mẫu 1..8"), approximated as CSS clip-path polygons per the
  // shape/dimension descriptions in Shapes.md (image ids 937-944, which line up
  // 1:1 with these product ids). This is the 2D-canvas simplification's stand-in
  // for a real 3D model of each container - good enough to visually distinguish
  // the 8 shapes and constrain where components can be dropped, not a pixel-exact
  // trace.
  var POT_SHAPES = {
    185: { label: 'Mẫu 1', widthCm: 13, heightCm: 15, clipPath: 'polygon(0% 100%, 0% 45%, 45% 8%, 62% 26%, 100% 26%, 100% 100%)' },
    186: { label: 'Mẫu 2', widthCm: 12, heightCm: 16, clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)' },
    187: { label: 'Mẫu 3', widthCm: 14, heightCm: 26, clipPath: 'polygon(10% 100%, 0% 60%, 16% 22%, 45% 0%, 72% 16%, 100% 55%, 90% 100%)' },
    188: { label: 'Mẫu 4', widthCm: 12, heightCm: 22, clipPath: 'polygon(25% 0%, 75% 0%, 100% 20%, 85% 100%, 15% 100%, 0% 20%)' },
    189: { label: 'Mẫu 5', widthCm: 12, heightCm: 24, clipPath: 'polygon(25% 0%, 75% 0%, 100% 20%, 85% 100%, 15% 100%, 0% 20%)' },
    190: { label: 'Mẫu 6', widthCm: 14, heightCm: 24, clipPath: 'polygon(14% 6%, 86% 0%, 100% 30%, 88% 100%, 12% 100%, 0% 28%)' },
    191: { label: 'Mẫu 7', widthCm: 12, heightCm: 20, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
    192: { label: 'Mẫu 8', widthCm: 12, heightCm: 15, clipPath: 'polygon(0% 100%, 0% 45%, 50% 0%, 100% 45%, 100% 100%)' },
  };
  var DEFAULT_SHAPE = { label: '', widthCm: 12, heightCm: 15, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' };

  categoriesService.list().then(function (categories) {
    var relevant = categories.filter(function (c) { return ROLE_BY_CATEGORY[c.name]; });
    return Promise.all(relevant.map(function (cat) {
      return productsService.list({ category_id: cat.category_id, limit: 50 }).then(function (res) {
        return { category: cat.name, role: ROLE_BY_CATEGORY[cat.name], products: res.items.filter(function (p) { return p.stock_quantity > 0; }) };
      });
    }));
  }).then(function (groups) {
    groups.sort(function (a, b) { return ROLE_ORDER[a.role] - ROLE_ORDER[b.role]; });
    vm.library = groups;
    vm.loading = false;
  });

  vm.potLibrary = function () {
    var group = vm.library.filter(function (g) { return g.role === 'pot'; })[0];
    return group ? group.products : [];
  };

  // Any change to the design (or switching modes) invalidates the AI candidates
  // already on screen - they no longer depict what the customer has selected.
  function resetPreviews() {
    vm.aiPreviews = [];
    vm.selectedPreview = null;
  }

  vm.setMode = function (mode) {
    if (mode === '3d' && !vm.isCustomer) {
      vm.errorMessage = 'Chỉ tài khoản Khách hàng mới có thể sử dụng 3D Terrarium Studio.';
      return;
    }
    vm.mode = mode;
    vm.errorMessage = null;
    resetPreviews();
  };

  vm.selectedPot = function () {
    return vm.placed.filter(function (i) { return i.role === 'pot'; })[0] || null;
  };
  vm.potShape = function () {
    var pot = vm.selectedPot();
    return (pot && POT_SHAPES[pot.product.product_id]) || DEFAULT_SHAPE;
  };

  // BR-02 (backend) only requires a pot + soil to save/checkout. This project's
  // Combo Builder UX additionally requires a plant before allowing an AI preview,
  // save, or checkout - a stricter frontend gate on top of the backend minimum.
  vm.hasPot = function () { return vm.placed.some(function (i) { return i.role === 'pot'; }); };
  vm.hasSoil = function () { return vm.placed.some(function (i) { return i.role === 'soil'; }); };
  vm.hasPlant = function () { return vm.placed.some(function (i) { return i.role === 'plant'; }); };
  vm.meetsMinimum = function () { return vm.hasPot() && vm.hasSoil() && vm.hasPlant(); };
  var MINIMUM_MESSAGE = 'Vui lòng chọn ít nhất 1 bình/chậu, 1 loại đất nền và 1 cây.';

  // Only one pot may ever be placed - it defines the shape everything else sits
  // in, so there's no such thing as "2 bình" for a single design.
  vm.isPotDisabled = function (product) {
    var pot = vm.selectedPot();
    return !!pot && pot.product.product_id !== product.product_id;
  };
  vm.isPotSelected = function (product) {
    var pot = vm.selectedPot();
    return !!pot && pot.product.product_id === product.product_id;
  };
  // In 3D mode, the pot must be chosen first - it's what the other components get
  // placed inside, so there's nowhere to put them until then. AI mode has no
  // spatial canvas, so this gate doesn't apply there.
  vm.canAddNonPot = function () { return vm.mode !== '3d' || !!vm.selectedPot(); };
  // Dims an *alternative* pot while a different one is already chosen (it
  // can't be picked without removing the current one first); doesn't dim the
  // already-selected pot's own row, which stays visually active.
  vm.isRowDisabled = function (group, product) {
    return group.role === 'pot' ? vm.isPotDisabled(product) : !vm.canAddNonPot();
  };
  // Separate from the dimming above: the "+"/drag action itself is disabled for
  // *every* pot row, including the selected one, once a pot exists - a bình can
  // only ever be quantity 1, so there's nothing left to "add" once it's chosen,
  // only to remove.
  vm.isAddDisabled = function (group, product) {
    return group.role === 'pot' ? vm.hasPot() : !vm.canAddNonPot();
  };

  vm.changePot = function () {
    var pot = vm.selectedPot();
    if (pot) vm.removeComponent(pot);
  };

  function defaultPosition(index) {
    return { x: 12 + (index % 3) * 30, y: 15 + Math.floor(index / 3) * 28 };
  }

  vm.addComponent = function (product, role) {
    // A bình is a pick-one-or-remove-it choice, never a quantity - block
    // re-adding it entirely once one is placed, including clicking the same
    // one again (which would otherwise just bump its quantity to 2).
    if (role === 'pot' && vm.hasPot()) {
      vm.errorMessage = 'Mỗi thiết kế chỉ có 1 chậu/bình. Hãy xoá bình hiện tại nếu muốn đổi sang mẫu khác.';
      return;
    }
    if (role !== 'pot' && !vm.canAddNonPot()) {
      vm.errorMessage = 'Vui lòng chọn 1 chậu/bình trước khi thêm các vật liệu khác.';
      return;
    }
    vm.errorMessage = null;
    var existing = vm.placed.filter(function (p) { return p.product.product_id === product.product_id; })[0];
    if (existing) {
      existing.quantity += 1;
    } else {
      var pos = defaultPosition(vm.placed.length);
      vm.placed.push({ product: product, role: role, quantity: 1, x: pos.x, y: pos.y });
    }
    resetPreviews();
  };

  vm.removeComponent = function (item) {
    vm.placed.splice(vm.placed.indexOf(item), 1);
    resetPreviews();
  };

  vm.changeQty = function (item, delta) {
    item.quantity = Math.max(1, item.quantity + delta);
  };

  // Dragging a new item in from the material library.
  vm.dragStart = function (product, role) {
    vm.draggingProduct = product;
    vm.draggingRole = role;
    vm.draggingExistingItem = null;
  };
  // Dragging an already-placed item to reposition it within the pot shape.
  vm.dragStartExisting = function (item) {
    vm.draggingProduct = item.product;
    vm.draggingRole = item.role;
    vm.draggingExistingItem = item;
  };

  vm.onCanvasDrop = function ($event) {
    $event.preventDefault();
    if (!vm.draggingProduct) return;
    var rect = $event.currentTarget.getBoundingClientRect();
    var xPct = Math.max(2, Math.min(((($event.clientX - rect.left) / rect.width) * 100), 88));
    var yPct = Math.max(2, Math.min(((($event.clientY - rect.top) / rect.height) * 100), 88));

    if (vm.draggingExistingItem) {
      vm.draggingExistingItem.x = xPct;
      vm.draggingExistingItem.y = yPct;
    } else {
      var beforeCount = vm.placed.length;
      vm.addComponent(vm.draggingProduct, vm.draggingRole);
      if (vm.placed.length > beforeCount) {
        var placedItem = vm.placed[vm.placed.length - 1];
        placedItem.x = xPct;
        placedItem.y = yPct;
      }
    }
    vm.draggingProduct = null;
    vm.draggingRole = null;
    vm.draggingExistingItem = null;
  };

  vm.componentsTotal = function () {
    return vm.placed.reduce(function (sum, item) { return sum + Number(item.product.price) * item.quantity; }, 0);
  };
  vm.ASSEMBLY_FEE = 30000; // mirrors backend utils/constants.js BUILDER_ASSEMBLY_FEE
  vm.grandTotal = function () { return vm.componentsTotal() + vm.ASSEMBLY_FEE; };

  // Coarse left/right/center x back/front/middle description of where a piece
  // sits inside the pot shape, derived from its % position - only meaningful
  // in 3D mode, where the customer actually arranged things spatially. Sent
  // along with the AI-preview request so the generated image reflects the
  // real layout, not just the component list.
  function positionHint(item) {
    var h = item.x < 34 ? 'left' : (item.x > 66 ? 'right' : 'center');
    var v = item.y < 34 ? 'back' : (item.y > 66 ? 'front' : 'middle');
    return h + ' ' + v;
  }

  function buildItemsPayload() {
    return vm.placed.map(function (item) {
      var payload = { product_id: item.product.product_id, quantity: item.quantity, component_role: item.role };
      if (vm.mode === '3d' && item.role !== 'pot') {
        payload.position = positionHint(item);
      }
      return payload;
    });
  }

  // Carries the customer's chosen AI candidate into the create payload so the
  // backend can persist it against the saved design (combos.service.js's
  // createCombo/updateCombo). vm.selectedPreview is already cleared by
  // addComponent/removeComponent/reposition whenever the design changes, so
  // this never attaches a now-stale image without any extra bookkeeping here.
  // 3D designs have no AI image, so this is simply absent for them.
  function buildSavePayload(comboType) {
    var payload = { combo_type: comboType, name: vm.comboName, items: buildItemsPayload() };
    if (vm.selectedPreview) payload.preview_image_base64 = vm.selectedPreview.image_url;
    return payload;
  }

  // Translates raw HTTP failures into plain-language messages - the backend's
  // error strings are meant for logs/devs, not shoppers.
  function friendlyAiError(err) {
    var status = err && err.status;
    if (status === 401) return 'Vui lòng đăng nhập để sử dụng tính năng tạo ảnh AI.';
    if (status === 409) return 'Một số vật liệu bạn chọn vừa hết hàng, vui lòng kiểm tra lại danh sách.';
    if (status === 429) return 'Tính năng tạo ảnh AI đang bị giới hạn tần suất, vui lòng thử lại sau ít phút.';
    if (status === 422) return 'AI không thể tạo ảnh cho tổ hợp vật liệu này, vui lòng thử thay đổi thiết kế.';
    if (status === 500) return 'Tính năng tạo ảnh AI đang gặp sự cố cấu hình, vui lòng thử lại sau hoặc chuyển sang 3D Terrarium Studio.';
    if (status === 0) return 'Không có kết nối mạng, vui lòng kiểm tra đường truyền và thử lại.';
    return 'AI không thể tạo ảnh lúc này, vui lòng thử lại hoặc chuyển sang 3D Terrarium Studio.';
  }

  // AI mode only: ask the backend for 3 candidate images of the current design.
  vm.generateAiPreview = function () {
    if (!vm.meetsMinimum()) {
      vm.errorMessage = MINIMUM_MESSAGE;
      return;
    }
    vm.errorMessage = null;
    vm.generatingPreview = true;
    resetPreviews();
    combosService.aiPreview(buildItemsPayload()).then(function (previews) {
      vm.aiPreviews = previews || [];
      // Pre-select the first candidate so the customer can save/buy immediately;
      // they can still click another one to change their pick.
      vm.selectedPreview = vm.aiPreviews[0] || null;
      vm.generatingPreview = false;
    }).catch(function (err) {
      vm.generatingPreview = false;
      vm.errorMessage = friendlyAiError(err);
    });
  };

  vm.selectPreview = function (preview) {
    vm.selectedPreview = preview;
  };
  vm.isPreviewSelected = function (preview) {
    return vm.selectedPreview === preview;
  };

  // Full-size lightbox to inspect a candidate. stopPropagation keeps the
  // "view detail" click from also toggling the card's select handler.
  vm.zoomedPreview = null;
  vm.openPreview = function (preview, $event) {
    if ($event) $event.stopPropagation();
    vm.zoomedPreview = preview;
  };
  vm.closePreview = function () {
    vm.zoomedPreview = null;
  };

  function requireLogin() {
    if (!$rootScope.isLoggedIn) {
      vm.errorMessage = 'Vui lòng đăng nhập để lưu hoặc đặt hàng thiết kế của bạn.';
      return false;
    }
    return true;
  }

  // AI mode revolves around picking one of the generated images, so a design
  // can't be saved/bought there until the customer has generated and chosen
  // one. 3D mode has no image step, so it's exempt.
  var PICK_IMAGE_MESSAGE = 'Vui lòng tạo và chọn 1 ảnh AI bạn thích trước khi lưu hoặc đặt hàng.';
  function needsImagePick() {
    return vm.mode === 'ai' && !vm.selectedPreview;
  }

  vm.saveDesign = function () {
    if (!requireLogin()) return;
    if (!vm.meetsMinimum()) {
      vm.errorMessage = MINIMUM_MESSAGE;
      return;
    }
    if (needsImagePick()) {
      vm.errorMessage = PICK_IMAGE_MESSAGE;
      return;
    }
    var comboType = vm.mode === '3d' ? '3d_builder' : 'ai_builder';
    combosService.create(buildSavePayload(comboType)).then(function (combo) {
      vm.savedCombo = combo;
      notifyModalService.success('Lưu combo thành công');
      vm.errorMessage = null;
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể lưu thiết kế';
    });
  };

  vm.checkoutDesign = function () {
    if (!requireLogin()) return;
    if (!vm.meetsMinimum()) {
      vm.errorMessage = MINIMUM_MESSAGE;
      return;
    }
    if (needsImagePick()) {
      vm.errorMessage = PICK_IMAGE_MESSAGE;
      return;
    }
    vm.errorMessage = null;
    var comboType = vm.mode === '3d' ? '3d_builder' : 'ai_builder';
    // Persist the design (so its image/components survive and it becomes
    // viewable/buyable later) and add it to the cart, but stay on the builder
    // instead of yanking the customer to the cart page - navigating away used
    // to discard the design and its generated preview they'd just made.
    combosService.create(buildSavePayload(comboType)).then(function (combo) {
      vm.savedCombo = combo;
      return cartService.addItem({ item_type: 'combo', combo_id: combo.combo_id, quantity: 1 });
    }).then(function () {
      notifyModalService.success('Đã lưu thiết kế và thêm vào giỏ hàng!');
    }).catch(function (err) {
      vm.errorMessage = (err.data && err.data.error) || 'Không thể thêm thiết kế vào giỏ hàng';
    });
  };
});
