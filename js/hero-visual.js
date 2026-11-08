/* Interactive hero: stylized steering knuckle with 3 cursor-driven views (Design / Simulation / Product development). */
(function () {
  var box = document.getElementById('heroViz');
  if (!box) return;
  var cv = document.getElementById('vizCanvas'), ctx = cv.getContext('2d'), TAU = Math.PI * 2;
  var btns = [].slice.call(box.querySelectorAll('.viz-tab'));
  var elT = document.getElementById('vizTitle'), elD = document.getElementById('vizText'), elR = document.getElementById('vizReadout');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MODES = [
    { t: '01 / Design', d: 'Hover to zoom into the GD&T drafting view.', r: 'Illustrative GD&T on a stylized steering knuckle' },
    { t: '02 / Simulation', d: 'Move the cursor to load the part and see the stress distribution.', r: 'Illustrative stress field, not solver output' },
    { t: '03 / Product development', d: 'Move the cursor left to right: concept to final product.', r: '' }
  ];
  var STAGES = ['Concept sketch', 'CAD model', 'FEA validation', 'Prototype', 'Final product'], SHORT = ['Concept', 'CAD', 'FEA', 'Prototype', 'Product'];
  /* geometry in 0..100 units: [x1,y1,x2,y2,width] arms, [x,y,r] bosses and holes */
  var LINKS = [[50, 50, 66, 14, 13], [50, 50, 46, 88, 15], [50, 50, 16, 70, 11], [50, 50, 78, 36, 10], [50, 50, 78, 66, 10]];
  var DISCS = [[50, 50, 27], [66, 14, 8.5], [46, 90, 9], [14, 72, 7], [80, 35, 6.5], [80, 67, 6.5]];
  var HOLES = [[50, 50, 13.5], [66, 14, 3.6], [46, 90, 4], [14, 72, 3], [80, 35, 2.6], [80, 67, 2.6]];
  for (var a = 45; a < 360; a += 90) HOLES.push([50 + 21 * Math.cos(a * Math.PI / 180), 50 + 21 * Math.sin(a * Math.PI / 180), 2]);

  var W = 0, H = 0, S = 0, ox = 0, oy = 0, u = 1, sz = 0, q = 1, mode = 0, mx = 0, my = 0, tx = 0, ty = 0;
  var active = false, locked = false, visible = true, raf = 0, Mc, Oc, Tc, tc, Fc, fc, G, LUT = [], N = 110;

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function shapes(c, grow, col) {
    c.fillStyle = c.strokeStyle = col; c.lineCap = 'round';
    LINKS.forEach(function (l) { c.lineWidth = (l[4] + grow * 2) * q; c.beginPath(); c.moveTo(l[0] * q, l[1] * q); c.lineTo(l[2] * q, l[3] * q); c.stroke(); });
    DISCS.forEach(function (d) { c.beginPath(); c.arc(d[0] * q, d[1] * q, (d[2] + grow) * q, 0, TAU); c.fill(); });
  }
  function jet(t) {
    var h = (1 - t) * 4, x = 1 - Math.abs(h % 2 - 1), r = 0, g = 0, b = 0;
    if (h < 1) { r = 1; g = x; } else if (h < 2) { r = x; g = 1; } else if (h < 3) { g = 1; b = x; } else if (h < 4) { g = x; b = 1; } else { b = 1; }
    return [r * 235, g * 235, b * 235];
  }
  function build() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    sz = Math.round(S * dpr * 2.3); q = sz / 100;
    var Mf = mk(sz, sz), mf = Mf.getContext('2d'); shapes(mf, 0, '#fff');
    Oc = mk(sz, sz); var oc = Oc.getContext('2d'); shapes(oc, 1.1, '#7dd3fc');
    oc.globalCompositeOperation = 'destination-out'; oc.drawImage(Mf, 0, 0); oc.globalCompositeOperation = 'source-over';
    oc.lineWidth = 0.7 * q; oc.strokeStyle = '#7dd3fc';
    HOLES.forEach(function (h) { oc.beginPath(); oc.arc(h[0] * q, h[1] * q, h[2] * q, 0, TAU); oc.stroke(); });
    Mc = mk(sz, sz); var mc = Mc.getContext('2d'); mc.drawImage(Mf, 0, 0); mc.globalCompositeOperation = 'destination-out';
    HOLES.forEach(function (h) { mc.beginPath(); mc.arc(h[0] * q, h[1] * q, h[2] * q, 0, TAU); mc.fill(); });
    Tc = mk(sz, sz); tc = Tc.getContext('2d');
    Fc = mk(N, N); fc = Fc.getContext('2d');
    /* geometric stress raisers: hole edges and arm roots */
    var J = LINKS.map(function (l) { var dx = l[2] - l[0], dy = l[3] - l[1], L = Math.hypot(dx, dy); return [l[0] + dx / L * 27, l[1] + dy / L * 27]; });
    G = new Float32Array(N * N);
    for (var i = 0; i < N * N; i++) {
      var cx = (i % N + 0.5) * 100 / N, cy = (Math.floor(i / N) + 0.5) * 100 / N, dh = 1e3;
      HOLES.forEach(function (h) { dh = Math.min(dh, Math.hypot(cx - h[0], cy - h[1]) - h[2]); });
      var gg = 0.75 * Math.exp(-Math.max(dh, 0) / 3.5);
      J.forEach(function (j) { gg += 0.5 * Math.exp(-((cx - j[0]) * (cx - j[0]) + (cy - j[1]) * (cy - j[1])) / 90); });
      G[i] = Math.min(1, gg);
    }
    if (!LUT.length) for (var k = 0; k < 256; k++) LUT.push(jet(k / 255));
  }
  function resize() {
    var r = box.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * Math.min(window.devicePixelRatio || 1, 2); cv.height = H * Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    S = Math.max(120, Math.min(W - 30, H - 205)); ox = (W - S) / 2; oy = 62; u = S / 100;
    build();
    if (!mx) { mx = tx = W / 2; my = ty = H / 2; }
    if (reduce) draw(0);
  }
  function setMode(i) {
    mode = i;
    btns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    elT.textContent = MODES[i].t; elD.textContent = MODES[i].d; elR.textContent = MODES[i].r;
    if (reduce) draw(0);
  }

  /* ---------- drafting helpers (unit coordinates) ---------- */
  function centerLines(c) {
    c.save(); c.setLineDash([3, 2]); c.lineWidth = 0.2; c.strokeStyle = 'rgba(125,211,252,.55)';
    c.beginPath(); c.moveTo(14, 50); c.lineTo(86, 50); c.moveTo(50, 18); c.lineTo(50, 84); c.stroke(); c.restore();
  }
  function dim(c, x1, y1, x2, y2, txt) {
    var L = Math.hypot(x2 - x1, y2 - y1); c.save(); c.translate(x1, y1); c.rotate(Math.atan2(y2 - y1, x2 - x1));
    c.beginPath(); c.moveTo(0, 0); c.lineTo(L, 0);
    c.moveTo(0, 0); c.lineTo(1.7, -.5); c.lineTo(1.7, .5); c.closePath(); c.moveTo(L, 0); c.lineTo(L - 1.7, -.5); c.lineTo(L - 1.7, .5); c.closePath();
    c.stroke(); c.fill(); c.textAlign = 'center'; c.fillText(txt, L / 2, -1.1); c.restore();
  }
  function fcf(c, x, y, cells) {
    var w = cells.map(function (t) { return c.measureText(t).width + 1.8; }), tot = w.reduce(function (s, v) { return s + v; }, 0), cx = x;
    c.fillStyle = '#0b1224'; c.fillRect(x, y, tot, 4.2); c.strokeRect(x, y, tot, 4.2); c.fillStyle = '#E2E8F0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    cells.forEach(function (t, i) { c.fillText(t, cx + w[i] / 2, y + 2.2); cx += w[i]; if (i < cells.length - 1) { c.beginPath(); c.moveTo(cx, y); c.lineTo(cx, y + 4.2); c.stroke(); } });
    c.textBaseline = 'alphabetic';
  }
  function lead(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function anno(c) {
    c.save(); c.translate(ox, oy); c.scale(u, u); c.lineWidth = 0.22; c.strokeStyle = '#38BDF8'; c.fillStyle = '#E2E8F0'; c.font = '600 2.9px "DM Sans",sans-serif';
    dim(c, 36.5, 50, 63.5, 50, '\u00D859 H7');
    dim(c, 96, 90, 96, 14, '167');
    c.setLineDash([1, 1]); lead(c, 76, 14, 98, 14); lead(c, 56, 90, 98, 90); c.setLineDash([]);
    c.beginPath(); c.moveTo(48.5, 21.5); c.lineTo(51.5, 21.5); c.lineTo(50, 23.2); c.closePath(); c.fill(); lead(c, 50, 21.5, 50, 19);
    c.strokeRect(48, 14.8, 4, 4.2); c.textAlign = 'center'; c.fillText('A', 50, 18);
    lead(c, 69, 12, 76, 6); fcf(c, 76, 4, ['\u2316', '\u00D80.05', 'A', 'B']);
    lead(c, 13, 74.5, 9, 84); fcf(c, 2, 84, ['\u2316', '\u00D80.1', 'A']);
    c.textAlign = 'left'; c.fillStyle = '#E2E8F0'; c.fillText('\u00D813 H9', 1.5, 62); lead(c, 5, 63.5, 11.5, 70);
    lead(c, 49, 87, 60, 82); fcf(c, 60, 80, ['\u27C2', '0.03', 'A']);
    lead(c, 80, 48.5, 80, 42); fcf(c, 72, 48.5, ['\u25B1', '0.02']);
    c.restore();
  }

  /* ---------- modes ---------- */
  function drawDesign() {
    ctx.save(); ctx.globalAlpha = 0.6; ctx.drawImage(Oc, ox, oy, S, S); ctx.restore();
    ctx.save(); ctx.translate(ox, oy); ctx.scale(u, u); centerLines(ctx); ctx.restore();
    var R = Math.min(90, S * 0.3), z = 2.3;
    ctx.save(); ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.clip();
    ctx.fillStyle = '#0b1224'; ctx.fillRect(mx - R, my - R, 2 * R, 2 * R);
    ctx.translate(mx, my); ctx.scale(z, z); ctx.translate(-mx, -my);
    ctx.drawImage(Oc, ox, oy, S, S); ctx.save(); ctx.translate(ox, oy); ctx.scale(u, u); centerLines(ctx); ctx.restore(); anno(ctx);
    ctx.restore();
    ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawSim() {
    var id = fc.createImageData(N, N), d = id.data, ux = (mx - ox) / u, uy = (my - oy) / u, i, cx, cy, load, s, c;
    for (i = 0; i < N * N; i++) {
      cx = (i % N + 0.5) * 100 / N; cy = (Math.floor(i / N) + 0.5) * 100 / N;
      load = Math.exp(-((cx - ux) * (cx - ux) + (cy - uy) * (cy - uy)) / 968);
      s = Math.min(1, 0.08 + 0.62 * G[i] * (0.35 + 0.65 * load) + 0.38 * load * (0.4 + 0.6 * G[i]));
      c = LUT[(s * 255) | 0]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
    }
    fc.putImageData(id, 0, 0);
    tc.clearRect(0, 0, sz, sz); tc.imageSmoothingEnabled = true; tc.drawImage(Fc, 0, 0, sz, sz);
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(Mc, 0, 0); tc.globalCompositeOperation = 'source-over';
    ctx.drawImage(Tc, ox, oy, S, S); ctx.drawImage(Oc, ox, oy, S, S);
    ctx.beginPath(); ctx.arc(mx, my, 6, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - 12, my); ctx.lineTo(mx + 12, my); ctx.moveTo(mx, my - 12); ctx.lineTo(mx, my + 12); ctx.stroke();
    var lx = W - 30, ly = oy + 24, lh = S - 48, g = ctx.createLinearGradient(0, ly, 0, ly + lh);
    for (i = 0; i <= 4; i++) { c = LUT[Math.round(255 * (1 - i / 4))]; g.addColorStop(i / 4, 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'); }
    ctx.fillStyle = g; ctx.fillRect(lx, ly, 10, lh);
    ctx.fillStyle = '#CBD5E1'; ctx.font = '600 12px "DM Sans",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('High', lx + 5, ly - 7); ctx.fillText('Low', lx + 5, ly + lh + 16);
  }
  function lay(fn) {
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, sz, sz); fn(tc);
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(Mc, 0, 0); tc.globalCompositeOperation = 'source-over';
    ctx.drawImage(Tc, ox, oy, S, S);
  }
  function stage(i, al) {
    ctx.save();
    if (i === 0) {
      [[0, 0], [1.6, -1], [-1.3, 1.4]].forEach(function (o) { ctx.globalAlpha = al * 0.4; ctx.drawImage(Oc, ox + o[0], oy + o[1], S, S); });
      ctx.globalAlpha = al; ctx.save(); ctx.translate(ox, oy); ctx.scale(u, u); centerLines(ctx); ctx.restore();
    } else if (i === 1) {
      ctx.globalAlpha = al; ctx.drawImage(Oc, ox, oy, S, S);
      ctx.save(); ctx.translate(ox, oy); ctx.scale(u, u); centerLines(ctx); ctx.setLineDash([1.5, 1.5]); ctx.lineWidth = 0.2; ctx.strokeStyle = 'rgba(125,211,252,.5)';
      ctx.beginPath(); ctx.arc(50, 50, 21, 0, TAU); ctx.stroke(); ctx.restore();
    } else if (i === 2) {
      ctx.globalAlpha = al; lay(function (c) { var g = c.createLinearGradient(0, 0, sz, sz); g.addColorStop(0, '#2563eb'); g.addColorStop(.4, '#06b6d4'); g.addColorStop(.7, '#84cc16'); g.addColorStop(1, '#f59e0b'); c.fillStyle = g; c.fillRect(0, 0, sz, sz); });
      ctx.drawImage(Oc, ox, oy, S, S);
    } else if (i === 3) {
      ctx.globalAlpha = al; lay(function (c) { c.fillStyle = '#64748B'; c.fillRect(0, 0, sz, sz); c.strokeStyle = 'rgba(15,23,42,.4)'; c.lineWidth = q * 0.25; for (var y = 0; y < sz; y += q * 1.4) { c.beginPath(); c.moveTo(0, y); c.lineTo(sz, y); c.stroke(); } });
      ctx.drawImage(Oc, ox, oy, S, S);
    } else {
      ctx.globalAlpha = al; lay(function (c) { var g = c.createLinearGradient(0, 0, sz, sz); g.addColorStop(0, '#F1F5F9'); g.addColorStop(.45, '#94A3B8'); g.addColorStop(.7, '#E2E8F0'); g.addColorStop(1, '#64748B'); c.fillStyle = g; c.fillRect(0, 0, sz, sz); });
      ctx.drawImage(Oc, ox, oy, S, S);
    }
    ctx.restore();
  }
  function drawDev() {
    var p = Math.max(0, Math.min(1, mx / W)), t = p * 4, i = Math.min(3, Math.floor(t)), f = t - i, nx = f * f * (3 - 2 * f);
    stage(i, 1); if (nx > 0.02 || i === 3 && f > 0) stage(i + 1, i === 3 ? Math.min(1, nx) : nx);
    var x0 = ox + 14, x1 = ox + S - 14, y = oy + S + 16, k, cur = Math.round(t);
    ctx.lineWidth = 2; ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = '#0EA5E9'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * p, y); ctx.stroke();
    ctx.font = '600 12px "DM Sans",sans-serif'; ctx.textAlign = 'center';
    for (k = 0; k < 5; k++) {
      var x = x0 + (x1 - x0) * k / 4; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU);
      ctx.fillStyle = p >= k / 4 - 0.001 ? '#0EA5E9' : '#0b1224'; ctx.fill(); ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = k === cur ? '#fff' : '#94A3B8'; ctx.fillText(SHORT[k], x, y + 19);
    }
    ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * p, y, 8, 0, TAU); ctx.strokeStyle = '#fff'; ctx.stroke();
    elR.textContent = (cur + 1) + ' / 5  ' + STAGES[cur];
  }
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    if (mode === 0) drawDesign(); else if (mode === 1) drawSim(); else drawDev();
  }
  function frame(now) {
    raf = 0;
    if (!active) {
      if (mode === 2) { tx = W * (0.5 + 0.5 * Math.sin(now * 0.00035 - 1.5708)); ty = H / 2; }
      else { tx = ox + S * (0.5 + 0.3 * Math.cos(now * 0.0006)); ty = oy + S * (0.5 + 0.3 * Math.sin(now * 0.0009)); }
    }
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
  setInterval(function () { if (!locked && !active && !reduce && visible && !document.hidden) setMode((mode + 1) % 3); }, 7000);
  resize(); setMode(0); start();
})();
