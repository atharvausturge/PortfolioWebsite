/* =============================================================================
   Atharva Usturge — Portfolio
   Small, dependency-free enhancements. Everything here is progressive: the
   page is fully readable with JavaScript disabled.
   ========================================================================== */
(function () {
  "use strict";

  /* --- Mark that JS is on, so CSS can hide reveal elements (and not before) */
  document.documentElement.classList.add("js");

  /* --- Current year in the footer ----------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --- Mobile navigation toggle ------------------------------------------- */
  var toggle = document.querySelector(".nav__toggle");
  var navList = document.getElementById("nav-list");

  function closeNav() {
    if (!toggle || !navList) return;
    navList.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && navList) {
    toggle.addEventListener("click", function () {
      var open = navList.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close the menu after a link is tapped.
    navList.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });
    // Close on Escape for keyboard users.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* --- Reveal-on-scroll ---------------------------------------------------- */
  /* Rect-based reveal: add .is-in once an element scrolls into the lower
     ~90% of the viewport. Reliable across browsers and observable on load,
     unlike IntersectionObserver against clipped/transformed targets. */
  var revealEls = Array.prototype.slice.call(
    document.querySelectorAll("[data-reveal]")
  );

  function revealInView() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = revealEls.length - 1; i >= 0; i--) {
      var el = revealEls[i];
      if (el.getBoundingClientRect().top < vh * 0.88) {
        el.classList.add("is-in");
        revealEls.splice(i, 1); // reveal once, then stop tracking it
      }
    }
  }

  revealInView(); // reveal anything already in view on load
  window.addEventListener("scroll", revealInView, { passive: true });
  window.addEventListener("resize", revealInView);
  window.addEventListener("load", revealInView);

  /* --- Scroll-spy: highlight the active nav link -------------------------- */
  var sections = ["about", "work", "resume", "contact"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  var navLinks = {};
  document.querySelectorAll('.nav__list a[href^="#"]').forEach(function (a) {
    navLinks[a.getAttribute("href").slice(1)] = a;
  });

  function setActive(id) {
    Object.keys(navLinks).forEach(function (key) {
      navLinks[key].classList.toggle("is-active", key === id);
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      // A band across the middle of the viewport decides the "current" section.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --- Smooth scrolling for same-page anchors ----------------------------- */
  /* Respect users who prefer reduced motion: let the browser jump instantly. */
  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start"
      });
      // Move keyboard focus to the destination for accessibility.
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });
})();
