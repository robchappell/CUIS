(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CDiag = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg", doc;
  var SVG = { svg: 1, rect: 1, path: 1, circle: 1, line: 1, text: 1, title: 1, desc: 1, defs: 1, marker: 1, g: 1 };
  function getDoc() {
    return doc || (doc = (typeof document !== "undefined") ? document : (typeof window !== "undefined" && window.document));
  }
  function el(p, tag, cls, a) {
    var n = SVG[tag] ? getDoc().createElementNS(NS, tag) : getDoc().createElement(tag);
    if (cls) n.setAttribute("class", cls);
    if (a) {
      for (var k in a) {
        if (a.hasOwnProperty(k) && a[k] != null) n.setAttribute(k, a[k]);
      }
    }
    if (p && p.appendChild) p.appendChild(n);
    return n;
  }
  function txt(p, tag, text, cls, a) {
    var n = el(p, tag, cls, a);
    n.textContent = text;
    if (tag === "text" && cls) {
      if (/node-.*text|edge-label|header-text|msg-label|phase-label/.test(cls)) {
        n.setAttribute("text-anchor", "middle");
        n.setAttribute("dominant-baseline", "central");
      } else if (/attr-text/.test(cls)) {
        n.setAttribute("dominant-baseline", "central");
      }
    }
    return n;
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function trunc(s, n) { return (!s || s.length <= n) ? s : (s.slice(0, Math.max(1, n - 1)) + "…"); }
  function initSvg(spec, defW, defH) {
    var w = num(spec.width) || defW, h = num(spec.height) || defH;
    var svg = el(null, "svg", null, { viewBox: "0 0 " + w + " " + h, role: "img", "aria-label": spec.title || "Diagram" });
    if (spec.title) txt(svg, "title", spec.title);
    if (spec.description) txt(svg, "desc", spec.description);
    var defs = el(svg, "defs");
    var m = el(defs, "marker", null, { id: "cdiag-arrow", viewBox: "0 0 10 10", refX: 4, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
    el(m, "path", null, { d: "M 0 1.5 L 8 5 L 0 8.5 z" });
    return { svg: svg, w: w, h: h, defs: defs };
  }
  function fig(cls, svg, title, items) {
    var f = el(null, "figure", "cdiag-root " + cls);
    f.appendChild(svg);
    if (items && items.length) {
      var ol = el(el(f, "nav", "cdiag-sr-only", { "aria-label": (title || "Diagram") + " Outline" }), "ol");
      items.forEach(function (it) {
        txt(ol, "li", typeof it === "string" ? it : (it.label + (it.detail ? ": " + it.detail : "")));
      });
    }
    return f;
  }
  function empty(spec) {
    var d = el(null, "div", "cdiag-root cdiag-empty", { role: "status" });
    d.textContent = (spec && spec.title ? spec.title + ": " : "") + "No diagram data available";
    return d;
  }
  function rectIntersect(b, tx, ty) {
    var dx = tx - b.cx, dy = ty - b.cy;
    if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy };
    var halfW = b.w / 2, halfH = b.h / 2;
    var scale = Math.min(halfW / Math.abs(dx || 0.0001), halfH / Math.abs(dy || 0.0001));
    return { x: b.cx + dx * scale, y: b.cy + dy * scale };
  }
  function addNode(g, x, y, w, h, label, subtext, shape, series, id) {
    var sG = el(g, "g", null, { role: "graphics-symbol", tabindex: "0", "data-node": id || label });
    if (series) sG.setAttribute("data-series", series);
    txt(sG, "title", label + (subtext ? " (" + subtext + ")" : ""));
    var cx = x + w / 2, cy = y + h / 2;
    var tag = "rect", cls = "cdiag-node-rect", a = { x: x, y: y, width: w, height: h, rx: 6 };
    if (shape === "pill") { cls = "cdiag-node-pill"; a.rx = a.ry = Math.round(h / 2); }
    else if (shape === "circle") { tag = "circle"; cls = "cdiag-node-circle" + (w <= 30 ? " cdiag-node-initial" : ""); a = { cx: cx, cy: cy, r: Math.min(w, h) / 2 }; }
    else if (shape === "diamond") { tag = "path"; cls = "cdiag-node-diamond"; a = { d: "M " + cx + " " + y + " L " + (x + w) + " " + cy + " L " + cx + " " + (y + h) + " L " + x + " " + cy + " Z" }; }
    el(sG, tag, "cdiag-node-base", a);
    el(sG, tag, cls, a);
    if (subtext) {
      var maxC = Math.max(3, Math.floor((w - 14) / 7));
      txt(sG, "text", trunc(label, maxC), "cdiag-node-text", { x: cx, y: cy - 8 });
      txt(sG, "text", trunc(subtext, maxC), "cdiag-node-subtext", { x: cx, y: cy + 8 });
    } else if (label) {
      if (shape === "circle" && w <= 30) {
        return { g: sG, x: x, y: y, w: w, h: h, cx: cx, cy: cy };
      }
      var maxW = shape === "diamond" ? Math.round(w * 0.65) : (shape === "pill" ? (w - h - 4) : (shape === "circle" ? Math.round(w * 0.7) : (w - 14)));
      var maxC = Math.max(3, Math.floor(maxW / 7));
      if (label.length > maxC && label.indexOf(" ") > 0) {
        var words = label.split(" "), bDiff = 999, sIdx = 1;
        for (var wi = 1; wi < words.length; wi++) {
          var d = Math.abs(words.slice(0, wi).join(" ").length - words.slice(wi).join(" ").length);
          if (d < bDiff) { bDiff = d; sIdx = wi; }
        }
        txt(sG, "text", trunc(words.slice(0, sIdx).join(" "), maxC), "cdiag-node-text", { x: cx, y: cy - 7 });
        txt(sG, "text", trunc(words.slice(sIdx).join(" "), maxC), "cdiag-node-text", { x: cx, y: cy + 7 });
      } else {
        txt(sG, "text", trunc(label, maxC), "cdiag-node-text", { x: cx, y: cy });
      }
    }
    return { g: sG, x: x, y: y, w: w, h: h, cx: cx, cy: cy };
  }
  function edgeLbl(g, lbl, x, y) {
    if (!lbl) return;
    var lw = Math.max(26, Math.round(lbl.length * 6.5 + 16)), rx = Math.round(x), ry = Math.round(y);
    el(g, "rect", "cdiag-edge-label-bg", { x: Math.round(rx - lw / 2), y: ry - 9, width: lw, height: 18, rx: 9, ry: 9 });
    txt(g, "text", lbl, "cdiag-edge-label", { x: rx, y: ry });
  }
  function addEdge(g, x1, y1, x2, y2, label, style, arrow, curved) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    var ox2 = x2, oy2 = y2;
    if (arrow !== false && len > 10) { x2 -= (dx / len) * 7.5; y2 -= (dy / len) * 7.5; }
    var cls = "cdiag-edge-path" + (style === "dashed" ? " cdiag-edge-dashed" : "");
    var dStr = curved
      ? "M " + x1 + " " + y1 + " C " + (x1 + dx / 2) + " " + y1 + " " + (x1 + dx / 2) + " " + y2 + " " + x2 + " " + y2
      : "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
    var a = { d: dStr };
    if (arrow !== false) a["marker-end"] = "url(#cdiag-arrow)";
    el(g, "path", cls, a);
    if (label) {
      var lbl = len > 30 ? trunc(label, Math.max(3, Math.floor((len - 36) / 6.5))) : label;
      edgeLbl(g, lbl, (x1 + ox2) / 2, (y1 + oy2) / 2);
    }
  }
  function addPathEdge(g, d, label, lx, ly, style) {
    el(g, "path", "cdiag-edge-path" + (style === "dashed" ? " cdiag-edge-dashed" : ""), { d: d, "marker-end": "url(#cdiag-arrow)" });
    edgeLbl(g, label, lx, ly);
  }
  function routeStepEdge(g, s, t, label, style, cy) {
    var isDashed = style === "dashed" || /retry|revise/i.test(label), st = isDashed ? "dashed" : "solid", gap = 7.5;
    if (t.y > s.y + 40) {
      var dir = Math.abs(t.cx - s.cx) <= 24, tx = dir ? s.cx : (t.cx > s.cx ? (t.x - gap) : (t.x + t.w + gap));
      var d = dir ? ("M " + s.cx + " " + (s.y + s.h) + " V " + (t.y - gap)) : ("M " + s.cx + " " + (s.y + s.h) + " V " + t.cy + " H " + tx);
      addPathEdge(g, d, label, s.cx, Math.round((s.y + s.h + (dir ? t.y : t.cy)) / 2), st);
    } else if (s.y > t.y + 40) {
      var sx = s.cx > t.cx ? s.x : (s.x + s.w);
      addPathEdge(g, "M " + sx + " " + s.cy + " H " + t.cx + " V " + (t.y + t.h + gap), label, Math.round((sx + t.cx) / 2), s.cy, st);
    } else if (s.cx > t.cx) {
      var loopY = cy + 72;
      addPathEdge(g, "M " + s.cx + " " + (s.y + s.h) + " V " + loopY + " H " + t.cx + " V " + (t.y + t.h + gap), label, Math.round((s.cx + t.cx) / 2), loopY, st);
    } else {
      addEdge(g, s.x + s.w, s.cy, t.x, t.cy, label, style, true, false);
    }
  }
  function mindmap(spec) {
    var root = spec.root, S = initSvg(spec, 880, 440), svg = S.svg, w = S.w, h = S.h;
    var cx = w / 2, cy = h / 2, outline = [root.label];
    var edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var rootCard = addNode(nodeG, cx - 65, cy - 20, 130, 40, root.label, null, "rect", 4, root.id);
    rootCard.g.setAttribute("class", "cdiag-root-node");
    var branches = root.children || [], n = branches.length;
    branches.forEach(function (b, bi) {
      var isRight = (n === 4) ? (bi === 1 || bi === 3) : ((bi % 2 === 1) || (bi >= Math.ceil(n / 2)));
      var isBottom = (bi === 2 || bi === 3) || (bi >= 2);
      var bW = (b.label.length > 12) ? 120 : 105;
      var bx = isRight ? (cx + 105) : (cx - 105 - bW);
      var by = isBottom ? (cy + 75) : (cy - 75);
      var bSeries = b.series || ((bi % 5) + 1);
    var bNode = addNode(nodeG, bx, by, bW, 36, b.label, null, "rect", bSeries, b.id);
      var rx1 = isRight ? (rootCard.x + rootCard.w) : rootCard.x;
      var bx1 = isRight ? bNode.x : (bNode.x + bNode.w);
      addEdge(edgeG, rx1, rootCard.cy, bx1, bNode.cy, null, "solid", false, true);
      outline.push("  - " + b.label);
    var leaves = b.children || [], numLeaves = leaves.length;
      leaves.forEach(function (lf, li) {
        var lW = 155, lH = 30;
        var lx = isRight ? (bx + bW + 28) : (bx - lW - 28);
        var ly = (by - ((numLeaves - 1) * 34) / 2) + li * 34;
        var leafNode = addNode(nodeG, lx, ly, lW, lH, lf.label, null, "rect", bSeries, lf.id);
        var px = isRight ? (bNode.x + bNode.w) : bNode.x;
        var cx2 = isRight ? leafNode.x : (leafNode.x + lW);
        addEdge(edgeG, px, bNode.cy, cx2, leafNode.cy, null, "solid", false, false);
        outline.push("    * " + lf.label);
      });
    });
    return fig("cdiag-mindmap", svg, spec.title, outline);
  }
  function contextMap(spec) {
    var nodes = spec.nodes || [], edges = spec.edges ? spec.edges.slice() : [];
    var S = initSvg(spec, 860, 480), svg = S.svg, w = S.w, h = S.h;
    var cx = w / 2, cy = h / 2, outline = [];
    var edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var nodeMap = {}, rawC = spec.core || spec.center, coreNode = rawC ? Object.assign({ id: rawC.id || "core", role: "core" }, rawC) : null, satellites = [];
    nodes.forEach(function (nd) {
      if (!coreNode && (nd.role === "core" || nd.id === "core" || nd.id === "center")) coreNode = nd;
      else if (nd !== coreNode) satellites.push(nd);
    });
    if (coreNode) {
      var cLen = (coreNode.label || "").length;
      var cW = num(coreNode.w) || Math.min(260, Math.max(210, cLen * 7 + 36));
      var cH = num(coreNode.h) || 56;
      var cX = num(coreNode.x) || Math.round(cx - cW / 2);
      var cY = num(coreNode.y) || Math.round(cy - cH / 2);
      var sub = coreNode.subtext || coreNode.sub || coreNode.role || "Core Domain";
      var cId = coreNode.id || "core";
      var cCard = addNode(nodeG, cX, cY, cW, cH, coreNode.label, sub, "rect", coreNode.series || 1, cId);
      nodeMap[cId] = nodeMap["core"] = nodeMap["center"] = cCard;
      outline.push(coreNode.label + " [" + sub + "]");
      if (!edges.length) satellites.forEach(function (nd) {
        var p = nd.protocol || nd.relation || "", down = nd.type === "downstream" || nd.role === "downstream";
        edges.push(down ? { source: cId, target: nd.id, label: p } : { source: nd.id, target: cId, label: p });
      });
    }
    var numSat = satellites.length;
    var rx = Math.round((w - 240) / 2), ry = Math.round((h - 130) / 2);
    satellites.forEach(function (nd, i) {
      var angle = -Math.PI / 2 + i * ((2 * Math.PI) / (numSat || 1));
      var sLen = (nd.label || "").length;
      var sW = num(nd.w) || Math.min(195, Math.max(160, sLen * 7 + 24));
      var sH = num(nd.h) || 46;
      var sx = num(nd.x) || Math.round(cx + rx * Math.cos(angle) - sW / 2);
      var sy = num(nd.y) || Math.round(cy + ry * Math.sin(angle) - sH / 2);
      var roleText = nd.role ? nd.role.toUpperCase() : (nd.type ? nd.type.toUpperCase() : "SERVICE");
      nodeMap[nd.id] = addNode(nodeG, sx, sy, sW, sH, nd.label, roleText, "rect", nd.series || ((i % 5) + 1), nd.id);
      outline.push("  - " + nd.label + " (" + roleText + ")");
    });
    edges.forEach(function (ed) {
      var s = nodeMap[ed.source || ed.from], t = nodeMap[ed.target || ed.to];
      if (s && t) {
        var pt1 = rectIntersect(s, t.cx, t.cy);
        var pt2 = rectIntersect(t, s.cx, s.cy);
        addEdge(edgeG, pt1.x, pt1.y, pt2.x, pt2.y, ed.label, ed.style || "solid", true, false);
      }
    });
    return fig("cdiag-context-map", svg, spec.title, outline);
  }
  function treeHorizontal(spec) {
    var root = spec.root, S = initSvg(spec, 860, 400), svg = S.svg, w = S.w, h = S.h;
    var outline = [root.label];
    var edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var rootCard = addNode(nodeG, 30, h / 2 - 21, 175, 42, root.label, null, "rect", 1, root.id);
    var branches = root.children || [], totalLeaves = 0;
    branches.forEach(function (b) { totalLeaves += (b.children || [1]).length; });
    var curLeafIdx = 0;
    branches.forEach(function (b, bi) {
      var leaves = b.children || [];
      var bMid = curLeafIdx + (Math.max(1, leaves.length) - 1) / 2;
      var by = 40 + (bMid / Math.max(1, totalLeaves - 1)) * (h - 80);
      var bCard = addNode(nodeG, 250, by - 18, 165, 36, b.label, null, "rect", b.series || ((bi % 5) + 1), b.id);
      addEdge(edgeG, rootCard.x + rootCard.w, rootCard.cy, bCard.x, bCard.cy, null, "solid", false, true);
      outline.push("  - " + b.label);
    leaves.forEach(function (lf) {
        var ly = 40 + (curLeafIdx / Math.max(1, totalLeaves - 1)) * (h - 80);
        curLeafIdx++;
        var lCard = addNode(nodeG, 470, ly - 17, 210, 34, lf.label, null, "rect", b.series || ((bi % 5) + 1), lf.id);
        addEdge(edgeG, bCard.x + bCard.w, bCard.cy, lCard.x, lCard.cy, null, "solid", false, true);
        outline.push("    * " + lf.label);
      });
    });
    return fig("cdiag-tree-horizontal", svg, spec.title, outline);
  }
  function treeVertical(spec) {
    var root = spec.root, S = initSvg(spec, 860, 420), svg = S.svg, w = S.w, h = S.h;
    var outline = [root.label];
    var edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var rootCard = addNode(nodeG, w / 2 - 90, 20, 180, 40, root.label, null, "rect", 1, root.id);
    var branches = root.children || [], bSpacing = w / (branches.length + 1);
    branches.forEach(function (b, bi) {
      var bx = bSpacing * (bi + 1) - 85, by = 120;
      var bCard = addNode(nodeG, bx, by, 170, 36, b.label, null, "rect", b.series || ((bi % 5) + 1), b.id);
      el(edgeG, "path", "cdiag-edge-path", { d: "M " + rootCard.cx + " " + (rootCard.y + rootCard.h) + " V " + (by - 20) + " H " + bCard.cx + " V " + by });
      outline.push("  - " + b.label);
    var leaves = b.children || [];
      leaves.forEach(function (lf, li) {
        var ly = 200 + li * 50;
        var lCard = addNode(nodeG, bx + 5, ly, 160, 34, lf.label, null, "rect", b.series || ((bi % 5) + 1), lf.id);
        el(edgeG, "path", "cdiag-edge-path", { d: "M " + bCard.cx + " " + (bCard.y + bCard.h) + " V " + (ly + 17) + " H " + lCard.x });
        outline.push("    * " + lf.label);
      });
    });
    return fig("cdiag-tree-vertical", svg, spec.title, outline);
  }
  function flowOrState(spec, isFlow) {
    var nodes = spec.nodes || [], edges = spec.edges || [];
    var outline = [], main = [], branch = [];
    nodes.forEach(function (nd) {
      var r = (nd.role || "").toLowerCase(), id = (nd.id || "").toLowerCase();
      var b = nd.lane === 1 || nd.lane === "bottom" || nd.lane === "branch" || /^(branch|fallback|retry|error|rejected)$/.test(r) || /^(fix|rejected|error)$/.test(id);
      (b ? branch : main).push(nd);
    });
    if (!main.length) { main = nodes.slice(); branch = []; }
    var mIdx = {}, hasBack = false;
    main.forEach(function (n, i) { mIdx[n.id] = i; });
    edges.forEach(function (e) {
      var s = e.source || e.from, t = e.target || e.to;
      if (mIdx[s] != null && mIdx[t] != null && mIdx[s] > mIdx[t]) hasBack = true;
    });
    var nodeMap = {}, mN = main.length;
    function sz(nd, i, isInit) {
      var r = (nd.role || "").toLowerCase(), s = (nd.shape || "").toLowerCase();
      var isDec = /^(decision|condition|gate)$/.test(r) || s === "diamond";
      var isTerm = /^(terminal|end)$/.test(r) || s === "pill" || (isFlow && (/^(start|round)$/.test(r || s) || (mN > 1 && (i === 0 || i === mN - 1) && !nd.role && !nd.shape)));
      var sh = isInit ? "circle" : (isDec ? "diamond" : (isTerm ? "pill" : (nd.shape || "rect")));
      var l = (nd.label || "").length;
      var nw = (typeof nd.w === "number") ? nd.w : (isInit ? 22 : Math.min(145, Math.round(isDec ? Math.max(120, l * 7.5 + 32) : (isTerm ? Math.max(116, l * 7 + 36) : Math.max(120, l * 7 + 22)))));
      var nh = (typeof nd.h === "number") ? nd.h : (isInit ? 22 : (isDec ? 56 : 38));
      var ser = nd.series || (isInit ? 1 : (isDec ? 3 : (isTerm ? (i === 0 ? 1 : 2) : ((i % 5) + 1))));
      return { nd: nd, sh: sh, nw: nw, nh: nh, ser: ser, isInit: isInit };
    }
    var mainSizes = main.map(function (nd, i) {
      var isInit = !isFlow && /^(initial|init)$/.test(nd.role || "");
      return sz(nd, i, isInit);
    });
    var sumNw = 0, labeledGaps = {};
    mainSizes.forEach(function (z) { sumNw += z.nw; });
    edges.forEach(function (e) {
      if (!e.label) return;
      var es = e.source || e.from, et = e.target || e.to;
      for (var i = 0; i < mN - 1; i++) {
        if (main[i].id === es && main[i + 1].id === et) labeledGaps[i] = true;
      }
    });
    var totalWeight = 0;
    for (var gi = 0; gi < mN - 1; gi++) totalWeight += labeledGaps[gi] ? 1.6 : 1.0;
    var baseW = Math.max(spec.width || (isFlow ? 840 : 860), Math.round(sumNw + (totalWeight || 1) * 55 + 80));
    var S = initSvg(spec, baseW, 360), svg = S.svg, w = S.w, h = S.h;
    var edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var cy = (branch.length > 0 || hasBack) ? 110 : Math.round((h - 50) / 2);
    var hasCustomX = main.some(function (nd) { return typeof nd.x === "number"; });
    var baseGap = 40, curX = 25;
    if (!hasCustomX && mN > 1) {
      var sideMargin = Math.max(24, Math.round((w - sumNw) * (isFlow ? 0.1 : 0.08)));
      baseGap = Math.max(30, (w - sideMargin * 2 - sumNw) / (totalWeight || 1));
      curX = Math.max(20, Math.round((w - (sumNw + totalWeight * baseGap)) / 2));
    }
    mainSizes.forEach(function (z, i) {
      var nd = z.nd;
      var nx = (typeof nd.x === "number") ? nd.x : curX;
      var ny = (typeof nd.y === "number") ? nd.y : Math.round(z.isInit ? cy - 11 : cy - z.nh / 2);
      curX += z.nw + Math.round((labeledGaps[i] ? 1.6 : 1.0) * baseGap);
      nodeMap[nd.id] = addNode(nodeG, nx, ny, z.nw, z.nh, nd.label, null, z.sh, z.ser, nd.id);
      outline.push(nd.label + " [" + (nd.role || z.sh) + "]");
    });
    branch.forEach(function (nd, i) {
      var bz = sz(nd, i, false);
      var nx, ny = (typeof nd.y === "number") ? nd.y : (cy + 100);
      if (typeof nd.x === "number") {
        nx = nd.x;
      } else {
        var srcCx = null, rel = [];
        edges.forEach(function (e) {
          var s = e.source || e.from, t = e.target || e.to;
          if (t === nd.id && nodeMap[s]) { srcCx = nodeMap[s].cx; rel.push(nodeMap[s].cx); }
          if (s === nd.id && nodeMap[t]) rel.push(nodeMap[t].cx);
        });
        nx = srcCx != null ? Math.round(srcCx - bz.nw / 2) : (rel.length ? Math.round((rel.reduce(function(a,b){return a+b;},0)/rel.length) - bz.nw/2) : Math.round(35 + (mN > 2 ? 160 * Math.min(i + 1, mN - 2) : 80)));
      }
      nodeMap[nd.id] = addNode(nodeG, nx, ny, bz.nw, bz.nh, nd.label, null, bz.sh, nd.series || 5, nd.id);
      outline.push(nd.label + " [" + (nd.role || "branch") + "]");
    });
    edges.forEach(function (ed) {
      var s = nodeMap[ed.source || ed.from], t = nodeMap[ed.target || ed.to];
      if (s && t) routeStepEdge(edgeG, s, t, ed.label || "", ed.style || "solid", cy);
    });
    return fig(isFlow ? "cdiag-flowchart" : "cdiag-state-machine", svg, spec.title, outline);
  }
  function flowchart(spec) {
    return flowOrState(spec, true);
  }
  function entityRelationship(spec) {
    var nodes = spec.nodes || [], edges = spec.edges || [];
    var S = initSvg(spec, 980, 720), svg = S.svg, w = S.w, h = S.h;
    var cx = w / 2, cy = h / 2 - 10, outline = [];
    var edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var conn = {};
    edges.forEach(function (e) {
      var s = e.source || e.from, t = e.target || e.to;
      conn[s] = (conn[s] || 0) + 1; conn[t] = (conn[t] || 0) + 1;
    });
    var hub = spec.core || spec.center, coreNode = nodes.find(function (nd) {
      var r = (nd.role || "").toLowerCase();
      return r === "core" || r === "center" || nd.center === true || nd.id === (hub && hub.id);
    });
    if (!coreNode && nodes.length > 0) {
      var maxConn = -1;
      nodes.forEach(function (nd) {
        if ((conn[nd.id] || 0) > maxConn) { maxConn = conn[nd.id] || 0; coreNode = nd; }
      });
    }
    var satellites = nodes.filter(function (nd) { return nd !== coreNode; });
    var nodeMap = {};
    function measure(nd) {
      var attrs = nd.attributes || [];
      var maxL = Math.max.apply(null, [(nd.label || "").length * 7.5 + 24].concat(attrs.map(function (a) { return (a || "").length * 6.5 + 26; })));
      return {
        w: (typeof nd.w === "number") ? nd.w : Math.min(235, Math.max(185, Math.round(maxL))),
        h: (typeof nd.h === "number") ? nd.h : Math.max(70, 36 + attrs.length * 18 + 8),
        attrs: attrs
      };
    }
    function drawCard(nd, x, y, cw, ch, attrs, ser) {
      var sG = el(nodeG, "g", null, { role: "graphics-symbol", tabindex: "0", "data-node": nd.id });
      if (ser) sG.setAttribute("data-series", ser);
      txt(sG, "title", nd.label + " (" + attrs.length + " attributes)");
      el(sG, "rect", "cdiag-node-base", { x: x, y: y, width: cw, height: ch, rx: 6 });
      el(sG, "rect", "cdiag-node-rect", { x: x, y: y, width: cw, height: ch, rx: 6 });
      el(sG, "rect", "cdiag-header-rect", { x: x, y: y, width: cw, height: 28, rx: 6 });
      el(sG, "line", "cdiag-header-divider", { x1: x, y1: y + 28, x2: x + cw, y2: y + 28 });
      txt(sG, "text", trunc(nd.label, Math.max(3, Math.floor((cw - 16) / 7.5))), "cdiag-header-text", { x: x + cw / 2, y: y + 14 });
      var maxAC = Math.max(3, Math.floor((cw - 24) / 6.5));
      attrs.forEach(function (at, ai) {
        txt(sG, "text", trunc(at, maxAC), "cdiag-attr-text", { x: x + 12, y: y + 42 + ai * 18 });
      });
      return { x: x, y: y, w: cw, h: ch, cx: x + cw / 2, cy: y + ch / 2 };
    }
    var numSat = satellites.length, satM = satellites.map(measure);
    if (coreNode) {
      var cm = measure(coreNode);
      var cX = (typeof coreNode.x === "number") ? coreNode.x : Math.round(cx - cm.w / 2);
      var cY = (typeof coreNode.y === "number") ? coreNode.y : Math.round(cy - cm.h / 2);
      nodeMap[coreNode.id] = drawCard(coreNode, cX, cY, cm.w, cm.h, cm.attrs, coreNode.series || 1);
      outline.push(coreNode.label + " [Central Entity]: " + cm.attrs.join(", "));
    }
    satellites.forEach(function (nd, i) {
      var sm = satM[i], sw = sm.w, sh = sm.h, sx, sy;
      if (typeof nd.x === "number" && typeof nd.y === "number") {
        sx = nd.x; sy = nd.y;
      } else if (numSat === 5) {
        sx = (i === 1 || i === 4) ? (w - 40 - sw) : ((i === 3) ? Math.round(cx - sw / 2) : 40);
        sy = (i < 2) ? 45 : (h - 45 - sh);
      } else if (numSat === 4) {
        sx = (i % 2 === 1) ? (w - 45 - sw) : 45;
        sy = (i < 2) ? 50 : (h - 50 - sh);
      } else if (numSat === 3) {
        sx = (i === 1) ? (w - 50 - sw) : ((i === 2) ? Math.round(cx - sw / 2) : 50);
        sy = (i < 2) ? 50 : (h - 50 - sh);
      } else {
        var rx = Math.round((w - 280) / 2), ry = Math.round((h - 180) / 2);
        var ang = -Math.PI / 2 + i * (2 * Math.PI / (numSat || 1));
        sx = Math.round(cx + rx * Math.cos(ang) - sw / 2);
        sy = Math.round(cy + ry * Math.sin(ang) - sh / 2);
      }
      var ser = nd.series || ((i % 5) + 1);
      nodeMap[nd.id] = drawCard(nd, sx, sy, sw, sh, sm.attrs, ser);
      outline.push(nd.label + " [Related Entity]: " + sm.attrs.join(", "));
    });
    edges.forEach(function (ed) {
      var s = nodeMap[ed.source || ed.from], t = nodeMap[ed.target || ed.to];
      if (s && t) {
        var pt1 = rectIntersect(s, t.cx, t.cy), pt2 = rectIntersect(t, s.cx, s.cy);
        addEdge(edgeG, pt1.x, pt1.y, pt2.x, pt2.y, ed.label, ed.style || "solid", ed.arrow !== false, false);
      }
    });
    return fig("cdiag-entity-relationship", svg, spec.title, outline);
  }
  function layeredArchitecture(spec) {
    var layers = spec.layers || [], S = initSvg(spec, 860, 420), svg = S.svg, w = S.w, h = S.h;
    var outline = [];
    var nodeG = el(svg, "g", "cdiag-nodes");
    var numLayers = layers.length, layerH = (h - 60) / numLayers;
    layers.forEach(function (lay, li) {
      var ly = 30 + li * layerH;
      el(nodeG, "rect", "cdiag-layer-box", { x: 30, y: ly, width: w - 60, height: layerH - 12 });
      txt(nodeG, "text", lay.label, "cdiag-layer-title", { x: 42, y: ly + 14 });
      outline.push(lay.label + ":");
      var comps = lay.nodes || [], compW = 185;
      comps.forEach(function (cName, ci) {
        var cx = 200 + ci * (compW + 20);
        addNode(nodeG, cx, ly + 18, compW, layerH - 38, cName, null, "rect", (li % 5) + 1, cName);
        outline.push("  - " + cName);
      });
    });
    return fig("cdiag-layered-architecture", svg, spec.title, outline);
  }
  function sequence(spec) {
    var parts = spec.participants || [], msgs = spec.messages || [];
    var S = initSvg(spec, 840, 380), svg = S.svg, w = S.w, h = S.h;
    var outline = [];
    var edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var partMap = {}, pSpacing = (w - 120) / Math.max(1, parts.length - 1);
    parts.forEach(function (p, pi) {
      var px = 60 + pi * pSpacing;
      addNode(nodeG, px - 65, 20, 130, 34, p.label, null, "rect", (pi % 5) + 1, p.id);
      partMap[p.id] = px;
      el(edgeG, "line", "cdiag-edge-line cdiag-edge-dashed", { x1: px, y1: 56, x2: px, y2: h - 30 });
      outline.push("Participant: " + p.label);
    });
    var msgSpacing = (h - 120) / Math.max(1, msgs.length);
    msgs.forEach(function (m, mi) {
      var x1 = partMap[m.from], x2 = partMap[m.to], my = 95 + mi * msgSpacing;
      addEdge(edgeG, x1, my, x2, my, null, (m.type === "return") ? "dashed" : "solid", true, false);
      txt(edgeG, "text", m.label, "cdiag-sequence-msg-label", { x: (x1 + x2) / 2, y: my - 6 });
      outline.push("  " + m.label + " (" + m.from + " -> " + m.to + ")");
    });
    return fig("cdiag-sequence", svg, spec.title, outline);
  }
  function stateMachine(spec) {
    return flowOrState(spec, false);
  }
  function matrix(spec) {
    var nodes = spec.nodes || [], axes = spec.axes || {};
    var S = initSvg(spec, 840, 440), svg = S.svg, w = S.w, h = S.h;
    var outline = [], nodeG = el(svg, "g", "cdiag-nodes");
    var cx = w / 2, cy = h / 2, pad = 40, qw = cx - pad, qh = cy - pad;
    var quadNames = axes.quadrants || ["Q1", "Q2", "Q3", "Q4"];
    [[pad, pad], [cx, pad], [pad, cy], [cx, cy]].forEach(function (pt, qi) {
      el(nodeG, "rect", "cdiag-quadrant-bg", { x: pt[0], y: pt[1], width: qw, height: qh });
      txt(nodeG, "text", quadNames[qi] || "", "cdiag-layer-title", { x: pt[0] + 12, y: pt[1] + 20 });
    });
    el(nodeG, "line", "cdiag-matrix-axis", { x1: pad, y1: cy, x2: w - pad, y2: cy });
    el(nodeG, "line", "cdiag-matrix-axis", { x1: cx, y1: pad, x2: cx, y2: h - pad });
    if (axes.x) txt(nodeG, "text", axes.x, "cdiag-layer-title", { x: cx, y: h - pad + 24, "text-anchor": "middle" });
    if (axes.y) txt(nodeG, "text", axes.y, "cdiag-layer-title", { x: pad, y: pad - 12 });
    var qCounts = { q1: 0, q2: 0, q3: 0, q4: 0 }, pillW = 210, pillH = 34;
    nodes.forEach(function (nd) {
      var q = (nd.quadrant || "q1").toLowerCase(), qIdx = qCounts[q] || 0;
      qCounts[q] = qIdx + 1;
      var nx = (q === "q2" || q === "q4") ? (cx + 30) : (pad + 30);
      var ny = (q === "q3" || q === "q4") ? (cy + 42 + qIdx * 44) : (pad + 42 + qIdx * 44);
      addNode(nodeG, nx, ny, pillW, pillH, nd.label, null, "pill", nd.series || 1, nd.id);
      outline.push(nd.label + " [" + q.toUpperCase() + "]");
    });
    return fig("cdiag-matrix", svg, spec.title, outline);
  }
  function timeline(spec) {
    var milestones = spec.milestones || spec.events || spec.nodes || [];
    if (!milestones.length) return empty(spec);
    var phases = spec.phases || spec.bands || [];
    var S = initSvg(spec, 860, 340), svg = S.svg, w = S.w, h = S.h;
    var outline = [], phaseG = el(svg, "g", "cdiag-phases"), edgeG = el(svg, "g", "cdiag-edges"), nodeG = el(svg, "g", "cdiag-nodes");
    var numM = milestones.length, padX = 70, padR = 70, spineW = w - padX - padR, spineY = Math.round(h * 0.52);
    var mCoords = milestones.map(function (_, i) { return numM === 1 ? (w / 2) : (padX + (i / (numM - 1)) * spineW); });
    function mIdx(v, def) {
      if (typeof v === "number") return v;
      for (var k = 0; k < numM; k++) if (milestones[k].id === v) return k;
      return def;
    }
    phases.forEach(function (p) {
      var sIdx = Math.max(0, Math.min(mIdx(p.start, 0), numM - 1));
      var eIdx = Math.max(0, Math.min(mIdx(p.end, numM - 1), numM - 1));
      var x1 = mCoords[sIdx] - (sIdx === 0 ? 35 : 20), x2 = mCoords[eIdx] + (eIdx === numM - 1 ? 35 : 20);
      var pw = Math.max(40, x2 - x1), py = 24, ph = h - 48;
      var pGroup = el(phaseG, "g", "cdiag-timeline-phase-group");
      if (p.series) pGroup.setAttribute("data-series", p.series);
      el(pGroup, "rect", "cdiag-timeline-phase", { x: x1, y: py, width: pw, height: ph, rx: 6 });
      txt(pGroup, "text", p.label, "cdiag-timeline-phase-label", { x: x1 + pw / 2, y: py + 16 });
      outline.push("Phase: " + p.label);
    });
    el(edgeG, "line", "cdiag-timeline-spine", { x1: padX - 35, y1: spineY, x2: w - padR + 35, y2: spineY });
    var stemG = el(edgeG, "g", "cdiag-timeline-stems"), markerG = el(edgeG, "g", "cdiag-timeline-markers");
    milestones.forEach(function (m, i) {
      var mx = mCoords[i], isAbove = (i % 2 === 0);
      var cardW = Math.min(145, Math.max(100, Math.round((spineW / numM) * 0.95))), cardH = 42;
      var cardX = mx - cardW / 2, cardY = isAbove ? (spineY - 45 - cardH) : (spineY + 45);
      var mSeries = m.series || ((i % 5) + 1);
      el(stemG, "line", "cdiag-edge-line cdiag-timeline-stem", { x1: mx, y1: spineY, x2: mx, y2: isAbove ? (cardY + cardH) : cardY });
      var mg = el(markerG, "g", "cdiag-timeline-marker-group");
      if (mSeries) mg.setAttribute("data-series", mSeries);
      el(mg, "circle", "cdiag-timeline-marker", { cx: mx, cy: spineY, r: 6 });
      el(mg, "circle", "cdiag-timeline-marker-dot", { cx: mx, cy: spineY, r: 2.5 });
      var sub = m.date ? (m.date + (m.description ? " — " + m.description : "")) : (m.description || null);
      var mNode = addNode(nodeG, cardX, cardY, cardW, cardH, m.label, trunc(sub, 24), "rect", mSeries, m.id);
      mNode.g.setAttribute("class", "cdiag-timeline-milestone");
      outline.push("Milestone: " + m.label + (m.date ? " (" + m.date + ")" : "") + (m.description ? " - " + m.description : ""));
    });
    return fig("cdiag-timeline", svg, spec.title, outline);
  }
  var MARKS = {
    mindmap: mindmap, "context-map": contextMap, "tree-horizontal": treeHorizontal, "tree-vertical": treeVertical,
    flowchart: flowchart, "entity-relationship": entityRelationship, "layered-architecture": layeredArchitecture,
    sequence: sequence, "state-machine": stateMachine, matrix: matrix, timeline: timeline
  };
  function render(spec, container) {
    var s = spec || {};
    if (!s.root && !s.core && !s.center && !(s.nodes && s.nodes.length) && !(s.layers && s.layers.length) && !(s.participants && s.participants.length) && !(s.milestones && s.milestones.length) && !(s.events && s.events.length)) {
      var e = empty(spec);
      if (container) append(container, e);
      return e;
    }
    var fn = MARKS[spec.type];
    var root = fn ? fn(spec) : empty(spec);
    if (container) append(container, root);
    return root;
  }
  function append(c, el) {
    var target = (typeof c === "string") ? getDoc().getElementById(c) : c;
    if (target && target.appendChild) target.appendChild(el);
  }
    return { render: render };
});
