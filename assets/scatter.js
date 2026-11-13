/*
 * Interactive scatter plot: preset datasets, click the chart to add a point, and live
 * correlation (r, same as Excel CORREL). Optional least-squares trend line with slope.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/scatter.css">
 *   <div id="sc"></div>
 *   <script src="../assets/scatter.js"></script>
 *   <script>
 *     Scatter.mount(document.getElementById("sc"), {
 *       xLabel: "X", yLabel: "Y",
 *       xMax: 100, yMax: 100,          // axes run from 0 to these
 *       presets: [
 *         { name: "Strong positive", points: Scatter.generate("positive", 1) },
 *         { name: "No pattern", points: [[10, 40], [50, 20]] },
 *       ],
 *       showTrend: false,              // least-squares line + slope, intercept, r² readout
 *       predict: false,                // with showTrend: input box that reads Y off the line
 *     });
 *   </script>
 *
 * Scatter.generate(kind, seed, n = 30) → [[x, y], ...] on a 0–100 grid.
 * Kinds: "positive", "weak", "negative", "none", "curve".
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function fmt(x, d = 2) {
    const r = Math.round(x * 10 ** d) / 10 ** d;
    return String(r).replace("-", "−");
  }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generate(kind, seed, n = 30) {
    const r = rng(seed);
    const noise = (s) => (r() + r() + r() - 1.5) * s;
    const clamp = (v) => Math.max(2, Math.min(98, Math.round(v)));
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = 10 + 80 * r();
      let y;
      if (kind === "positive") y = 10 + 0.8 * x + noise(14);
      else if (kind === "weak") y = 30 + 0.35 * x + noise(45);
      else if (kind === "negative") y = 90 - 0.8 * x + noise(12);
      else if (kind === "curve") y = 15 + (x - 50) ** 2 / 22 + noise(8);
      else y = 15 + 70 * r();
      pts.push([clamp(x), clamp(y)]);
    }
    return pts;
  }

  function stats(pts) {
    const n = pts.length;
    if (n < 3) return null;
    const mx = pts.reduce((a, p) => a + p[0], 0) / n;
    const my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    pts.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
    if (sxx === 0 || syy === 0) return null;
    const r = sxy / Math.sqrt(sxx * syy);
    const slope = sxy / sxx;
    return { n, r, slope, intercept: my - slope * mx };
  }

  function describe(r) {
    const a = Math.abs(r);
    const dir = r > 0 ? "positive (they rise together)" : "negative (one rises, the other falls)";
    if (a >= 0.7) return `strong ${dir}`;
    if (a >= 0.4) return `moderate ${dir}`;
    if (a >= 0.1) return `weak ${dir}`;
    return "little or no straight-line relationship";
  }

  function mount(root, config) {
    const opts = Object.assign({ xLabel: "X", yLabel: "Y", xMax: 100, yMax: 100, presets: [], showTrend: false, predict: false }, config);
    root.classList.add("scatter");
    let pts = opts.presets.length ? opts.presets[0].points.map((p) => [...p]) : [];

    const bar = document.createElement("div");
    bar.className = "sc-presets";
    const buttons = opts.presets.map((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p.name;
      b.addEventListener("click", () => {
        pts = p.points.map((q) => [...q]);
        buttons.forEach((o) => o.classList.toggle("is-active", o === b));
        draw();
      });
      if (i === 0) b.classList.add("is-active");
      bar.append(b);
      return b;
    });
    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "sc-tool";
    undo.textContent = "Undo last point";
    undo.addEventListener("click", () => { pts.pop(); draw(); });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "sc-tool";
    clear.textContent = "Clear";
    clear.addEventListener("click", () => { pts = []; buttons.forEach((o) => o.classList.remove("is-active")); draw(); });
    bar.append(undo, clear);

    const hint = document.createElement("p");
    hint.className = "small sc-hint";
    hint.textContent = "Tap or click inside the chart to add a point.";

    const svg = svgEl("svg", { viewBox: "0 0 600 380", role: "img", class: "sc-svg" });
    const out = document.createElement("div");
    out.className = "sc-stats";
    root.append(bar, hint, svg, out);

    let predictX = null;
    const pred = document.createElement("div");
    pred.className = "sc-predict";
    if (opts.showTrend && opts.predict) {
      const lab = document.createElement("label");
      lab.innerHTML = `Predict ${opts.yLabel} at ${opts.xLabel} = `;
      const inp = document.createElement("input");
      inp.type = "number";
      inp.inputMode = "decimal";
      inp.placeholder = "type a number";
      inp.addEventListener("input", () => {
        const v = parseFloat(inp.value);
        predictX = Number.isFinite(v) ? v : null;
        draw();
      });
      lab.append(inp);
      const msg = document.createElement("p");
      msg.className = "sc-predict-msg";
      pred.append(lab, msg);
      root.append(pred);
    }

    const L = 50, R = 585, T = 12, B = 330;
    const x = (v) => L + (v / opts.xMax) * (R - L);
    const y = (v) => B - (v / opts.yMax) * (B - T);

    svg.addEventListener("click", (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      if (p.x < L || p.x > R || p.y < T || p.y > B) return;
      const dx = ((p.x - L) / (R - L)) * opts.xMax;
      const dy = ((B - p.y) / (B - T)) * opts.yMax;
      pts.push([Math.round(dx * 10) / 10, Math.round(dy * 10) / 10]);
      draw();
    });

    function draw() {
      svg.replaceChildren();
      const defs = svgEl("defs", {});
      const clip = svgEl("clipPath", { id: "sc-clip-" + root.id });
      clip.append(svgEl("rect", { x: L, y: T, width: R - L, height: B - T }));
      defs.append(clip);
      svg.append(defs);

      svg.append(svgEl("rect", { x: L, y: T, width: R - L, height: B - T, class: "sc-plot" }));
      for (let i = 0; i <= 4; i++) {
        const xv = (opts.xMax / 4) * i, yv = (opts.yMax / 4) * i;
        svg.append(svgEl("line", { x1: x(xv), x2: x(xv), y1: T, y2: B, class: "sc-grid" }));
        svg.append(svgEl("line", { x1: L, x2: R, y1: y(yv), y2: y(yv), class: "sc-grid" }));
        const tx = svgEl("text", { x: x(xv), y: B + 16, class: "sc-tick", "text-anchor": "middle" });
        tx.textContent = fmt(xv, 1);
        const ty = svgEl("text", { x: L - 6, y: y(yv) + 4, class: "sc-tick", "text-anchor": "end" });
        ty.textContent = fmt(yv, 1);
        svg.append(tx, ty);
      }
      const xl = svgEl("text", { x: (L + R) / 2, y: B + 38, class: "sc-axis-label", "text-anchor": "middle" });
      xl.textContent = opts.xLabel;
      const yl = svgEl("text", { x: 14, y: (T + B) / 2, class: "sc-axis-label", "text-anchor": "middle", transform: `rotate(-90 14 ${(T + B) / 2})` });
      yl.textContent = opts.yLabel;
      svg.append(xl, yl);

      const s = stats(pts);
      if (opts.showTrend && s) {
        svg.append(svgEl("line", {
          x1: x(0), y1: y(s.intercept), x2: x(opts.xMax), y2: y(s.intercept + s.slope * opts.xMax),
          class: "sc-trend", "clip-path": `url(#sc-clip-${root.id})`,
        }));
      }
      pts.forEach(([px, py]) => svg.append(svgEl("circle", { cx: x(px), cy: y(py), r: 5.5, class: "sc-dot" })));

      const msg = pred.querySelector(".sc-predict-msg");
      if (msg) msg.textContent = "";

      if (!s) {
        out.innerHTML = `<span class="small">${pts.length} points. Add at least 3 points that aren't all in a flat or vertical line to get r.</span>`;
        return;
      }
      const sign = s.slope < 0 ? "−" : "+";
      out.innerHTML =
        `<span><b class="sc-r">r = ${fmt(s.r)}</b></span>` +
        `<span>${describe(s.r)}</span>` +
        (opts.showTrend
          ? `<span><b>Trend line</b> ${opts.yLabel} ≈ ${fmt(s.intercept, 1)} ${sign} ${fmt(Math.abs(s.slope))} × ${opts.xLabel}</span>` +
            `<span><b>r²</b> = ${fmt(s.r * s.r)} (about ${Math.round(s.r * s.r * 100)}% of the up-and-down follows the line)</span>`
          : "") +
        `<span class="small">${s.n} points</span>`;

      if (msg && predictX !== null) {
        const py = s.intercept + s.slope * predictX;
        const xs = pts.map((p) => p[0]);
        const lo = Math.min(...xs), hi = Math.max(...xs);
        const inside = predictX >= lo && predictX <= hi;
        msg.textContent =
          `The line gives ${opts.yLabel} ≈ ${fmt(py, 1)}. ` +
          (inside
            ? `${fmt(predictX, 1)} is inside your data (${fmt(lo, 1)} to ${fmt(hi, 1)}), so no extrapolation. How much to trust it depends on how tightly the dots hug the line (r²).`
            : `Careful: ${fmt(predictX, 1)} is outside your data (${fmt(lo, 1)} to ${fmt(hi, 1)}). That's extrapolation; the pattern may not hold out there.`);
        msg.classList.toggle("is-warn", !inside);
        if (predictX >= 0 && predictX <= opts.xMax && py >= 0 && py <= opts.yMax) {
          svg.append(svgEl("line", { x1: x(predictX), x2: x(predictX), y1: B, y2: y(py), class: "sc-guide" }));
          svg.append(svgEl("line", { x1: L, x2: x(predictX), y1: y(py), y2: y(py), class: "sc-guide" }));
          svg.append(svgEl("circle", { cx: x(predictX), cy: y(py), r: 7, class: inside ? "sc-pred" : "sc-pred is-warn" }));
        }
      }
    }

    draw();
  }

  window.Scatter = { mount, generate };
})();
