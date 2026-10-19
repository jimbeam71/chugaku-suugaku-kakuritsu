// 確率の裏技の問題データ生成: node genP.js -> src/data.js
// 手書き10問（src/handmade.js）＋ 計算で作る問題。誤答は「よくあるまちがい」から作り、理由も一緒に付ける。
const fs = require('fs'), path = require('path');

let seed = 20261020;
function R() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const MINUS = '−';
const lab = v => (v < 0 ? MINUS + (-v) : String(v));
const T = v => String(v);
const fr = (n, d) => '\\dfrac{' + n + '}{' + d + '}';
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function lcmBrute(a, b) { for (let x = Math.max(a, b); ; x++) if (x % a === 0 && x % b === 0) return x; }
const key = v => (v == null ? 'null:' + Math.random() : Array.isArray(v) ? v.map(x => x.toFixed(9)).join(',') : v.toFixed(9));

/* 問題を組み立てる。truth={v,tex}, cands=[{v,tex,why}]（先のものほど優先） */
function build(o) {
  const unit = o.unit || '';
  const wrap = (tex, raw) => (raw ? tex : '$' + tex + '$' + unit);
  const seen = [o.truth.tex], seenV = [key(o.truth.v)], wrongs = [];
  for (const c of o.cands) {
    if (wrongs.length >= 3) break;
    if (seen.includes(c.tex)) continue;
    if (!c.same && seenV.includes(key(c.v))) continue;
    seen.push(c.tex); seenV.push(key(c.v)); wrongs.push(c);
  }
  if (wrongs.length < 3) throw new Error(o.id + ': 誤答の候補が足りない');
  const all = shuffle([{ t: wrap(o.truth.tex, o.truth.raw), v: o.truth.v, ok: true }].concat(wrongs.map(c => (c.same ? { t: wrap(c.tex, c.raw), v: c.v, why: c.why, same: true } : { t: wrap(c.tex, c.raw), v: c.v, why: c.why }))));
  const ans = all.findIndex(x => x.ok);
  all.forEach(x => delete x.ok);
  const q = { id: o.id, expr: o.expr, p: o.p, ch: all, ans, steps: o.steps, point: o.point };
  if (o.fig) q.fig = o.fig;
  if (o.figAfter) q.figAfter = o.figAfter;
  return q;
}

/* ---------- 共通の小物 ---------- */
const LT = a => a.join(',\\ ');                                  // 数のならび（TeX）
const dfmt = x => String(+x.toFixed(8));                         // 小数の表示
const divisors = n => { const r = []; for (let i = 1; i <= n; i++) if (n % i === 0) r.push(i); return r; };
const reduceF = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const frT = (n, d) => (d === 1 ? String(n) : fr(n, d));           // 分母1なら整数で表示
const Fv = (n, d) => { const [a, b] = reduceF(n, d); return { v: n / d, tex: frT(a, b) }; };
const C = (n, d, why, same) => { const o = { v: n / d, tex: (n * d < 0 ? '-' : '') + frT(Math.abs(n), Math.abs(d)), why }; if (same) o.same = true; return o; };
const mixT = (w, n, d) => String(w) + fr(n, d);
function fracOfDec(x) { const s = Math.round(x * 10000); const g = gcd(s, 10000); return [s / g, 10000 / g]; }
const RAWQ = (id, p, truth, wrongs, steps, point, extra) => build(Object.assign({
  id, expr: '1', p, raw: true, truth: { v: 1, tex: truth, raw: true },
  cands: wrongs.map(([t, why]) => ({ v: null, raw: true, tex: t, why })), steps, point
}, extra || {}));
const lcmOf = (a, b) => a / gcd(a, b) * b;

/* ---------- 共通の小物（確率の裏技） ---------- */
const fp = n => (n < 0 ? '(' + n + ')' : String(n));       // かっこつきで表示
const sgnWord = s => (s < 0 ? 'マイナス' : 'プラス');
const cnt = a => a.filter(x => x < 0).length;


/* ---------- 文字式の道具 ---------- */
const D = s => (String(s).includes('$') || /[ぁ-んァ-ヶ一-龥]/.test(String(s)) ? s : '$' + s + '$');
// RQ: 4択（式が選択肢）。texはそのまま渡すと $…$ で包む
const RQ = (id, p, t, ws, steps, point, extra) => RAWQ(id, p, D(t), ws.map(([w, why]) => [D(w), why]), steps, point, extra);
// 1次式 a x + b を TeX に
const xt = (a, v) => (a === 1 ? v : a === -1 ? '-' + v : a + v);
const lin = (a, b, v) => { v = v || 'x'; if (a === 0) return String(b); let s = xt(a, v); if (b > 0) s += '+' + b; else if (b < 0) s += '-' + (-b); return s; };
const sgn = n => (n < 0 ? '-' + (-n) : '+' + n);
const num = n => String(n);
// 数値問題（答えがひとつの数）
const NQ = (id, p, t, ws, steps, point, unit) => build({ id, expr: String(t), p, truth: { v: t, tex: dfmt(t) }, cands: ws.map(([v, why]) => ({ v, tex: dfmt(v), why })), steps, point, unit });


