/* Interactive hero visual: a mesh that reacts to the cursor in three modes. */
(function () {
  var box = document.getElementById('heroViz');
  if (!box) return;
  var cv = document.getElementById('vizCanvas'), ctx = cv.getContext('2d');
  var btns = [].slice.call(box.querySelectorAll('.viz-tab'));
  var elT = document.getElementById('vizTitle'), elD = document.getElementById('vizText'), elR = document.getElementById('vizReadout');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MODES = [
    { t: '01 / Design', d: '3D CAD, GD&T and manufacturable assemblies.', r: '' },
    { t: '02 / Simulation', d: 'FEA and thermal analysis in Ansys Mechanical.', r: 'Stress contour (illustrative)' },
    { t: '03 / Product development', d: 'Prototyping, validation and production documentation.', r: 'Concept \u2192 Prototype \u2192 Production' }
  ];
  var COLS = 24, ROWS = 20, W = 0, H = 0, mode = 0, mx = 0, my = 0, tx = 0, ty = 0;
  var active = false, locked = false, visible = true, raf = 0, P = [];

  function resize() {
    var r = box.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P = [];
    for (var j = 0; j < ROWS; j++) for (var i = 0; i < COLS; i++) {
      var bx = (i / (COLS - 1)) * W, by = (j / (ROWS - 1)) * H;
      P.push({ bx: bx, by: by, x: bx, y: by, f: 0 });
    }
    if (!mx) { mx = tx = W / 2; my = ty = H / 2; }
    if (reduce) draw(0);
  }

  function setMode(i) {
    mode = i;
    btns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    elT.textContent = MODES[i].t; elD.textContent = MODES[i].d; elR.textContent = MODES[i].r;
    if (reduce) draw(0);
  }

  function line(a, b, col, w) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  }
  function heat(f, a) { return 'hsla(' + (200 - 195 * Math.min(1, f * 1.15)) + ',90%,58%,' + a + ')'; }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var R = Math.min(W, H) * 0.26, i, p, dx, dy, d, f;
    for (i = 0; i < P.length; i++) {
      p = P[i]; dx = p.bx - mx; dy = p.by - my; d = Math.sqrt(dx * dx + dy * dy) || 1;
      f = Math.exp(-(d * d) / (R * R)); p.f = f;
      if (mode === 1) { p.x = p.bx + (dx / d) * f * R * 0.42; p.y = p.by + (dy / d) * f * R * 0.42; }
      else if (mode === 2) {
        var an = f * (1.1 + Math.sin(now * 0.0007) * 0.4), c = Math.cos(an), s = Math.sin(an);
        p.x = mx + dx * c - dy * s; p.y = my + dx * s + dy * c;
      } else { p.x = p.bx; p.y = p.by; }
    }
    if (mode === 1) {
      var g = ctx.createRadialGradient(mx, my, 0, mx, my, R * 1.3);
      g.addColorStop(0, 'rgba(239,68,68,.35)'); g.addColorStop(0.5, 'rgba(234,179,8,.12)'); g.addColorStop(1, 'rgba(14,165,233,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    for (i = 0; i < P.length; i++) {
      p = P[i];
      var right = (i % COLS) < COLS - 1 ? P[i + 1] : null, down = i + COLS < P.length ? P[i + COLS] : null;
      [right, down].forEach(function (q) {
        if (!q) return;
        var ff = (p.f + q.f) / 2;
        line(p, q, mode === 1 ? heat(ff, 0.3 + 0.5 * ff) : 'rgba(14,165,233,' + (0.12 + 0.55 * ff) + ')', 0.6 + ff * 0.9);
      });
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 + p.f * 1.4, 0, 6.2832);
      ctx.fillStyle = mode === 1 ? heat(p.f, 0.9) : 'rgba(186,230,253,' + (0.35 + 0.6 * p.f) + ')'; ctx.fill();
    }
    if (mode === 0) {
      var sx = Math.round(mx / (W / (COLS - 1))) * (W / (COLS - 1)), sy = Math.round(my / (H / (ROWS - 1))) * (H / (ROWS - 1));
      ctx.strokeStyle = 'rgba(56,189,248,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 6.2832); ctx.strokeStyle = '#38BDF8'; ctx.stroke();
      elR.textContent = 'X ' + (sx / W * 200).toFixed(1) + '   Y ' + (sy / H * 180).toFixed(1) + ' mm';
    }
    if (mode === 2) {
      var names = ['Concept', 'Prototype', 'Production'];
      ctx.font = '600 12px "DM Sans",sans-serif'; ctx.textAlign = 'center';
      ctx.setLineDash([4, 6]); ctx.lineDashOffset = -now * 0.02;
      names.forEach(function (n, k) {
        var r = R * (0.45 + k * 0.35);
        ctx.beginPath(); ctx.arc(mx, my, r, 0, 6.2832); ctx.strokeStyle = 'rgba(226,232,240,.45)'; ctx.stroke();
      });
      ctx.setLineDash([]); ctx.fillStyle = '#E2E8F0';
      names.forEach(function (n, k) { ctx.fillText(n, mx, my - R * (0.45 + k * 0.35) - 6); });
    }
  }

  function frame(now) {
    raf = 0;
    if (!active) { tx = W / 2 + Math.cos(now * 0.0006) * W * 0.28; ty = H / 2 + Math.sin(now * 0.0009) * H * 0.24; }
    mx += (tx - mx) * 0.14; my += (ty - my) * 0.14;
    draw(now);
    if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function start() { if (!reduce && !raf) raf = requestAnimationFrame(frame); }

  box.addEventListener('pointermove', function (e) {
    var r = box.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; active = true;
    if (reduce) { mx = tx; my = ty; draw(0); }
  });
  box.addEventListener('pointerleave', function () { active = false; });
  btns.forEach(function (b, k) {
    b.addEventListener('click', function () { locked = true; setMode(k); });
    b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setMode(k); });
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(box);
  setInterval(function () { if (!locked && !active && !reduce && visible && !document.hidden) setMode((mode + 1) % 3); }, 6000);

  resize(); setMode(0); start();
})();
