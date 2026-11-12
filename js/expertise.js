/* Animated panels for the three expertise cards: GD&T symbols, FEA stress contours, thermal isotherms.
   Inactive = dim slate, hover/focus = bright. */
(function () {
  var cards = [].slice.call(document.querySelectorAll('.expertise-card'));
  if (!cards.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, TAU = Math.PI * 2;
  var SK = [100, 116, 139], CY = [56, 189, 248], LT = [186, 230, 253], WARM = [251, 113, 60];
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; }
  function jet(t) {
    var h = (1 - t) * 4, x = 1 - Math.abs(h % 2 - 1), r = 0, g = 0, b = 0;
    if (h < 1) { r = 1; g = x; } else if (h < 2) { r = x; g = 1; } else if (h < 3) { g = 1; b = x; } else if (h < 4) { g = x; b = 1; } else { b = 1; }
    return [r * 235, g * 235, b * 235];
  }
  function env(p) { return Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, p))), 1.1); }

  function Panel(card, scene) {
    var self = this;
    this.card = card; this.cv = card.querySelector('.viz-panel canvas'); this.c = this.cv.getContext('2d');
    this.scene = scene; this.level = 0; this.target = 0; this.t = 0; this.visible = !('IntersectionObserver' in window);
    this.bg = getComputedStyle(this.cv.parentNode).backgroundColor;
    scene.init(this); this.rs();
    if (reduce) { for (var i = 0; i < 140; i++) this.step(1 / 30); this.draw(); }
    function on(v, e) { if (e && e.pointerType === 'touch') return; self.target = v; if (reduce) { self.level = v; self.draw(); } }
    card.addEventListener('pointerenter', function (e) { on(1, e); });
    card.addEventListener('pointerleave', function (e) { on(0, e); });
    card.addEventListener('focusin', function () { on(1); });
    card.addEventListener('focusout', function () { on(0); });
  }
  Panel.prototype.rs = function () {
    var r = this.cv.parentNode.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height; this.cv.width = r.width * d; this.cv.height = r.height * d;
    this.c.setTransform(d, 0, 0, d, 0, 0);
    if (this.scene.resize) this.scene.resize(this);
    if (reduce && this.t) this.draw();
  };
  Panel.prototype.col = function (rgb, a) { return rgba(mix(SK, rgb, this.level), a * (0.3 + 0.7 * this.level)); };
  Panel.prototype.step = function (dt) { this.t += dt; this.level += (this.target - this.level) * (1 - Math.exp(-dt * 7)); this.scene.step(this, dt); };
  Panel.prototype.draw = function () { this.c.clearRect(0, 0, this.w, this.h); this.scene.draw(this); };

  /* ---------- 1. Mechanical design: GD&T frames, datums, tolerances, dimensions ---------- */
  var FCFS = [['\u2316', '\u00D80.05', 'A', 'B'], ['\u25B1', '0.02'], ['\u27C2', '0.03', 'A'], ['\u2225', '0.05', 'A'], ['\u25CE', '\u00D80.1', 'A'], ['\u2197', '0.1', 'A']];
  var TOLS = ['\u00D825 H7', '\u00B10.05', '12.5 \u00B10.1', 'Ra 1.6', '2X \u00D86', '\u00D812 +0.02/0'];
  var GD = {
    init: function (p) { p.items = []; p.acc = 0; },
    step: function (p, dt) {
      var i, it;
      for (i = p.items.length - 1; i >= 0; i--) { it = p.items[i]; it.life += dt / it.dur; if (it.life >= 1) p.items.splice(i, 1); }
      p.acc += dt;
      if (p.acc > 0.4 && p.items.length < 9) { p.acc = 0; GD.spawn(p); }
    },
    spawn: function (p) {
      var c = p.c, r = Math.random(), it = { life: 0, dur: 2.8 + Math.random() * 1.6 };
      c.font = '600 13px "DM Sans",sans-serif';
      if (r < 0.38) { it.k = 'fcf'; it.cells = FCFS[(Math.random() * FCFS.length) | 0]; it.cw = it.cells.map(function (t) { return c.measureText(t).width + 14; }); it.w = it.cw.reduce(function (a, b) { return a + b; }, 0); it.h = 22; }
      else if (r < 0.58) { it.k = 'datum'; it.l = 'ABC'.charAt((Math.random() * 3) | 0); it.w = 20; it.h = 35; }
      else if (r < 0.8) { it.k = 'tol'; it.t = TOLS[(Math.random() * TOLS.length) | 0]; it.w = c.measureText(it.t).width; it.h = 16; }
      else { it.k = 'dim'; it.t = (10 + ((Math.random() * 90) | 0)) + '.0'; it.w = 96; it.h = 26; }
      for (var n = 0; n < 14; n++) {
        it.x = 8 + Math.random() * Math.max(1, p.w - it.w - 16); it.y = 8 + Math.random() * Math.max(1, p.h - it.h - 16);
        var ok = p.items.every(function (o) { return it.x > o.x + o.w + 8 || it.x + it.w + 8 < o.x || it.y > o.y + o.h + 8 || it.y + it.h + 8 < o.y; });
        if (ok) { p.items.push(it); return; }
      }
    },
    draw: function (p) {
      var c = p.c;
      c.textBaseline = 'middle'; c.textAlign = 'center'; c.font = '600 13px "DM Sans",sans-serif'; c.lineWidth = 1;
      p.items.forEach(function (it) {
        var e = env(it.life), x = 0;
        c.save(); c.translate(it.x, it.y - it.life * 6);
        c.shadowColor = rgba(CY, 0.7 * p.level); c.shadowBlur = 7 * p.level;
        c.strokeStyle = p.col(CY, e); c.fillStyle = p.col(LT, e);
        if (it.k === 'fcf') {
          c.strokeRect(0, 0, it.w, 22);
          it.cells.forEach(function (t, i) { c.fillText(t, x + it.cw[i] / 2, 11.5); x += it.cw[i]; if (i < it.cells.length - 1) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 22); c.stroke(); } });
        } else if (it.k === 'datum') {
          c.strokeRect(0, 0, 20, 20); c.fillText(it.l, 10, 10.5);
          c.beginPath(); c.moveTo(10, 20); c.lineTo(10, 27); c.stroke();
          c.beginPath(); c.moveTo(10, 34); c.lineTo(4.5, 26); c.lineTo(15.5, 26); c.closePath(); c.fill();
        } else if (it.k === 'tol') {
          c.textAlign = 'left'; c.fillText(it.t, 0, 8); c.textAlign = 'center';
        } else {
          var L = it.w * Math.min(1, it.life * 4), full = it.life > 0.3;
          c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 24); c.moveTo(it.w, 8); c.lineTo(it.w, 24); c.moveTo(0, 18); c.lineTo(L, 18); c.stroke();
          if (full) {
            c.beginPath(); c.moveTo(0, 18); c.lineTo(6, 15.5); c.lineTo(6, 20.5); c.closePath(); c.moveTo(it.w, 18); c.lineTo(it.w - 6, 15.5); c.lineTo(it.w - 6, 20.5); c.closePath(); c.fill();
            c.fillText(it.t, it.w / 2, 7);
          }
        }
        c.restore();
      });
    }
  };

  /* ---------- 2. FEA: stress contours on a meshed plate with a hole ---------- */
  var FEA = {
    init: function (p) { p.ev = []; p.acc = 1; p.tri = []; },
    resize: function (p) {
      var m = 8, s = 16, cols = Math.max(4, Math.round((p.w - 2 * m) / s)), rows = Math.max(3, Math.round((p.h - 2 * m) / s)), sx = (p.w - 2 * m) / cols, sy = (p.h - 2 * m) / rows, i, j;
      p.R = Math.min(p.h * 0.2, 26); p.hx = p.w / 2; p.hy = p.h / 2; p.tri = [];
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var x0 = m + i * sx, y0 = m + j * sy, x1 = x0 + sx, y1 = y0 + sy, T = (i + j) % 2 ? [[x0, y0, x1, y0, x1, y1], [x0, y0, x1, y1, x0, y1]] : [[x0, y0, x1, y0, x0, y1], [x1, y0, x1, y1, x0, y1]];
        T.forEach(function (t) {
          var cx = (t[0] + t[2] + t[4]) / 3, cy = (t[1] + t[3] + t[5]) / 3;
          if (Math.hypot(cx - p.hx, cy - p.hy) > p.R) p.tri.push({ v: t, cx: cx, cy: cy });
        });
      }
    },
    step: function (p, dt) {
      var i, e;
      for (i = p.ev.length - 1; i >= 0; i--) { e = p.ev[i]; e.life += dt / e.dur; if (e.life >= 1) p.ev.splice(i, 1); }
      p.acc += dt;
      if (p.acc > 0.8 && p.ev.length < 3) {
        p.acc = 0;
        var side = Math.random() < 0.5 ? -1 : 1, atHole = Math.random() < 0.65;
        p.ev.push({ x: atHole ? p.hx + side * p.R * (1 + Math.random() * 0.3) : 14 + Math.random() * (p.w - 28), y: atHole ? p.hy + (Math.random() - 0.5) * p.R : 14 + Math.random() * (p.h - 28), r: 34 + Math.random() * 26, amp: 0.7 + Math.random() * 0.3, life: 0, dur: 2.6 + Math.random() * 1.6 });
      }
    },
    draw: function (p) {
      var c = p.c;
      p.tri.forEach(function (t) {
        var s = 0.12 * Math.exp(-(Math.hypot(t.cx - p.hx, t.cy - p.hy) - p.R) / 12);
        p.ev.forEach(function (e) { var d2 = (t.cx - e.x) * (t.cx - e.x) + (t.cy - e.y) * (t.cy - e.y); s = Math.max(s, e.amp * env(e.life) * Math.exp(-d2 / (e.r * e.r))); });
        if (s > 0.04) { c.fillStyle = p.col(jet(Math.min(1, s)), 0.15 + 0.8 * Math.pow(s, 0.8)); c.beginPath(); c.moveTo(t.v[0], t.v[1]); c.lineTo(t.v[2], t.v[3]); c.lineTo(t.v[4], t.v[5]); c.closePath(); c.fill(); }
      });
      c.strokeStyle = p.col(CY, 0.3); c.lineWidth = 0.6; c.beginPath();
      p.tri.forEach(function (t) { c.moveTo(t.v[0], t.v[1]); c.lineTo(t.v[2], t.v[3]); c.lineTo(t.v[4], t.v[5]); c.closePath(); });
      c.stroke();
      c.beginPath(); c.arc(p.hx, p.hy, p.R, 0, TAU); c.fillStyle = p.bg; c.fill(); c.strokeStyle = p.col(CY, 0.95); c.lineWidth = 1.3; c.stroke();
      c.strokeStyle = p.col(CY, 0.5); c.lineWidth = 1; c.strokeRect(8, 8, p.w - 16, p.h - 16);
      c.font = '600 12px "DM Sans",sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = p.col(LT, 0.85); c.fillText('Von Mises', 14, p.h - 18);
      c.textAlign = 'center';
      p.ev.forEach(function (e) { var a = env(e.life); if (a > 0.45) { c.fillStyle = p.col(LT, a); c.fillText('\u03C3 max', Math.min(p.w - 30, Math.max(30, e.x)), Math.max(18, e.y - 14)); } });
    }
  };

  /* ---------- 3. Thermal: isotherm contours spreading from a source, with a refrigerant coil ---------- */
  var TAGS = ['\u00B0C', '\u0394T', 'T(t)', 'COP', 'Q'];
  var TH = {
    init: function (p) { p.rings = []; p.acc = 1; },
    step: function (p, dt) {
      var i, r;
      for (i = p.rings.length - 1; i >= 0; i--) { r = p.rings[i]; r.p += dt / r.dur; if (r.p >= 1) p.rings.splice(i, 1); }
      p.acc += dt;
      if (p.acc > 0.85 && p.rings.length < 5) { p.acc = 0; p.rings.push({ p: 0, dur: 3.4 + Math.random(), ph: Math.random() * TAU, a0: -1.2 + Math.random() * 2.4, tag: TAGS[(Math.random() * TAGS.length) | 0] }); }
    },
    draw: function (p) {
      var c = p.c, cx = p.w * 0.5, cy = p.h * 0.5, rmax = p.w * 0.46, ratio = p.h / p.w * 1.05, n, a;
      c.save(); c.beginPath(); c.rect(0, 0, p.w, p.h); c.clip();
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, 30); g.addColorStop(0, p.col(WARM, 0.9)); g.addColorStop(1, p.col(WARM, 0));
      c.fillStyle = g; c.fillRect(cx - 30, cy - 30, 60, 60);
      c.beginPath(); c.arc(cx, cy, 4, 0, TAU); c.fillStyle = p.col(WARM, 1); c.fill();
      c.font = '600 12px "DM Sans",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 1.6;
      p.rings.forEach(function (r) {
        var rr = rmax * Math.pow(r.p, 0.8), e = env(r.p) * (1 - r.p * 0.3), col = mix(WARM, CY, r.p), px, py, lx = 0, ly = 0;
        c.beginPath();
        for (n = 0; n <= 72; n++) {
          a = n / 72 * TAU; var wob = 1 + 0.05 * Math.sin(3 * a + r.ph + p.t * 0.8) + 0.03 * Math.sin(5 * a - r.ph);
          px = cx + Math.cos(a) * rr * wob; py = cy + Math.sin(a) * rr * wob * ratio;
          if (n === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.strokeStyle = p.col(col, e); c.stroke();
        lx = cx + Math.cos(r.a0) * rr; ly = cy + Math.sin(r.a0) * rr * ratio;
        if (r.p > 0.15 && lx > 16 && lx < p.w - 16 && ly > 10 && ly < p.h - 10) { c.fillStyle = p.col(LT, e); c.fillText(r.tag, lx, ly); }
      });
      c.setLineDash([4, 4]); c.lineDashOffset = -p.t * 18; c.lineWidth = 1.2; c.strokeStyle = p.col(CY, 0.55); c.beginPath();
      for (n = 10; n <= p.w - 10; n += 3) { var yy = p.h - 14 + Math.sin(n / 28 * TAU) * 5; if (n === 10) c.moveTo(n, yy); else c.lineTo(n, yy); }
      c.stroke(); c.restore();
    }
  };

  var scenes = [GD, FEA, TH], panels = cards.slice(0, 3).map(function (card, i) { return new Panel(card, scenes[i]); });
  var last = 0, raf = 0;
  function loop(now) {
    raf = 0; var dt = Math.min(0.05, (now - last) / 1000 || 0.016), any = false; last = now;
    panels.forEach(function (p) { if (!p.visible) return; any = true; p.step(dt); p.draw(); });
    if (any && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!reduce && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { panels.forEach(function (p) { if (p.card === e.target) p.visible = e.isIntersecting; }); }); kick(); });
    panels.forEach(function (p) { io.observe(p.card); });
  }
  document.addEventListener('visibilitychange', kick);
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { panels.forEach(function (p) { p.rs(); }); }, 150); });
  kick();
})();
