/* Subtle parallax: hero name lags the scroll; project screenshots drift inside
   their panels. Off when the visitor prefers reduced motion. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var hero = document.querySelector(".hero h1");
  var shots = Array.prototype.slice.call(document.querySelectorAll(".project__shot > *"));
  var ticking = false;
  function update() {
    var y = window.scrollY, vh = window.innerHeight;
    if (y < vh * 1.2) hero.style.transform = "translate3d(0," + (y * 0.2).toFixed(1) + "px,0)";
    shots.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var t = (r.top + r.height / 2 - vh / 2) / vh;   // -1 .. 1 across the viewport
      el.style.transform = "translate3d(0," + (t * 48).toFixed(1) + "px,0)";
    });
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
