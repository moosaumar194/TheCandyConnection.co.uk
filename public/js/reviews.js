/* Reviews: clickable star-rating widget + AJAX submission. */
(function () {
  'use strict';

  var form = document.getElementById('reviewForm');
  if (!form) return;

  var starWrap = document.getElementById('starInput');
  var ratingValue = document.getElementById('ratingValue');
  var feedback = document.getElementById('rv-feedback');
  var starBtns = Array.prototype.slice.call(starWrap.querySelectorAll('.star-btn'));
  var current = 0;

  function paint(n) {
    starBtns.forEach(function (btn, i) {
      var on = i < n;
      btn.textContent = on ? '★' : '☆';
      btn.classList.toggle('active', on);
    });
  }

  starBtns.forEach(function (btn, i) {
    btn.addEventListener('mouseenter', function () { paint(i + 1); });
    btn.addEventListener('focus', function () { paint(i + 1); });
    btn.addEventListener('click', function () {
      current = i + 1;
      ratingValue.value = current;
      paint(current);
    });
  });
  starWrap.addEventListener('mouseleave', function () { paint(current); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    feedback.className = 'form-feedback';
    feedback.textContent = '';

    if (!current) {
      feedback.className = 'form-feedback error';
      feedback.textContent = 'Please select a star rating.';
      return;
    }

    var data = Object.fromEntries(new FormData(form).entries());
    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok && res.body.ok) {
          feedback.className = 'form-feedback success';
          feedback.textContent = res.body.message;
          form.reset();
          current = 0;
          paint(0);
        } else {
          feedback.className = 'form-feedback error';
          feedback.textContent = (res.body.errors || ['Something went wrong.']).join(' ');
        }
      })
      .catch(function () {
        feedback.className = 'form-feedback error';
        feedback.textContent = 'Network error. Please try again.';
      })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
