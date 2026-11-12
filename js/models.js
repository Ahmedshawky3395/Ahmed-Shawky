/* Loads each Sketchfab preview only while its card is near the viewport (saves memory and WebGL contexts). */
(function () {
  var views = [].slice.call(document.querySelectorAll('.model-view'));
  if (!views.length) return;
  /* number the cards automatically (01, 02, 03...), so deleting a card never leaves a gap */
  [].slice.call(document.querySelectorAll('.model-card .project-meta span:last-child')).forEach(function (el, i) { el.textContent = ('0' + (i + 1)).slice(-2); });
  function frame(v) { return v.querySelector('iframe'); }
  function load(f) { if (f.getAttribute('src') !== f.dataset.src) f.setAttribute('src', f.dataset.src); }
  function unload(f) { if (f.getAttribute('src') !== 'about:blank') f.setAttribute('src', 'about:blank'); }
  if (!('IntersectionObserver' in window)) { views.forEach(function (v) { load(frame(v)); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { var f = frame(e.target); if (e.isIntersecting) load(f); else unload(f); });
  }, { rootMargin: '300px 0px' });
  views.forEach(function (v) { io.observe(v); });
})();
