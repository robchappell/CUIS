(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CDViz = factory();
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this, function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg", doc;
  var SVG = { svg: 1, rect: 1, path: 1, circle: 1, line: 1, text: 1, title: 1, desc: 1, defs: 1, clipPath: 1, g: 1 };

  function getDoc() {
    return doc || (doc = (typeof document !== "undefined") ? document : (typeof window !== "undefined" && window.document));
  }

  function el(p, tag, cls, a) {
    var n = SVG[tag] ? getDoc().createElementNS(NS, tag) : getDoc().createElement(tag);
    if (cls) n.setAttribute("class", cls);
    if (a) { for (var k in a) { if (a[k] != null) n.setAttribute(k, a[k]); } }
    if (p) p.appendChild(n);
    return n;
  }

  function txt(p, tag, str, cls, a) {
    var n = el(p, tag, cls, a);
    if (str != null) n.textContent = "" + str;
    if (tag === "text" && cls) {
      if (/axis-title|donut-center|gauge-/.test(cls)) {
        if (!n.getAttribute("text-anchor")) n.setAttribute("text-anchor", "middle");
        if (!n.getAttribute("dominant-baseline")) n.setAttribute("dominant-baseline", "central");
      } else if (/label|value|legend-text/.test(cls)) {
        if (!n.getAttribute("dominant-baseline")) n.setAttribute("dominant-baseline", "central");
      }
    }
    return n;
  }

  function s(idx) { return "" + ((Math.abs(idx || 0) % 5) + 1); }

  function mark(p, tag, cls, sIdx, al, a) {
    a = a || {};
    a["data-series"] = s(sIdx);
    a.tabindex = "0";
    a.role = "graphics-symbol";
    a["aria-label"] = al;
    var n = el(p, tag, cls, a);
    if (al) txt(n, "title", al);
    return n;
  }

  function table(p, title, hdrs, rows) {
    var tbl = el(el(p, "div", "cdviz-table-wrapper"), "table", "cdviz-table");
    txt(tbl, "caption", title);
    var htr = el(el(tbl, "thead"), "tr");
    hdrs.forEach(function (h, i) { txt(htr, "th", h, i ? "cdviz-num" : 0); });
    var tb = el(tbl, "tbody");
    rows.forEach(function (r) {
      var tr = el(tb, "tr");
      r.forEach(function (c, i) {
        txt(tr, i ? "td" : "th", "" + c, i ? "cdviz-num" : 0, i ? 0 : { scope: "row" });
      });
    });
  }

  function fig(cls, svg, title, hdrs, rows) {
    var root = el(null, "figure", "cdviz-root " + cls, { role: "region", "aria-label": title });
    root.appendChild(svg);
    table(root, title, hdrs, rows);
    return root;
  }

  function num(v) { return +v || 0; }
  function fmt(n) { return (n % 1 === 0) ? "" + n : (+n).toFixed(1); }

  function initSvg(spec, defW, defH) {
    var w = spec.width || defW, h = spec.height || defH;
    var svg = el(null, "svg", "cdviz-svg", { viewBox: "0 0 " + w + " " + h, role: "img" });
    var id = "cdv-" + Math.random().toString(36).slice(2, 8);
    svg.setAttribute("aria-labelledby", id);
    txt(svg, "title", spec.title || "", null, { id: id });
    if (spec.description) txt(svg, "desc", spec.description);
    return { svg: svg, w: w, h: h };
  }

  function yAxis(svg, pL, pT, pW, pH, max, min) {
    min = min || 0;
    var rng = max - min || 1;
    for (var k = 0; k <= 4; k++) {
      var gy = pT + pH - (k / 4) * pH;
      el(svg, "line", "cdviz-grid-line", { x1: pL, y1: gy, x2: pL + pW, y2: gy });
      txt(svg, "text", fmt(min + (rng / 4) * k), "cdviz-value", { x: pL - 8, y: gy, "text-anchor": "end" });
    }
    el(svg, "line", "cdviz-axis-line", { x1: pL, y1: pT + pH, x2: pL + pW, y2: pT + pH });
  }

  function empty(spec) {
    var t = (spec && spec.title) || "Chart";
    var root = el(null, "div", "cdviz-root cdviz-empty", { role: "region", "aria-label": t });
    txt(root, "p", (spec && spec.emptyMessage) || "No data available", "cdviz-empty-message");
    table(root, t, ["Category", "Value"], []);
    return root;
  }

  function bars(spec, mode) {
    var isVert = mode === "v" || (mode === "g" && spec.orientation !== "horizontal");
    var isStacked = mode === "s", d = spec.data, ser = spec.series || [];
    var max = 0, tot = 0, kCount = 1;
    var rows = d.map(function (it) {
      var v = (mode === "h" || mode === "v") ? [num(it.value)] : (it.values || [num(it.value)]);
      if (v.length > kCount) kCount = v.length;
      var rTot = v.reduce(function (a, b) { return a + num(b); }, 0);
      var rMax = isStacked ? rTot : Math.max.apply(null, v);
      if (rMax > max) max = rMax;
      tot += rTot;
      return { l: it.label, v: v, tot: rTot };
    });
    if (spec.shareOf === "total" && tot > 0) max = tot;
    if (max <= 0) max = 1;

    var w = spec.width || (isVert ? 500 : 480);
    var h = spec.height || (isVert ? 270 : (20 + d.length * (isStacked || mode === "h" ? 34 : 14 + kCount * 18)));
    var S = initSvg(spec, w, h), svg = S.svg;
    var hdrs = ["Category"], tRows = [];
    for (var si = 0; si < kCount; si++) hdrs.push(ser[si] || (kCount === 1 ? "Value" : "Series " + (si + 1)));
    if (isStacked) hdrs.push("Total");

    if (isVert) {
      var pL = 50, pR = 20, pT = 26, pB = 44, pW = w - pL - pR, pH = h - pT - pB;
      yAxis(svg, pL, pT, pW, pH, max);
      var gW = pW / d.length, sW = Math.min(36, (gW * 0.75) / kCount);
      rows.forEach(function (r, gi) {
        var gx = pL + gi * gW + (gW - sW * kCount) / 2, tRow = [r.l];
        r.v.forEach(function (val, vi) {
          var n = num(val), bH = (n / max) * pH, bx = gx + vi * sW;
          var al = r.l + (kCount > 1 ? " (" + (ser[vi] || "Series " + (vi + 1)) + "): " : ": ") + fmt(n);
          mark(svg, "rect", "cdviz-bar", vi, al, { x: bx, y: pT + pH - bH, width: sW - (kCount > 1 ? 2 : 0), height: bH, rx: 2 });
          tRow.push(fmt(n));
        });
        txt(svg, "text", r.l, "cdviz-label", { x: pL + (gi + 0.5) * gW, y: pT + pH + 16, "text-anchor": "middle" });
        tRows.push(tRow);
      });
      if (spec.xAxisLabel) txt(svg, "text", spec.xAxisLabel, "cdviz-axis-title", { x: pL + pW / 2, y: h - 6 });
      if (spec.yAxisLabel) txt(svg, "text", spec.yAxisLabel, "cdviz-axis-title", { x: pL, y: 12, "text-anchor": "start" });
    } else {
      var isSH = isStacked || mode === "h", lW = 100, cW = w - lW - (isSH ? 72 : 60), rH = isSH ? 34 : 14 + kCount * 18;
      rows.forEach(function (r, gi) {
        var gy = 16 + gi * rH, cy = isSH ? gy + 17 : gy + (kCount * 18) / 2;
        txt(svg, "text", r.l, "cdviz-label", { x: lW - 8, y: cy, "text-anchor": "end" });
        var curX = lW, tRow = [r.l];
        r.v.forEach(function (val, vi) {
          var n = num(val), bW = (n / max) * cW, by = isSH ? cy - 10 : gy + vi * 18, bx = isStacked ? curX : lW;
          if (bW > 0 || !isStacked) {
            var al = r.l + (kCount > 1 || isStacked ? " (" + (ser[vi] || "Series " + (vi + 1)) + "): " : ": ") + fmt(n);
            mark(svg, "rect", "cdviz-bar", vi, al, { x: bx, y: by, width: bW, height: isSH ? 20 : 14, rx: 2 });
            curX += bW;
          }
          if (!isStacked && kCount > 1) txt(svg, "text", fmt(n), "cdviz-value", { x: lW + bW + 6, y: by + 7 });
          tRow.push(fmt(n));
        });
        if (isSH) {
          txt(svg, "text", fmt(r.tot), "cdviz-value", { x: curX + 8, y: cy });
          if (isStacked) tRow.push(fmt(r.tot));
        }
        tRows.push(tRow);
      });
    }
    return fig("cdviz-" + ({ h: "horizontal-bar", s: "stacked-bar", v: "vertical-bar", g: "grouped-bar" }[mode]), svg, spec.title, hdrs, tRows);
  }

  function arcChart(spec, isDonut) {
    var d = spec.data, S = initSvg(spec, 360, 260), svg = S.svg, w = S.w, h = S.h;
    var cx = w / 2, cy = h / 2, R = Math.min(cx, cy) - 24, r = isDonut ? (R * 0.62) : 0;
    var tot = d.reduce(function (a, b) { return a + num(b.value); }, 0);
    var cur = -Math.PI / 2, tRows = [];
    d.forEach(function (item, idx) {
      var val = num(item.value), frac = tot > 0 ? (val / tot) : 0, ang = frac * 2 * Math.PI;
      var a0 = cur, a1 = cur + ang; cur = a1;
      var large = ang > Math.PI ? 1 : 0;
      var cos0 = Math.cos(a0), sin0 = Math.sin(a0), cos1 = Math.cos(a1), sin1 = Math.sin(a1);
      var pathD = "M " + (isDonut ? (cx + R * cos0) : cx) + " " + (isDonut ? (cy + R * sin0) : cy) +
        (isDonut ? "" : " L " + (cx + R * cos0) + " " + (cy + R * sin0)) +
        " A " + R + " " + R + " 0 " + large + " 1 " + (cx + R * cos1) + " " + (cy + R * sin1) +
        (isDonut ? " L " + (cx + r * cos1) + " " + (cy + r * sin1) + " A " + r + " " + r + " 0 " + large + " 0 " + (cx + r * cos0) + " " + (cy + r * sin0) : "") + " Z";
      var pctStr = (frac * 100).toFixed(1) + "%";
      mark(svg, "path", "cdviz-slice", idx, item.label + ": " + fmt(val) + " (" + pctStr + ")", { d: pathD });
      tRows.push([item.label, fmt(val), pctStr]);
    });
    if (isDonut) {
      txt(svg, "text", fmt(tot), "cdviz-donut-center-total", { x: cx, y: cy - 4 });
      txt(svg, "text", "TOTAL", "cdviz-donut-center-label", { x: cx, y: cy + 18 });
    }
    return fig("cdviz-" + (isDonut ? "donut" : "pie"), svg, spec.title, ["Category", "Value", "Share"], tRows);
  }

  function line(spec) {
    var d = spec.data, S = initSvg(spec, 480, 240), svg = S.svg, w = S.w, h = S.h;
    var pL = 50, pR = 24, pT = 24, pB = 34, pW = w - pL - pR, pH = h - pT - pB;
    var vals = d.map(function (it) { return num(it.value); });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min = 0; if (max === 0) max = 1; }
    yAxis(svg, pL, pT, pW, pH, max, min);
    var pts = [], tRows = [], rng = max - min;
    d.forEach(function (item, i) {
      var v = num(item.value);
      var x = d.length === 1 ? pL + pW / 2 : pL + (i / (d.length - 1)) * pW;
      var y = pT + pH - ((v - min) / rng) * pH;
      pts.push(x + "," + y);
      mark(svg, "circle", "cdviz-point", 0, item.label + ": " + fmt(v), { cx: x, cy: y, r: 4 });
      txt(svg, "text", item.label, "cdviz-label", { x: x, y: pT + pH + 16, "text-anchor": "middle" });
      tRows.push([item.label, fmt(v)]);
    });
    if (pts.length > 1) {
      var p = el(null, "path", "cdviz-line", { d: "M " + pts.join(" L "), "data-series": "1" });
      svg.insertBefore(p, svg.querySelector(".cdviz-point"));
    }
    return fig("cdviz-line-chart", svg, spec.title, ["Milestone", "Value"], tRows);
  }

  function partToWhole(spec, isGauge) {
    var it = spec.data[0] || {}, val = num(it.value != null ? it.value : spec.value), max = num(spec.max || it.max || 100);
    if (max <= 0) max = 100;
    var frac = Math.min(1, Math.max(0, val / max)), pct = (frac * 100).toFixed(1) + "%";
    var al = (it.label || spec.title) + ": " + fmt(val) + " / " + fmt(max) + " (" + pct + ")";
    var S = initSvg(spec, isGauge ? 320 : 440, isGauge ? 180 : 80), svg = S.svg, w = S.w;
    if (isGauge) {
      var cx = w / 2, cy = 135, R = 90, sW = 16;
      el(svg, "path", "cdviz-gauge-track", { d: "M " + (cx - R) + " " + cy + " A " + R + " " + R + " 0 0 1 " + (cx + R) + " " + cy, "stroke-width": sW });
      if (frac > 0) {
        var vx = cx - R * Math.cos(frac * Math.PI), vy = cy - R * Math.sin(frac * Math.PI);
        var p = mark(svg, "path", "cdviz-gauge-bar", 0, al, { d: "M " + (cx - R) + " " + cy + " A " + R + " " + R + " 0 0 1 " + vx + " " + vy, "stroke-width": sW });
        p.setAttribute("fill", "none");
      }
      txt(svg, "text", pct, "cdviz-gauge-value", { x: cx, y: cy - 16 });
      txt(svg, "text", (it.label || spec.title) + " (" + fmt(val) + "/" + fmt(max) + ")", "cdviz-gauge-label", { x: cx, y: cy + 4 });
    } else {
      var x = 20, y = 30, bW = w - 40, bH = 22;
      el(svg, "rect", "cdviz-meter-track", { x: x, y: y, width: bW, height: bH, rx: 4 });
      mark(svg, "rect", "cdviz-meter-bar", 0, al, { x: x, y: y, width: Math.max(0, bW * frac), height: bH, rx: 4 });
      txt(svg, "text", it.label || spec.title, "cdviz-label", { x: x, y: y - 10 });
      txt(svg, "text", fmt(val) + " / " + fmt(max) + " (" + pct + ")", "cdviz-value", { x: x + bW, y: y - 10, "text-anchor": "end" });
    }
    return fig("cdviz-" + (isGauge ? "gauge" : "meter"), svg, spec.title, ["Metric", "Value", "Max", "Share"], [[it.label || "Value", fmt(val), fmt(max), pct]]);
  }

  function bullet(spec) {
    var isVert = spec.orientation === "vertical", d = spec.data;
    var S = initSvg(spec, isVert ? (60 + d.length * 80) : 480, isVert ? 280 : (20 + d.length * 60)), svg = S.svg, w = S.w, h = S.h;
    var tRows = [];
    function bBox(c, a, cd, ad, rx) {
      return isVert ? { x: c, y: a, width: cd, height: ad, rx: rx } : { x: a, y: c, width: ad, height: cd, rx: rx };
    }
    d.forEach(function (it, idx) {
      var v = num(it.value), tgt = num(it.target != null ? it.target : spec.target);
      var max = num(spec.max || (it.ranges || spec.ranges || [100]).slice(-1)[0] || 100);
      if (max <= 0) max = 100;
      var span = isVert ? (h - 60) : (w - 160), base = isVert ? (h - 36) : 100;
      var gW = (w - 40) / d.length;
      var cross = isVert ? (20 + idx * gW + (gW - 30) / 2) : (18 + idx * 58), cDim = isVert ? 30 : 24;
      el(svg, "rect", "cdviz-bullet-track", bBox(cross, isVert ? (base - span) : base, cDim, span, 2));

      var vPx = Math.min(span, (v / max) * span);
      mark(svg, "rect", "cdviz-bullet-bar", 0, it.label + ": " + fmt(v) + " (Target: " + fmt(tgt) + ")", bBox(cross + (isVert ? 7 : 5), isVert ? (base - vPx) : base, isVert ? 16 : 14, vPx, 1));

      if (tgt > 0) {
        var tPx = Math.min(span, (tgt / max) * span);
        var tLine = isVert ? { x1: cross - 4, y1: base - tPx, x2: cross + cDim + 4, y2: base - tPx } : { x1: base + tPx, y1: cross - 2, x2: base + tPx, y2: cross + cDim + 2 };
        el(svg, "line", "cdviz-bullet-target", tLine);
      }

      if (isVert) {
        txt(svg, "text", it.label, "cdviz-label", { x: cross + 15, y: base + 16, "text-anchor": "middle" });
      } else {
        txt(svg, "text", it.label, "cdviz-label", { x: base - 8, y: cross + 13, "text-anchor": "end" });
        txt(svg, "text", fmt(v), "cdviz-value", { x: base + span + 8, y: cross + 13 });
      }
      tRows.push([it.label, fmt(v), fmt(tgt), v >= tgt ? "On Target" : "Below Target"]);
    });
    return fig("cdviz-bullet", svg, spec.title, ["Category", "Actual", "Target", "Status"], tRows);
  }

  function floating(spec) {
    var d = spec.data, S = initSvg(spec, 480, 20 + d.length * 36), svg = S.svg, w = S.w, h = S.h;
    var lW = 100, pR = 24, cW = w - lW - pR;
    var min = Infinity, max = -Infinity;
    d.forEach(function (it) {
      var s = num(it.start), e = num(it.end != null ? it.end : it.value);
      if (s < min) min = s; if (e > max) max = e;
    });
    if (min === Infinity) { min = 0; max = 100; }
    var span = max - min || 1;
    for (var k = 0; k <= 4; k++) {
      var gx = lW + (k / 4) * cW;
      el(svg, "line", "cdviz-grid-line", { x1: gx, y1: 10, x2: gx, y2: h - 18 });
      txt(svg, "text", fmt(min + (k / 4) * span), "cdviz-value", { x: gx, y: h - 8, "text-anchor": "middle" });
    }
    var tRows = [];
    d.forEach(function (it, idx) {
      var s = num(it.start), e = num(it.end != null ? it.end : it.value);
      var bx = lW + ((s - min) / span) * cW, bW = Math.max(2, ((e - s) / span) * cW), by = 16 + idx * 34;
      txt(svg, "text", it.label, "cdviz-label", { x: lW - 8, y: by + 10, "text-anchor": "end" });
      mark(svg, "rect", "cdviz-floating-bar", 0, it.label + ": " + fmt(s) + " - " + fmt(e), { x: bx, y: by, width: bW, height: 20, rx: 3 });
      tRows.push([it.label, fmt(s), fmt(e), fmt(e - s)]);
    });
    return fig("cdviz-floating-bar", svg, spec.title, ["Item", "Start", "End", "Duration"], tRows);
  }

  function area(spec) {
    var isSpark = spec.chart === "sparkline", isStacked = spec.chart === "stacked-area";
    var d = spec.data, S = initSvg(spec, isSpark ? 160 : 480, isSpark ? 44 : 240), svg = S.svg, w = S.w, h = S.h;
    var pL = isSpark ? 2 : 50, pR = isSpark ? 2 : 24, pT = isSpark ? 4 : 24, pB = isSpark ? 4 : 34;
    var pW = w - pL - pR, pH = h - pT - pB, base = pT + pH;
    var ser = isStacked ? (spec.series || ["Series 1"]) : ["Series 1"], unit = spec.unit ? " " + spec.unit : "";
    var max = 0, n = d.length;
    function xAt(i) { return n <= 1 ? pL + pW / 2 : pL + (i / (n - 1)) * pW; }

    d.forEach(function (it) {
      var rowTot = isStacked ? (it.values || []).reduce(function (a, b) { return a + num(b); }, 0) : num(it.value);
      if (rowTot > max) max = rowTot;
    });
    if (max <= 0) max = 100;
    if (!isSpark) yAxis(svg, pL, pT, pW, pH, max, 0);

    var tRows = [];
    if (isStacked) {
      var cArr = ser.map(function () { return []; });
      d.forEach(function (it, i) {
        var cur = 0, r = [it.label];
        (it.values || []).forEach(function (val, si) {
          var top = cur + num(val);
          cArr[si][i] = { b: cur, t: top };
          cur = top;
          r.push(fmt(val) + unit);
        });
        r.push(fmt(cur) + unit);
        tRows.push(r);
      });

      ser.forEach(function (sName, si) {
        var tp = [], bp = [];
        d.forEach(function (it, i) {
          var c = cArr[si][i] || { b: 0, t: 0 }, x = xAt(i);
          tp.push(x + "," + (base - (c.t / max) * pH));
          bp.unshift(x + "," + (base - (c.b / max) * pH));
        });
        var sIdx = si % 5;
        mark(svg, "path", "cdviz-area", sIdx, sName, { d: "M " + tp.join(" L ") + " L " + bp.join(" L ") + " Z", "data-series": sIdx + 1 });
        el(svg, "path", "cdviz-area-line", { d: "M " + tp.join(" L "), "data-series": sIdx + 1 });
      });
      d.forEach(function (it, i) { txt(svg, "text", it.label, "cdviz-label", { x: xAt(i), y: base + 16, "text-anchor": "middle" }); });
      return fig("cdviz-stacked-area", svg, spec.title, ["Milestone"].concat(ser, "Total"), tRows);
    }

    var pts = [];
    d.forEach(function (it, i) {
      var v = num(it.value), x = xAt(i), y = base - (v / max) * pH;
      pts.push(x + "," + y);
      if (!isSpark) {
        mark(svg, "circle", "cdviz-point", 0, it.label + ": " + fmt(v) + unit, { cx: x, cy: y, r: 4 });
        txt(svg, "text", it.label, "cdviz-label", { x: x, y: base + 16, "text-anchor": "middle" });
      }
      tRows.push([it.label, fmt(v) + unit]);
    });

    if (pts.length) {
      var sX = pts[0].split(",")[0], eX = pts[pts.length - 1].split(",")[0];
      el(svg, "path", isSpark ? "cdviz-sparkline-area cdviz-area" : "cdviz-area", { d: "M " + sX + "," + base + " L " + pts.join(" L ") + " L " + eX + "," + base + " Z", "data-series": "1" });
      el(svg, "path", isSpark ? "cdviz-sparkline-line cdviz-area-line" : "cdviz-area-line", { d: "M " + pts.join(" L "), "data-series": "1" });
    }

    if (isSpark && d.length) {
      var last = d[d.length - 1], lp = pts[pts.length - 1].split(",");
      mark(svg, "circle", "cdviz-point cdviz-sparkline-endpoint", 0, "Latest: " + fmt(num(last.value)) + unit + " (" + last.label + ")", { cx: lp[0], cy: lp[1], r: 3.5, "data-series": "1" });
    }

    return fig(isSpark ? "cdviz-sparkline" : "cdviz-area", svg, spec.title, [isSpark ? "Period" : "Milestone", "Value"], tRows);
  }

  function scatter(spec) {
    var d = spec.data, S = initSvg(spec, 480, 260), svg = S.svg, w = S.w, h = S.h;
    var pL = spec.yAxisLabel ? 76 : 54, pR = 24, pT = 24, pB = 40, pW = w - pL - pR, pH = h - pT - pB;
    var xs = d.map(function (it) { return num(it.x); }), ys = d.map(function (it) { return num(it.y); });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    if (xMin === xMax) { xMin = 0; if (xMax === 0) xMax = 100; }
    if (yMin === yMax) { yMin = 0; if (yMax === 0) yMax = 100; }
    yAxis(svg, pL, pT, pW, pH, yMax, yMin);

    for (var k = 0; k <= 3; k++) {
      var gx = pL + (k / 3) * pW, xVal = xMin + (k / 3) * (xMax - xMin);
      el(svg, "line", "cdviz-grid-line", { x1: gx, y1: pT, x2: gx, y2: pT + pH });
      txt(svg, "text", fmt(xVal), "cdviz-value", { x: gx, y: pT + pH + 16, "text-anchor": "middle" });
    }

    if (spec.xAxisLabel) txt(svg, "text", spec.xAxisLabel, "cdviz-axis-title", { x: pL + pW / 2, y: pT + pH + 34, "text-anchor": "middle" });
    if (spec.yAxisLabel) txt(svg, "text", spec.yAxisLabel, "cdviz-axis-title", { x: -(pT + pH / 2), y: 16, transform: "rotate(-90)", "text-anchor": "middle" });

    var tRows = d.map(function (it, idx) {
      var xv = num(it.x), yv = num(it.y);
      var cx = pL + ((xv - xMin) / (xMax - xMin)) * pW;
      var cy = pT + pH - ((yv - yMin) / (yMax - yMin)) * pH;
      var sIdx = idx % 5;
      mark(svg, "circle", "cdviz-scatter-point", sIdx, it.label + ": (" + fmt(xv) + ", " + fmt(yv) + ")", { cx: cx, cy: cy, r: 5, "data-series": sIdx + 1 });
      return [it.label, fmt(xv), fmt(yv)];
    });

    return fig("cdviz-scatter", svg, spec.title, ["Item", spec.xAxisLabel || "X", spec.yAxisLabel || "Y"], tRows);
  }

  function propMeter(spec) {
    var d = spec.data, w = spec.width || 460, rows = Math.ceil(d.length / 3), h = spec.height || (60 + rows * 22);
    var S = initSvg(spec, w, h), svg = S.svg, unit = spec.unit ? " " + spec.unit : "";
    var sum = d.reduce(function (a, b) { return a + num(b.value); }, 0), tot = num(spec.total || sum) || 100;
    var mx = 20, my = 30, bW = w - 40, bH = 22, r = 5;

    var cId = "cdv-c-" + Math.random().toString(36).slice(2, 8);
    var defs = el(svg, "defs");
    var cp = el(defs, "clipPath", null, { id: cId });
    el(cp, "rect", null, { x: mx, y: my, width: bW, height: bH, rx: r });

    el(svg, "rect", "cdviz-meter-track", { x: mx, y: my, width: bW, height: bH, rx: r });
    var segG = el(svg, "g", null, { "clip-path": "url(#" + cId + ")" });

    txt(svg, "text", spec.title, "cdviz-label", { x: mx, y: my - 10 });
    txt(svg, "text", "Total: " + fmt(tot) + unit, "cdviz-value", { x: mx + bW, y: my - 10, "text-anchor": "end" });

    var curX = mx, tRows = [];
    d.forEach(function (it, idx) {
      var v = num(it.value), frac = v / tot, sW = frac * bW;
      var pct = (frac * 100).toFixed(1) + "%", sIdx = idx % 5;
      var al = it.label + ": " + fmt(v) + unit + " (" + pct + ")";
      mark(segG, "rect", "cdviz-meter-segment", sIdx, al, { x: curX, y: my, width: Math.max(0, sW), height: bH, "data-series": sIdx + 1 });
      curX += sW;

      var col = idx % 3, row = Math.floor(idx / 3);
      var lx = mx + col * (bW / 3), ly = my + bH + 20 + row * 18;
      el(svg, "circle", "cdviz-legend-dot", { cx: lx + 4, cy: ly - 4, r: 4, "data-series": sIdx + 1 });
      txt(svg, "text", it.label + " " + fmt(v) + unit, "cdviz-legend-text", { x: lx + 12, y: ly });

      tRows.push([it.label, fmt(v) + unit, pct]);
    });

    return fig("cdviz-proportional-meter", svg, spec.title, ["Category", "Allocation", "Share"], tRows);
  }

  function norm(s) {
    if (!s || typeof s !== "object") return;
    if ((!s.data || !Array.isArray(s.data) || !s.data.length) && (s.categories || s.milestones) && Array.isArray(s.series)) {
      var c = s.categories || s.milestones, sr = s.series;
      s.series = sr.map(function (x, i) { return typeof x === "string" ? x : (x && x.name) || ("Series " + (i + 1)); });
      s.data = c.map(function (l, i) {
        return { label: l, values: sr.map(function (x) { return num(x && x.values ? x.values[i] : 0); }) };
      });
    }
  }

  function render(spec, container) {
    norm(spec);
    if (!spec || !spec.data || !Array.isArray(spec.data) || !spec.data.length) {
      var e = empty(spec);
      if (container) append(container, e);
      return e;
    }
    var m = spec.chart, root =
      (m === "donut" || m === "pie") ? arcChart(spec, m === "donut") :
      (m === "meter" || m === "gauge") ? partToWhole(spec, m === "gauge") :
      m === "proportional-meter" ? propMeter(spec) :
      m === "line" ? line(spec) :
      (m === "area" || m === "stacked-area" || m === "sparkline") ? area(spec) :
      m === "scatter" ? scatter(spec) :
      m === "bullet" ? bullet(spec) :
      m === "floating-bar" ? floating(spec) :
      bars(spec, m === "stacked-bar" ? "s" : m === "vertical-bar" ? "v" : m === "grouped-bar" ? "g" : "h");
    if (container) append(container, root);
    return root;
  }

  function append(c, el) {
    var target = (typeof c === "string") ? getDoc().getElementById(c) : c;
    if (target && target.appendChild) target.appendChild(el);
  }

  return { render: render };
});