/* ---------- 座標グラフの図（SVG） ---------- */
const GR = 6, GS = 22, GC = 150;
const gx = x => GC + GS * x, gy = y => GC - GS * y;
function graph(o) {
  o = o || {};
  const st = (s) => ' style="' + s + '"';
  let s = '<svg viewBox="0 0 300 300" role="img" aria-label="座標平面"' + st('width:100%;max-width:340px;height:auto;display:block;margin:8px auto') + '>';
  for (let i = -GR; i <= GR; i++) {
    if (i === 0) continue;
    s += '<line x1="' + gx(i) + '" y1="' + gy(-GR) + '" x2="' + gx(i) + '" y2="' + gy(GR) + '"' + st('stroke:var(--line);stroke-width:1') + '/>';
    s += '<line x1="' + gx(-GR) + '" y1="' + gy(i) + '" x2="' + gx(GR) + '" y2="' + gy(i) + '"' + st('stroke:var(--line);stroke-width:1') + '/>';
  }
  s += '<line x1="' + gx(-GR - .4) + '" y1="' + GC + '" x2="' + gx(GR + .4) + '" y2="' + GC + '"' + st('stroke:var(--fg);stroke-width:2') + '/>';
  s += '<line x1="' + GC + '" y1="' + gy(-GR - .4) + '" x2="' + GC + '" y2="' + gy(GR + .4) + '"' + st('stroke:var(--fg);stroke-width:2') + '/>';
  const tx = 'font:700 10px sans-serif;fill:var(--muted);text-anchor:middle';
  for (let i = -GR; i <= GR; i++) {
    if (i === 0) continue;
    s += '<text x="' + gx(i) + '" y="' + (GC + 13) + '"' + st(tx) + '>' + i + '</text>';
    s += '<text x="' + (GC - 9) + '" y="' + (gy(i) + 3.5) + '"' + st(tx) + '>' + i + '</text>';
  }
  s += '<text x="' + (GC - 8) + '" y="' + (GC + 13) + '"' + st(tx) + '>O</text>';
  s += '<text x="' + gx(GR + .4) + '" y="' + (GC + 24) + '"' + st('font:700 12px sans-serif;fill:var(--fg);text-anchor:end') + '>x</text>';
  s += '<text x="' + (GC + 10) + '" y="' + (gy(GR + .4) + 8) + '"' + st('font:700 12px sans-serif;fill:var(--fg)') + '>y</text>';
  (o.lines || []).forEach(a => {                       // y = a x
    const xm = Math.min(GR, GR / Math.abs(a));
    s += '<line x1="' + gx(-xm) + '" y1="' + gy(-a * xm) + '" x2="' + gx(xm) + '" y2="' + gy(a * xm) + '"' + st('stroke:var(--neg);stroke-width:2.5;stroke-linecap:round') + '/>';
  });
  (o.hyper || []).forEach(a => {                       // y = a / x
    [1, -1].forEach(sg => {
      let pts = [];
      for (let x = Math.abs(a) / GR; x <= GR + 1e-9; x += 0.05) pts.push(gx(sg * x).toFixed(1) + ',' + gy(a / (sg * x)).toFixed(1));
      s += '<polyline points="' + pts.join(' ') + '" fill="none"' + st('stroke:var(--neg);stroke-width:2.5;stroke-linecap:round') + '/>';
    });
  });
  (o.pts || []).forEach(p => {
    s += '<circle cx="' + gx(p.x) + '" cy="' + gy(p.y) + '" r="4.5"' + st('fill:var(--pos);stroke:var(--card);stroke-width:1.5') + '/>';
    if (p.l) s += '<text x="' + (gx(p.x) + 7) + '" y="' + (gy(p.y) - 6) + '"' + st('font:700 13px sans-serif;fill:var(--pos)') + '>' + p.l + '</text>';
  });
  return { type: 'svg', html: s + '</svg>' };
}
const ct = (x, y) => '(' + x + ',' + y + ')';
const rdc = (n, d) => { const g = gcd(n, d); n /= g; d /= g; if (d < 0) { n = -n; d = -d; } return [n, d]; };
const slope = (n, d) => { [n, d] = rdc(n, d); return d === 1 ? (n === 1 ? '' : n === -1 ? '-' : String(n)) + 'x' : (n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(n) + '}{' + d + '}x'; };
const yEq = (n, d) => 'y=' + slope(n, d);
const hyEq = a => 'y=' + (a < 0 ? '-' : '') + '\\dfrac{' + Math.abs(a) + '}{x}';
const QN = ['第1象限', '第2象限', '第3象限', '第4象限'];

const PI = n => (n === 1 ? '\\pi' : n + '\\pi');

const PU = (n, u) => '$' + PI(n) + '$ ' + u;
const S_ = s => ' style="' + s + '"';
const svgW = (h, inner) => '<svg viewBox="0 0 260 ' + h + '" role="img" aria-label="図"' + S_('width:100%;max-width:320px;height:auto;display:block;margin:8px auto') + '>' + inner + '</svg>';
const ln = (x1, y1, x2, y2, c, w, dash) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + S_('stroke:var(' + c + ');stroke-width:' + (w || 2) + ';stroke-linecap:round' + (dash ? ';stroke-dasharray:5 4' : '')) + '/>';
const tx = (x, y, t, a) => '<text x="' + x + '" y="' + y + '"' + S_('font:700 13px sans-serif;fill:var(--fg);text-anchor:' + (a || 'middle')) + '>' + t + '</text>';
const circ = (cx, cy, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="var(--card)"' + S_('stroke:var(--fg);stroke-width:2.5') + '/>';
const TT = s => '$' + s + '$';
const RT = rows => '<table class="rtab">' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
const txc = (x, y, t, c, a) => '<text x="' + x + '" y="' + y + '"' + S_('font:700 14px sans-serif;fill:var(' + (c || '--fg') + ');text-anchor:' + (a || 'middle')) + '>' + t + '</text>';
const isU = t => /[x?]/.test(String(t));
const RA = (a, b) => TT(a + ':' + b);
function figTri(L) {
  L = L || {};
  const A = [130, 20], B = [40, 150], C = [220, 150], D = [94, 72], E = [166, 72];
  let s = ln(B[0], B[1], C[0], C[1], '--fg', 2.4) + ln(A[0], A[1], B[0], B[1], '--fg', 2.4) + ln(A[0], A[1], C[0], C[1], '--fg', 2.4) + ln(D[0], D[1], E[0], E[1], '--neg', 2.6);
  s += txc(130, 12, 'A') + txc(28, 162, 'B') + txc(232, 162, 'C') + txc(80, 78, 'D') + txc(182, 78, 'E');
  const put = (k, x, y, a) => { if (L[k] != null) s += txc(x, y, L[k], isU(L[k]) ? '--pos' : '--muted', a); };
  put('AD', 100, 44, 'end'); put('DB', 56, 114, 'end'); put('AE', 162, 44, 'start'); put('EC', 206, 114, 'start'); put('DE', 130, 64); put('BC', 130, 172);
  return { type: 'svg', html: svgW(185, s) };
}
function figEn(o) {
  const cx = 130, cy = 100, r = 70, rad = d => d * Math.PI / 180;
  const pt = a => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
  const A = pt(o.A), B = pt(o.B), P = pt(o.P);
  let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none"' + S_('stroke:var(--fg);stroke-width:2.4') + '/>';
  if (o.dia) s += ln(A[0], A[1], B[0], B[1], '--pos', 2.6); else s += ln(cx, cy, A[0], A[1], '--pos', 2.6) + ln(cx, cy, B[0], B[1], '--pos', 2.6);
  s += ln(P[0], P[1], A[0], A[1], '--neg', 2.6) + ln(P[0], P[1], B[0], B[1], '--neg', 2.6);
  s += txc(A[0] - (o.A > 90 && o.A < 270 ? 12 : -12), A[1] + 5, 'A') + txc(B[0] + (o.B > 90 && o.B < 270 ? -12 : 12), B[1] + 5, 'B') + txc(P[0], P[1] - 8, 'P') + txc(cx + 12, cy - 6, 'O', '--muted');
  if (o.labC) s += txc(cx, cy + 32, o.labC, isU(o.labC) ? '--pos' : '--pos');
  if (o.labP) s += txc(P[0] + 16, P[1] + 20, o.labP, '--neg', 'start');
  return { type: 'svg', html: svgW(200, s) };
}
function figRt(a, b, c) {
  const R = [60, 150], H = [210, 150], V = [60, 50];
  let s = ln(R[0], R[1], H[0], H[1], '--fg', 2.6) + ln(R[0], R[1], V[0], V[1], '--fg', 2.6) + ln(V[0], V[1], H[0], H[1], '--fg', 2.6);
  s += '<rect x="60" y="136" width="14" height="14" fill="none"' + S_('stroke:var(--fg);stroke-width:2') + '/>';
  const col = t => (isU(t) ? '--pos' : '--muted');
  s += txc(135, 172, a, col(a)) + txc(46, 105, b, col(b), 'end') + txc(150, 92, c, col(c), 'start');
  return { type: 'svg', html: svgW(185, s) };
}
function figTwo(o) {
  o = o || {};
  const sd = o.sides || {}, an = o.angs || {};
  const P = { B: [15, 140], C: [95, 140], A: [55, 70], E: [130, 140], F: [250, 140], D: [190, 35] };
  let s = '';
  [['A', 'B', 'C'], ['D', 'E', 'F']].forEach(t => { s += ln(P[t[0]][0], P[t[0]][1], P[t[1]][0], P[t[1]][1], '--fg', 2.4) + ln(P[t[1]][0], P[t[1]][1], P[t[2]][0], P[t[2]][1], '--fg', 2.4) + ln(P[t[2]][0], P[t[2]][1], P[t[0]][0], P[t[0]][1], '--fg', 2.4); });
  s += txc(55, 62, 'A') + txc(6, 152, 'B') + txc(104, 152, 'C') + txc(190, 27, 'D') + txc(121, 152, 'E') + txc(253, 154, 'F');
  const sp = { AB: [24, 102, 'end'], AC: [88, 102, 'start'], BC: [55, 164, 'middle'], DE: [150, 82, 'end'], DF: [232, 82, 'start'], EF: [190, 164, 'middle'] };
  Object.keys(sd).forEach(k => { s += txc(sp[k][0], sp[k][1], sd[k], isU(sd[k]) ? '--pos' : '--neg', sp[k][2]); });
  const ap = { A: [55, 98], B: [34, 134], C: [78, 134], D: [190, 66], E: [152, 134], F: [228, 134] };
  Object.keys(an).forEach(k => { s += '<text x="' + ap[k][0] + '" y="' + ap[k][1] + '"' + S_('font:700 11px sans-serif;fill:var(--pos);text-anchor:middle') + '>' + an[k] + '</text>'; });
  return { type: 'svg', html: svgW(175, s) };
}
function figShadow() {
  let s = ln(10, 150, 250, 150, '--muted', 1.5);
  s += ln(20, 150, 20, 132.4, '--fg', 3) + ln(20, 132.4, 42, 150, '--pos', 2) + ln(20, 150, 42, 150, '--neg', 3);
  s += ln(130, 150, 130, 62, '--fg', 3) + ln(130, 62, 240, 150, '--pos', 2) + ln(130, 150, 240, 150, '--neg', 3);
  s += txc(8, 126, '1.6 m', '--fg', 'start') + txc(31, 168, '2 m') + txc(118, 108, 'x', '--pos', 'end') + txc(185, 168, '10 m') + txc(20, 100, '人', '--muted', 'middle') + txc(130, 50, '木', '--muted', 'middle');
  return { type: 'svg', html: svgW(180, s) };
}
const rf = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const FT = (n, d) => { [n, d] = rf(n, d); return '$' + (d === 1 ? n : '\\dfrac{' + n + '}{' + d + '}') + '$'; };
function PQ(id, p, tr, wr, steps, point, extra) {
  const key = a => rf(a[0], a[1]).join('/'); const seen = new Set([key(tr)]);
  wr.forEach(w => { if (seen.has(key(w))) throw new Error('誤答重複 ' + id + ' ' + key(w)); seen.add(key(w)); });
  return RAWQ(id, p, FT(tr[0], tr[1]), wr.map(w => [FT(w[0], w[1]), w[2]]), steps, point, extra);
}
const cntD = f => { let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (f(i, j)) c++; return c; };
function figDice(hl, val) {
  val = val || ((i, j) => i + j);
  const x0 = 40, y0 = 36, cs = 32;
  let s = txc(x0 + 3 * cs, 14, '小さいさいころ', '--muted') + txc(14, y0 + 3 * cs + 4, '大', '--muted');
  for (let k = 1; k <= 6; k++) s += txc(x0 + (k - 0.5) * cs, y0 - 6, k, '--fg') + txc(x0 - 10, y0 + (k - 0.5) * cs + 5, k, '--fg');
  for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) {
    const on = hl(i, j);
    s += '<rect x="' + (x0 + (j - 1) * cs) + '" y="' + (y0 + (i - 1) * cs) + '" width="' + cs + '" height="' + cs + '"' + S_('fill:' + (on ? 'var(--pos)' : 'var(--card)') + ';fill-opacity:' + (on ? '.28' : '1') + ';stroke:var(--line);stroke-width:1.5') + '/>';
    s += '<text x="' + (x0 + (j - 0.5) * cs) + '" y="' + (y0 + (i - 0.5) * cs + 5) + '"' + S_('font:' + (on ? '800' : '500') + ' 13px sans-serif;fill:var(' + (on ? '--pos' : '--muted') + ');text-anchor:middle') + '>' + val(i, j) + '</text>';
  }
  return { type: 'svg', html: svgW(y0 + 6 * cs + 10, s) };
}
function figCoins() {
  const lx = [30, 95, 160], ly = i => 18 + i * 22;
  let s = '';
  const mid = (a, b) => (a + b) / 2;
  const y3 = []; for (let i = 0; i < 8; i++) y3.push(ly(i));
  const y2 = []; for (let i = 0; i < 4; i++) y2.push(mid(y3[2 * i], y3[2 * i + 1]));
  const y1 = [mid(y2[0], y2[1]), mid(y2[2], y2[3])];
  const yr = mid(y1[0], y1[1]);
  s += ln(10, yr, lx[0], y1[0], '--fg', 2) ;
  y1.forEach((y, a) => { s += ln(lx[0] + 14, yr, lx[1] - 10, y, '--muted', 1.8); });
  s = '';
  const root = [12, yr];
  const L1 = y1.map(y => [lx[0] + 8, y]), L2 = y2.map(y => [lx[1] + 8, y]), L3 = y3.map(y => [lx[2] + 8, y]);
  L1.forEach((p, a) => { s += ln(root[0], root[1], p[0] - 6, p[1], '--muted', 1.8); });
  L2.forEach((p, a) => { const q = L1[a >> 1]; s += ln(q[0] + 6, q[1], p[0] - 6, p[1], '--muted', 1.8); });
  L3.forEach((p, a) => { const q = L2[a >> 1]; s += ln(q[0] + 6, q[1], p[0] - 6, p[1], '--muted', 1.8); });
  const f = k => (k ? '裏' : '表');
  L1.forEach((p, a) => { s += txc(p[0], p[1] + 5, f(a), '--neg'); });
  L2.forEach((p, a) => { s += txc(p[0], p[1] + 5, f(a & 1), '--neg'); });
  L3.forEach((p, a) => { s += txc(p[0], p[1] + 5, f(a & 1), '--neg'); s += txc(205, p[1] + 5, f(a >> 2) + f((a >> 1) & 1) + f(a & 1), '--fg', 'start'); });
  return { type: 'svg', html: svgW(ly(7) + 16, s) };
}
/* ===== A: 公式を使わない（表・樹形図） ===== */
function sDice() {
  const q = [];
  q.push(NQ('kd-1', '大小2つのさいころを投げるとき、目の出方は全部で何通り？', 36, [[12, '$6+6$ ではなく、$6\\times6$。'], [6, '1個ぶんだけ。2個では、$6\\times6$。'], [66, '$6$ と $6$ をならべるのではない。$6\\times6$。']], ['大が 6通り、小も 6通り。', '$6\\times6=36$（6×6の表のマスの数）。'], '大小2つのさいころ → 6×6＝36マスの表。', '通り'));
  const T = f => [cntD(f), 36];
  const A = (id, p, f, wr, steps, point, val) => PQ(id, p, T(f), wr, steps, point, { fig: figDice(f, val) });
  q.push(A('kd-2', '大小2つのさいころを投げるとき、目の和が $7$ になる確率は？', (i, j) => i + j === 7, [[1, 12, '和が7のマスは、6つ（斜めに並ぶ）。'], [7, 36, '7通りではなく、6通り。'], [1, 36, '1通りではない。表の斜めの、6マス。']], ['表の中で、和が 7 のマスに色をつける。', '6マス。$\\dfrac{6}{36}=\\dfrac{1}{6}$。'], '表をかいて、条件のマスを数える。'));
  q.push(A('kd-3', '大小2つのさいころを投げるとき、目の和が $9$ になる確率は？', (i, j) => i + j === 9, [[1, 6, '1/6 は、和が7のときの確率。和が9は、4マス。'], [9, 36, '9通りではない。表で数えると、4マス。'], [1, 12, '3マスではなく、4マス。']], ['表で、和が 9 のマス：(3,6)(4,5)(5,4)(6,3)。', '4マス。$\\dfrac{4}{36}=\\dfrac{1}{9}$。'], '和・差・積は、表を埋めて数える。'));
  q.push(A('kd-4', '大小2つのさいころを投げるとき、目の差（大きいほう − 小さいほう）が $2$ になる確率は？', (i, j) => Math.abs(i - j) === 2, [[1, 9, '4マスは、片側だけ数えた数。入れかえた目も数える。'], [1, 6, '6マスではなく、8マス。'], [1, 4, '9マスではなく、8マス。']], ['差が 2 のマス：(1,3)(2,4)(3,5)(4,6) と、入れかえた4つ。', '8マス。$\\dfrac{8}{36}=\\dfrac{2}{9}$。'], '大と小は区別するので、入れかえた目も、別のマス。', (i, j) => Math.abs(i - j)));
  q.push(A('kd-5', '大小2つのさいころを投げるとき、目の積が偶数になる確率は？', (i, j) => (i * j) % 2 === 0, [[1, 4, '積が奇数になる確率が $\\dfrac{9}{36}=\\dfrac{1}{4}$。'], [1, 2, '偶数のマスは、半分より多い。27マス。'], [2, 3, '$\\dfrac{24}{36}$ ではなく、$\\dfrac{27}{36}$。']], ['積が奇数になるのは、奇数どうし：$3\\times3=9$ マス。', '偶数は $36-9=27$ マス。$\\dfrac{27}{36}=\\dfrac{3}{4}$。'], '数えにくいときは「全体 − 反対」。', (i, j) => i * j));
  q.push(A('kd-6', '大小2つのさいころを投げるとき、目の積が $6$ の倍数になる確率は？', (i, j) => (i * j) % 6 === 0, [[1, 6, '6の倍数になるマスは、15マス。'], [1, 3, '12マスではなく、15マス。'], [1, 4, '9マスではなく、15マス。']], ['積が 6 の倍数のマスに、色をつける。', '15マス。$\\dfrac{15}{36}=\\dfrac{5}{12}$。'], '表に、積を書きこんで、数える。', (i, j) => i * j));
  q.push(A('kd-7', '大小2つのさいころを投げるとき、大の目が小の目より $1$ だけ大きくなる確率は？', (i, j) => i - j === 1, [[1, 6, '6マスではなく、5マス。'], [1, 12, '3マスではなく、5マス。'], [1, 36, '1マスではなく、5マス。']], ['(2,1)(3,2)(4,3)(5,4)(6,5) の 5マス。', '$\\dfrac{5}{36}$。'], '「大」「小」は区別して、(大, 小) の順に書く。', (i, j) => i - j));
  return q;
}
function sCoin() {
  const F = { fig: figCoins() };
  return [
    Object.assign(NQ('kc-1', '3枚の硬貨を投げるとき、表と裏の出方は全部で何通り？', 8, [[6, '$3\\times2=6$ ではなく、$2\\times2\\times2$。'], [9, '$3\\times3$ ではなく、$2\\times2\\times2$。'], [3, '1枚ごとに、表と裏の2通り。']], ['1枚ごとに、表・裏の2通り。', '$2\\times2\\times2=8$。樹形図の、右はしが 8つ。'], '硬貨3枚 → 樹形図（全部で8通り）。', '通り'), F),
    Object.assign(PQ('kc-2', '3枚の硬貨を投げるとき、3枚とも表になる確率は？', [1, 8], [[1, 3, '全部で 8通り。3枚とも表は、1通り。'], [1, 2, '1/2 は、1枚が表になる確率。'], [3, 8, '3/8 は、ちょうど1枚が表になる確率。']], ['樹形図の中で、表表表は、1つ。', '$\\dfrac{1}{8}$。'], '樹形図で、条件を満たす枝を数える。'), F),
    Object.assign(PQ('kc-3', '3枚の硬貨を投げるとき、表が2枚、裏が1枚になる確率は？', [3, 8], [[1, 3, '全部で8通り。表表裏、表裏表、裏表表の、3通り。'], [1, 8, '1通りではなく、3通り。'], [2, 8, '2通りではなく、3通り。']], ['表表裏、表裏表、裏表表の 3通り。', '$\\dfrac{3}{8}$。'], '同じ「表2・裏1」でも、並び方は、3通り。'), F),
    Object.assign(PQ('kc-4', '3枚の硬貨を投げるとき、少なくとも1枚は表になる確率は？', [7, 8], [[1, 8, '1/8 は、3枚とも裏の確率。'], [3, 8, '3/8 は、ちょうど1枚が表の確率。'], [1, 2, '1/2 ではない。裏裏裏以外の、7通り。']], ['「少なくとも1枚は表」の反対は、「3枚とも裏」。', '$1-\\dfrac{1}{8}=\\dfrac{7}{8}$。'], '「少なくとも〜」は、1 − 反対（全部ちがう）。'), F),
    Object.assign(PQ('kc-5', '3枚の硬貨を投げるとき、表が1枚以下になる確率は？', [1, 2], [[1, 4, '表0枚（1通り）と、表1枚（3通り）の合計は、4通り。'], [3, 8, '3/8 は、表がちょうど1枚の確率。'], [1, 8, '1通りは、表0枚だけ。表1枚の3通りも足す。']], ['表0枚：裏裏裏の 1通り。', '表1枚：3通り。合わせて 4通り。$\\dfrac{4}{8}=\\dfrac{1}{2}$。'], '「以下」は、ふくめて数える。'), F),
    PQ('kc-6', '2枚の硬貨を投げるとき、1枚が表、1枚が裏になる確率は？', [1, 2], [[1, 3, '(表,裏) と (裏,表) は別。全部で 4通り。'], [1, 4, '1通りではなく、2通り。'], [2, 3, '全部で 3通りではなく、4通り。']], ['全部：表表、表裏、裏表、裏裏 の 4通り。', '表裏、裏表 の 2通り。$\\dfrac{2}{4}=\\dfrac{1}{2}$。'], '2枚でも、区別して数える。'),
    Object.assign(PQ('kc-7', '3枚の硬貨を投げるとき、3枚とも同じ面（すべて表、またはすべて裏）になる確率は？', [1, 4], [[1, 8, '表表表だけでなく、裏裏裏もある。2通り。'], [1, 2, '1/2 ではない。2通りだけ。'], [3, 8, '3/8 は、表2・裏1 の確率。']], ['表表表と、裏裏裏の 2通り。', '$\\dfrac{2}{8}=\\dfrac{1}{4}$。'], '約分を忘れずに。'), F)
  ];
}
/* ===== B: CかPか ===== */
const OPT = ['C（わり算のある分数）', 'P（かけ算だけ）', '6×6の表をかく', '樹形図をかく'];
function kw(id, p, k, why, hint, point) {
  const W = ['「同時に」「選ぶだけ」は、順番を気にしない。Cのしるし。', '「順番に」「並べる」「役職」は、順番に意味がある。Pのしるし。', '「大小2つのさいころ」は、公式を使わない。表をかく。', '「硬貨3枚」は、公式を使わない。樹形図をかく。'];
  return RAWQ(id, p, OPT[k], OPT.map((o, i) => [o, W[i]]).filter((_, i) => i !== k), hint, point);
}
function sKeyword() {
  return [
    kw('kw-1', '「赤玉3個、白玉2個から、<b>同時に</b> 2個取り出す」。何で解く？', 0, '', ['キーワードは「同時に」。', '順番を気にしない → C。'], '「同時に」「選ぶだけ」「図形を作る」→ C。'),
    kw('kw-2', '「5人から、<b>委員長と副委員長</b>を選ぶ」。何で解く？', 1, '', ['役職がちがう → 順番に意味がある。', 'P（かけ算だけ）。'], '「順番に」「整数を作る」「役職がちがう」→ P。'),
    kw('kw-3', '「0、1、2、3、4のカードから2枚を<b>並べて</b>2桁の整数を作る」。何で解く？', 1, '', ['「並べて」「整数を作る」→ 順番に意味がある。', 'P（かけ算だけ）。'], '整数を作る → P。'),
    kw('kw-4', '「5人の中から、2人の委員を<b>選ぶだけ</b>」。何で解く？', 0, '', ['「選ぶだけ」→ 順番を気にしない。', 'C。'], '「選ぶだけ」→ C。'),
    kw('kw-5', '「<b>大小2つのさいころ</b>を投げる」。何で解く？', 2, '', ['公式を使う前に、「大小2つのさいころ」は、表。', '6×6＝36マス。'], '大小2つのさいころ → 表（公式禁止）。'),
    kw('kw-6', '「袋から1個ずつ、<b>順番に</b>、戻さずに2回引く」。何で解く？', 1, '', ['「順番に」→ P。', 'かけ算だけ。'], '「1個ずつ順番に」→ P。'),
    kw('kw-7', '「円周上の5点から、3点を選んで<b>三角形を作る</b>」。何で解く？', 0, '', ['三角形は、点を選ぶだけ。順番は関係ない。', 'C。'], '「図形を作る」→ C。')
  ];
}
function sC() {
  return [
    NQ('cc-1', '${}_5\\mathrm{C}_2$ の値は？（$\\dfrac{5\\times4}{2\\times1}$）', 10, [[20, '分母 $2\\times1$ でわるのを忘れている。'], [5, '$5\\times4$ の、$4$ を忘れている。'], [25, '$5\\times5$ ではなく、$5\\times4\\div(2\\times1)$。']], ['分子：5から2個、下にかける $5\\times4$。', '分母：2から1までかける $2\\times1$。', '$\\dfrac{20}{2}=10$。'], 'C：分子は上から下へ、分母は個数から 1 まで。', '通り'),
    NQ('cc-2', '${}_6\\mathrm{C}_2$ の値は？', 15, [[30, '$6\\times5=30$。$2\\times1$ でわる。'], [12, '$6\\times2$ ではなく、$6\\times5\\div2$。'], [36, '$6\\times6$ ではない。']], ['$\\dfrac{6\\times5}{2\\times1}=\\dfrac{30}{2}=15$。'], 'Cの分母は、選ぶ個数から 1 まで。', '通り'),
    NQ('cc-3', '${}_5\\mathrm{C}_3$ の値は？（$\\dfrac{5\\times4\\times3}{3\\times2\\times1}$）', 10, [[60, '分母 $3\\times2\\times1=6$ でわるのを忘れている。'], [15, '$\\dfrac{5\\times4\\times3}{4}$ ではない。分母は $3\\times2\\times1=6$。'], [20, '$5\\times4=20$ でとめてはいけない。3個ぶん。']], ['分子：$5\\times4\\times3=60$。', '分母：$3\\times2\\times1=6$。$60\\div6=10$。'], '3個選ぶなら、分子も分母も、3個ぶん。', '通り'),
    NQ('cc-4', '${}_7\\mathrm{C}_2$ の値は？', 21, [[42, '$7\\times6=42$。$2$ でわる。'], [14, '$7\\times2$ ではない。'], [49, '$7\\times7$ ではない。']], ['$\\dfrac{7\\times6}{2\\times1}=21$。'], '約分できるときは、先に約分。', '通り'),
    NQ('cc-5', '10人から2人を選ぶ。選び方は何通り？', 45, [[90, '$10\\times9=90$。$2\\times1$ でわる。'], [20, '$10\\times2$ ではない。'], [100, '$10\\times10$ ではない。']], ['選ぶだけなので、C。', '$\\dfrac{10\\times9}{2\\times1}=45$。'], '「選ぶだけ」は、C。', '通り'),
    RQ('cc-6', '${}_5\\mathrm{C}_2$ の、正しい計算式は？', '$\\dfrac{5\\times4}{2\\times1}$', [['$5\\times4$', '分母の $2\\times1$ が必要。'], ['$\\dfrac{5\\times4}{5}$', '分母は、5 ではなく、$2\\times1$。'], ['$\\dfrac{5\\times4\\times3}{3\\times2\\times1}$', 'これは、${}_5\\mathrm{C}_3$ の式。']], ['分子は、5 から 2 個ぶん。', '分母は、2 から 1 まで。'], '${}_n\\mathrm{C}_r$：分子は $n$ から $r$ 個、分母は $r$ から 1 まで。'),
    NQ('cc-7', '6人から3人を選ぶ。選び方は何通り？', 20, [[120, '分母 $3\\times2\\times1=6$ でわる。'], [60, '$\\dfrac{6\\times5\\times4}{2}$ ではない。分母は $3\\times2\\times1$。'], [18, '$6\\times3$ ではない。']], ['$\\dfrac{6\\times5\\times4}{3\\times2\\times1}=\\dfrac{120}{6}=20$。'], '3個選ぶなら、3個ぶん。', '通り')
  ];
}
function sP() {
  return [
    NQ('pp-1', '${}_5\\mathrm{P}_2$ の値は？（かけ算だけ）', 20, [[10, 'P は、わり算をしない。$5\\times4=20$。'], [25, '$5\\times5$ ではなく、$5\\times4$。'], [5, '$5\\times4$ の、$4$ を忘れている。']], ['5 から 2個、下にかける。', '$5\\times4=20$。'], 'P：割り算しない。かけ算だけ。', '通り'),
    NQ('pp-2', '${}_4\\mathrm{P}_2$ の値は？', 12, [[6, 'わり算をしてしまった。$4\\times3=12$。'], [16, '$4\\times4$ ではなく、$4\\times3$。'], [8, '$4\\times2$ ではなく、$4\\times3$。']], ['$4\\times3=12$。'], 'P：個数のぶんだけ、下へかける。', '通り'),
    NQ('pp-3', '${}_6\\mathrm{P}_2$ の値は？', 30, [[15, 'わり算をしてしまった。$6\\times5=30$。'], [36, '$6\\times6$ ではなく、$6\\times5$。'], [12, '$6\\times2$ ではなく、$6\\times5$。']], ['$6\\times5=30$。'], 'P はかけ算だけ。', '通り'),
    NQ('pp-4', '${}_5\\mathrm{P}_3$ の値は？', 60, [[10, 'わり算をしてしまった。$5\\times4\\times3=60$。'], [125, '$5\\times5\\times5$ ではなく、$5\\times4\\times3$。'], [15, '$5\\times3$ ではなく、$5\\times4\\times3$。']], ['3個選ぶので、3個ぶんかける。', '$5\\times4\\times3=60$。'], '3個選ぶなら、3つかける。', '通り'),
    NQ('pp-5', '1、2、3、4、5 のカードから2枚を並べて、2桁の整数を作る。何通り？', 20, [[25, '同じカードは2回使えない。$5\\times4$。'], [10, 'わり算はしない。$5\\times4=20$。'], [15, '$5\\times3$ ではなく、$5\\times4$。']], ['十の位は 5通り。', '一の位は、残り 4通り。$5\\times4=20$。'], '「並べて整数を作る」→ P。', '通り'),
    NQ('pp-6', '5人から、委員長と副委員長を1人ずつ選ぶ。選び方は何通り？', 20, [[10, '役職がちがうので、順番に意味がある。わり算しない。'], [25, '同じ人は、両方になれない。$5\\times4$。'], [9, '$5+4$ ではなく、$5\\times4$。']], ['委員長は 5通り。', '副委員長は、残り 4通り。$5\\times4=20$。'], '「役職がちがう」→ P。', '通り'),
    NQ('pp-7', '0、1、2 のカードから2枚を並べて、2桁の整数を作る。何通り？（0 は十の位に置けない）', 4, [[6, '$3\\times2=6$ では、0 が十の位になる数もかぞえている。'], [3, '十の位 2通り、一の位 2通り。'], [9, '同じカードは、2回使えない。']], ['十の位は、0 以外の 2通り（1、2）。', '一の位は、残りの 2通り。$2\\times2=4$（10、12、20、21）。'], '0 が先頭になれないことに、注意。', '通り')
  ];
}
/* ===== C: 背番号と総合 ===== */
function sBan() {
  return [
    NQ('bn-1', '赤玉3個、白玉2個から、同時に2個取り出す。全部の取り出し方は何通り？', 10, [[5, '玉は 5個。2個を選ぶのは、5C2。'], [20, 'わり算を忘れている。5C2 ＝ $\\dfrac{5\\times4}{2\\times1}$。'], [3, '$3$ は、赤玉の数。']], ['「同時に」→ C。', '赤①②③、白①②の 5個から 2個。${}_5\\mathrm{C}_2=10$。'], '玉に背番号をつけて、すべて区別する。', '通り'),
    PQ('bn-2', '赤玉3個、白玉2個から、同時に2個取り出す。赤玉1個、白玉1個になる確率は？', [3, 5], [[2, 5, '赤1個・白1個は、$3\\times2=6$ 通り。'], [1, 2, '6通り。$\\dfrac{6}{10}$。'], [3, 10, '3通りではなく、6通り。']], ['赤の選び方 3通り × 白の選び方 2通り ＝ 6通り。', '$\\dfrac{6}{10}=\\dfrac{3}{5}$。'], '色ごとに、背番号をつけて、かけ算で数える。'),
    PQ('bn-3', '赤玉3個、白玉2個から、同時に2個取り出す。2個とも白玉である確率は？', [1, 10], [[1, 5, '2個とも白は、${}_2\\mathrm{C}_2=1$ 通り。'], [2, 5, '2/5 は、ちがうよ。1通り。'], [1, 2, '1通りだけ。全部で10通り。']], ['白①②の 2個から 2個：1通り。', '$\\dfrac{1}{10}$。'], '2個とも同じ色のとき、${}_2\\mathrm{C}_2=1$。'),
    RQ('bn-4', '赤玉3個、白玉2個。全部の取り出し方を数えるとき、正しいのは？', '赤①②③、白①②と、すべて区別して数える', [['赤3個は、ぜんぶ同じなので、1つと数える', '同じ色でも、別のものとして数える。'], ['色だけを区別して、赤・白の2通りと数える', '玉1個ずつを、区別する。'], ['白だけを区別する', '赤も、区別する。']], ['魔法の合言葉：全部に背番号（名前）をつけろ。'], '確率は、全部に背番号をつけて、すべて違うものとして計算する。'),
    RQ('bn-5', '同じ色の玉を、同じものとして数えると、どうなる？', '確率が、正しく求められなくなる', [['計算が速くなって、答えも合う', '同じ色だと、起こりやすさがちがうのに、1通りと数えてしまう。'], ['何も変わらない', '分母・分子が変わって、答えがずれる。'], ['分母だけが大きくなる', '分母も分子も、ずれる。']], ['赤が3個あるのは、「赤が出やすい」ということ。', '区別しないと、その差が消える。'], '同じ色でも、背番号をつけて、すべて別のものとして数える。'),
    PQ('bn-6', '当たり2本、はずれ3本のくじから、同時に2本引く。少なくとも1本当たる確率は？', [7, 10], [[3, 10, '3/10 は、2本ともはずれの確率。'], [2, 5, '2本ともはずれ以外の、すべて。$1-\\dfrac{3}{10}$。'], [1, 10, '1/10 は、2本とも当たりの確率。']], ['反対は「2本ともはずれ」：${}_3\\mathrm{C}_2=3$ 通り。', '全部 10通り。$1-\\dfrac{3}{10}=\\dfrac{7}{10}$。'], '「少なくとも〜」は、1 − 反対。'),
    PQ('bn-7', '男子3人、女子2人から、同時に2人選ぶ。2人とも男子である確率は？', [3, 10], [[3, 5, '3/5 は、男女1人ずつの確率。'], [1, 10, '2人とも男子は、${}_3\\mathrm{C}_2=3$ 通り。'], [2, 5, '2/5 ではない。3通り。']], ['男子 ①②③ から 2人：${}_3\\mathrm{C}_2=3$ 通り。', '全部 ${}_5\\mathrm{C}_2=10$ 通り。$\\dfrac{3}{10}$。'], '「同時に」→ C。分母も分子も C。')
  ];
}
function sSogo() {
  const nums = []; for (const a of [1, 2, 3, 4]) for (const b of [1, 2, 3, 4]) if (a !== b) nums.push(a * 10 + b);
  const m3 = nums.filter(x => x % 3 === 0).length;
  return [
    PQ('sg-1', '【例題1】赤玉3個、白玉2個の袋から、同時に2個取り出す。2個とも赤玉である確率は？', [3, 10], [[3, 5, '2個とも赤は、${}_3\\mathrm{C}_2=3$ 通り。全体は 10通り。'], [1, 10, '1通りではなく、3通り。'], [2, 5, '2/5 ではない。3通りなので $\\dfrac{3}{10}$。']], ['「同時に」→ C。', '分母：${}_5\\mathrm{C}_2=10$。', '分子：赤3個から2個 ${}_3\\mathrm{C}_2=3$。$\\dfrac{3}{10}$。'], '同時に → 分母も分子も C。'),
    PQ('sg-2', '【例題2】0、1、2、3、4の5枚のカードから2枚を選んで並べて、2桁の整数を作る。偶数になる確率は？', [5, 8], [[5, 16, '分母は 16、分子は 10。約分して $\\dfrac{5}{8}$。'], [1, 2, '1/2 は、分子を 8 としたとき。分子は 10通り。'], [3, 5, '3/5 ではない。10/16 を約分する。']], ['「並べて整数」→ P。', '全体：十の位 4通り（0以外）、一の位 4通り。$4\\times4=16$。', '偶数：一の位が 0 のとき 4、2 のとき 3、4 のとき 3。計 10通り。$\\dfrac{10}{16}=\\dfrac{5}{8}$。'], '0 が十の位に来ないことに注意。'),
    PQ('sg-3', 'A、B、C、D、E の5人から、同時に2人の委員を選ぶ。A が選ばれる確率は？', [2, 5], [[1, 5, 'A を含む組は、4通り。全体は 10通り。'], [1, 2, '1/2 ではない。4/10 を約分して 2/5。'], [4, 5, '4/5 は、分母を 5 としたとき。分母は 10。']], ['全体：${}_5\\mathrm{C}_2=10$ 通り。', 'A を含む組：(A,B)(A,C)(A,D)(A,E) の 4通り。$\\dfrac{4}{10}=\\dfrac{2}{5}$。'], '「選ぶだけ」→ C。'),
    PQ('sg-4', 'A、B、C、D、E の5人から、委員長と副委員長を選ぶ。A が委員長になる確率は？', [1, 5], [[2, 5, '2/5 は、同時に2人選ぶときの確率。役職がちがうので、P。'], [1, 4, '分母は 20通り。'], [4, 5, '4/5 ではない。A が委員長は 4通り（副が4人）。']], ['「役職」→ P。', '全体：$5\\times4=20$ 通り。', 'A が委員長：副委員長は 4通り。$\\dfrac{4}{20}=\\dfrac{1}{5}$。'], '役職がちがう → P（かけ算）。'),
    PQ('sg-5', '1、2、3、4 のカードから2枚を並べて、2桁の整数を作る。3の倍数になる確率は？', [m3, nums.length], [[1, 4, '3の倍数は、12・21・24・42 の4個。全部で 12個。'], [1, 2, '1/2 ではない。4個。'], [1, 6, '2個ではなく、4個。']], ['「並べて整数」→ P。全部で $4\\times3=12$ 通り。', '3の倍数：12、21、24、42 の 4個。$\\dfrac{4}{12}=\\dfrac{1}{3}$。'], '全体を P で出して、条件に合うものを書き出す。'),
    NQ('sg-6', '円周上に6個の点がある。3点を選んで三角形を作るとき、三角形は何個できる？', 20, [[120, '順番を気にしない。わり算をする（C）。'], [60, '$\\dfrac{6\\times5\\times4}{2}$ ではない。分母は $3\\times2\\times1$。'], [18, '$6\\times3$ ではない。']], ['「図形を作る」→ C。', '${}_6\\mathrm{C}_3=\\dfrac{6\\times5\\times4}{3\\times2\\times1}=20$。'], '図形を作る（順番に関係ない）→ C。', '個'),
    PQ('sg-7', '1、2、3、4、5 のカードから、同時に2枚取り出す。2枚の和が偶数になる確率は？', [2, 5], [[1, 2, '5/10 ではなく、4/10。'], [3, 5, '3/5 は、和が奇数になる確率。'], [1, 5, '2通りではなく、4通り。']], ['「同時に」→ C。全部で ${}_5\\mathrm{C}_2=10$ 通り。', '和が偶数：(1,3)(1,5)(3,5)(2,4) の 4通り。$\\dfrac{4}{10}=\\dfrac{2}{5}$。'], '和が偶数 ＝ 偶数どうし、または、奇数どうし。')
  ];
}
const I = {
  d: '<b>絶対ルール1</b>：「大小2つのさいころ」が出たら、公式は禁止！<br><b>6×6＝36マスの表</b>をかく。和・差・積は、表を埋めて数えるのが、最速でミスがない。<br>確率 ＝ 条件に合うマス ÷ 36。',
  c: '<b>絶対ルール1</b>：「硬貨3枚」が出たら、公式は禁止！<br>表・裏の<b>樹形図</b>をかく（全部で $2\\times2\\times2=8$ 通り）。' + figCoins().html + '「少なくとも〜」は、1 − 反対。',
  k: '確率は、「国語のテスト」。キーワードで見分ける。<br>🟢 <b>C（組合せ）</b>：「同時に」「選ぶだけ」「図形を作る」→ 順番を気にしない。<br>🔴 <b>P（順列）</b>：「1個ずつ順番に」「整数を作る」「役職がちがう」→ 順番に意味がある。<br>🚫 <b>表・樹形図</b>：「大小2つのさいころ」「硬貨3枚」。',
  cc: '<b>Cの計算ルール</b>：分母は割り算あり。<br>${}_5\\mathrm{C}_2=\\dfrac{5\\times4}{2\\times1}=10$（2個選ぶ）<br>${}_5\\mathrm{C}_3=\\dfrac{5\\times4\\times3}{3\\times2\\times1}=10$（3個選ぶ）<br>分子は $n$ から下へ $r$ 個、分母は $r$ から 1 まで。',
  p: '<b>Pの計算ルール</b>：かけ算だけ。割り算はしない！<br>${}_5\\mathrm{P}_2=5\\times4=20$（2個選ぶ）<br>${}_5\\mathrm{P}_3=5\\times4\\times3=60$（3個選ぶ）<br>2桁の整数は、十の位 × 一の位。0 は、十の位に置けない。',
  b: '<b>魔法の合言葉</b>：「確率は、全部に背番号（名前）をつけろ！」<br>赤玉3個、白玉2個 → <b>赤①、赤②、赤③、白①、白②</b>と区別する。<br>公式を使う大前提は、「すべて違うものとして計算する」こと。',
  s: '【4つの日本語ルール】<br>① 「サイコロ2個」は表をかく。<br>② 「同時に」「選ぶだけ」は、分数の C。<br>③ 「順番に」「並べる」「役職」は、かけ算の P。<br>④ 玉やカードには、すべて背番号を振る。<br>この4つで、入試の確率の8割は解ける。'
};
const ABOUT = {
  hyo: [{ p: '<b>公式を使わない問題</b>を、先に見分ける。' }, { p: RT([['大小のさいころ', '→', '6×6の表'], ['硬貨3枚', '→', '樹形図（8通り）'], ['少なくとも', '→', '1 − 反対']]) }, { cap: '表と樹形図が、いちばんミスが少ない。' }],
  cp: [{ p: '<b>C</b>か<b>P</b>かは、日本語で見分ける。' }, { p: RT([['同時に・選ぶだけ', '→', 'C（わり算あり）'], ['順番に・並べる・役職', '→', 'P（かけ算だけ）'], ['大小のさいころ', '→', '表']]) }, { cap: 'キーワードを探すだけで、迷わない。' }],
  sh: [{ p: '<b>背番号</b>をつけて、入試問題を解く。' }, { p: RT([['背番号', '→', '全部、区別する'], ['分母・分子', '→', '同じ数え方で'], ['最後は', '→', '約分']]) }, { cap: '日本語のルールだけで、解ける。' }]
};
const PARTS = [
  { id: 'hyo', title: '公式を使わない問題', sub: '表・樹形図', about: ABOUT.hyo, aboutTitle: 'まず見てみよう：表と樹形図', aboutSub: '大小のさいころは表、硬貨は樹形図',
    steps: [{ id: 'hyo-1', title: '大小2つのさいころ', sub: '6×6の表', intro: I.d, qs: sDice() }, { id: 'hyo-2', title: '硬貨3枚（樹形図）', sub: '8通り・少なくとも', intro: I.c, qs: sCoin() }] },
  { id: 'cp', title: 'C と P', sub: '見分け方と計算', about: ABOUT.cp, aboutTitle: 'まず見てみよう：C と P', aboutSub: '日本語で見分ける',
    steps: [{ id: 'cp-1', title: 'C か P か見分ける', sub: 'キーワード', intro: I.k, qs: sKeyword() }, { id: 'cp-2', title: 'C の計算', sub: '選ぶだけ', intro: I.cc, qs: sC() }, { id: 'cp-3', title: 'P の計算', sub: '並べる・役職', intro: I.p, qs: sP() }] },
  { id: 'sh', title: '入試問題で練習', sub: '背番号・総合', about: ABOUT.sh, aboutTitle: 'まず見てみよう：背番号', aboutSub: '魔法の合言葉',
    steps: [{ id: 'sh-1', title: '背番号をつける', sub: '同じ色の玉', intro: I.b, qs: sBan() }, { id: 'sh-2', title: '入試レベルの総合', sub: '例題', intro: I.s, qs: sSogo() }] }
];
const RBM = { '樹形図': 'じゅけいず', '確率': 'かくりつ', '背番号': 'せばんごう', '偶数': 'ぐうすう', '奇数': 'きすう', '整数': 'せいすう', '組合せ': 'くみあわせ', '順列': 'じゅんれつ', '委員長': 'いいんちょう', '副委員長': 'ふくいいんちょう', '役職': 'やくしょく', '三角形': 'さんかくけい', '円周': 'えんしゅう', '倍数': 'ばいすう', '約分': 'やくぶん', '硬貨': 'こうか' };
const RBR = new RegExp(Object.keys(RBM).sort((a, b) => b.length - a.length).join('|'), 'g');
const RB = s => s.replace(RBR, w => '<ruby>' + w + '<rt>' + RBM[w] + '</rt></ruby>');
const ruby = o => typeof o === 'string' ? o.split(/(<svg[\s\S]*?<\/svg>)/).map((t, k) => k % 2 ? t : RB(t)).join('')
  : Array.isArray(o) ? o.map(ruby) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (k === 'expr' || k === 'id' || k === 'html') ? v : ruby(v)])) : o;
const out = '// 自動生成（node genP.js）。手で直すときは genP.js を直す。\nconst PARTS = ' + JSON.stringify(ruby(PARTS)) + ';\nif (typeof module !== \'undefined\') module.exports = PARTS;\n';
fs.writeFileSync(path.join(__dirname, 'src/data.js'), out);
let n = 0; PARTS.forEach(P => P.steps.forEach(s => { n += s.qs.length; }));
console.log('src/data.js を作成：' + n + '問、' + (out.length / 1024).toFixed(0) + 'KB');
