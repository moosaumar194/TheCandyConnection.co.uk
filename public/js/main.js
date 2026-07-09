/* Shared site behaviour: navbar, scroll reveal, contact form. */
(function () {
  'use strict';

  // ---- Navbar: glass-on-scroll + mobile toggle ----
  var navbar = document.getElementById('navbar');
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  if (navbar) {
    var onScroll = function () {
      navbar.classList.toggle('scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu when a link is tapped.
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- Flash dismiss (shared) ----
  document.querySelectorAll('.flash-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var flash = btn.closest('.flash');
      if (flash) flash.remove();
    });
  });

  // ---- Contact form (AJAX) ----
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    var feedback = document.getElementById('cf-feedback');
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      feedback.className = 'form-feedback';
      feedback.textContent = '';

      var data = Object.fromEntries(new FormData(contactForm).entries());
      var submitBtn = contactForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (res.ok && res.body.ok) {
            feedback.className = 'form-feedback success';
            feedback.textContent = res.body.message;
            contactForm.reset();
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
  }
})();
