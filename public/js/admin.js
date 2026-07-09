/* Admin panel behaviour: sidebar, confirmations, image preview, review modal. */
(function () {
  'use strict';

  // ---- Mobile sidebar ----
  var sidebar = document.getElementById('adminSidebar');
  var toggle = document.getElementById('sidebarToggle');
  var backdrop = document.getElementById('sidebarBackdrop');

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('show', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // ---- Confirm dialogs ----
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) {
        e.preventDefault();
      }
    });
  });

  // ---- Flash dismiss ----
  document.querySelectorAll('.flash-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var flash = btn.closest('.flash');
      if (flash) flash.remove();
    });
  });

  // ---- Image preview ----
  document.querySelectorAll('input[type="file"][data-preview]').forEach(function (input) {
    input.addEventListener('change', function () {
      var target = document.getElementById(input.getAttribute('data-preview'));
      if (target && input.files && input.files[0]) {
        target.src = URL.createObjectURL(input.files[0]);
      }
    });
  });

  // ---- Review edit modal ----
  var modal = document.getElementById('reviewModal');
  if (modal) {
    var form = document.getElementById('reviewEditForm');
    var fName = document.getElementById('rev-name');
    var fRating = document.getElementById('rev-rating');
    var fText = document.getElementById('rev-text');
    var fVerified = document.getElementById('rev-verified');
    var fStatus = document.getElementById('rev-status');
    var closeBtn = document.getElementById('reviewModalClose');
    var cancelBtn = document.getElementById('reviewModalCancel');

    function openModal(data) {
      form.action = '/admin/reviews/' + data.id + '/edit';
      fName.value = data.name || '';
      fRating.value = data.rating || '5';
      fText.value = data.text || '';
      fVerified.checked = data.verified === '1' || data.verified === 1;
      fStatus.value = data.status || 'pending';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.js-edit-review').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn.dataset); });
    });
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }
})();
