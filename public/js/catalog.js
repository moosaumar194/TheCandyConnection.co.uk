/* Catalog: live search, category filter tabs, and product detail modal. */
(function () {
  'use strict';

  var grid = document.getElementById('productGrid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
  var searchInput = document.getElementById('productSearch');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.filter-tab'));
  var emptyState = document.getElementById('emptyState');

  var activeTab = document.querySelector('.filter-tab.active');
  var currentCategory = activeTab ? activeTab.dataset.category : 'All';
  var searchTerm = '';

  function applyFilter() {
    var visible = 0;
    cards.forEach(function (card) {
      var matchCat = currentCategory === 'All' || card.dataset.category === currentCategory;
      var matchSearch = card.dataset.name.toLowerCase().indexOf(searchTerm) !== -1;
      var show = matchCat && matchSearch;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  // Tabs
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-pressed', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed', 'true');
      currentCategory = tab.dataset.category;
      applyFilter();
      // Keep the URL shareable without reloading.
      var url = new URL(window.location.href);
      if (currentCategory === 'All') url.searchParams.delete('category');
      else url.searchParams.set('category', currentCategory);
      history.replaceState(null, '', url);
    });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchTerm = searchInput.value.trim().toLowerCase();
      applyFilter();
    });
  }

  // Apply initial filter (pre-selected category from URL).
  applyFilter();

  // ---- Modal ----
  var modal = document.getElementById('productModal');
  var mImg = document.getElementById('modalImg');
  var mCat = document.getElementById('modalCat');
  var mName = document.getElementById('modalName');
  var mDesc = document.getElementById('modalDesc');
  var mPack = document.getElementById('modalPack');
  var mPrice = document.getElementById('modalPrice');
  var mWa = document.getElementById('modalWa');
  var closeBtn = document.getElementById('modalClose');

  function openModal(card) {
    var d = card.dataset;
    mImg.src = d.image;
    mImg.alt = d.name;
    mName.textContent = d.name;
    mDesc.textContent = d.description || '';
    mPrice.textContent = d.price;
    mWa.href = d.wa;

    if (d.category) { mCat.textContent = d.category; mCat.style.display = ''; }
    else { mCat.style.display = 'none'; }

    if (d.packaging) { mPack.textContent = '📦 ' + d.packaging; mPack.style.display = ''; }
    else { mPack.style.display = 'none'; }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  // Mouse clicks anywhere on the card open the modal. Keyboard users activate the
  // labelled image button inside the card, whose click bubbles up to here.
  cards.forEach(function (card) {
    card.addEventListener('click', function () { openModal(card); });
  });

  if (modal) {
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }
})();
