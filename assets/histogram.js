/*
 * Interactive histogram: counts values into equal-width bins, marks the mean and median,
 * gives a rough shape check (mean vs median), and marks any percentile the learner picks.
 * Percentiles use Excel's PERCENTILE.INC method, so answers match Excel.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/histogram.css">
 *   <div id="hist"></div>
 *   <script src="../assets/histogram.js"></script>
 *   <script>
 *     Histogram.mount(document.getElementById("hist"), {
 *       values: [12, 15, 18, ...],
 *       binWidth: 20,
 *       percentile: 90,     // initial percentile marker (1–99); null hides the control
 *       unit: "€",          // optional prefix for the stats line
 *     });
 *   </script>
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function fmt(x) {
    const r = Math.round(x * 100) / 100;
    return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function median(s) {
    const n = s.length, m = Math.floor(n / 2);
    return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function percentileInc(s, p) {
    const pos = (s.length - 1) * p;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }

  function field(labelText, el) {
    const label = document.createElement("label");
    label.className = "hist-label";
    label.textContent = labelText;
    label.append(el);
    return label;
  }

  function mount(root, config) {
    const opts = Object.assign({ binWidth: 10, percentile: 90, unit: "" }, config);
    root.classList.add("histogram");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "hist-input";
    input.value = opts.values.join(", ");
    input.setAttribute("aria-label", "Numbers, separated by commas");

    const width = document.createElement("input");
    width.type = "number";
    width.min = "0.1";
    width.step = "any";
    width.className = "hist-small";
    width.value = opts.binWidth;

    const pct = document.createElement("input");
    pct.type = "number";
    pct.min = "1";
    pct.max = "99";
    pct.className = "hist-small";
    pct.value = opts.percentile ?? 90;

    const controls = document.createElement("div");
    controls.className = "hist-controls";
    controls.append(field("Bin width", width));
    if (opts.percentile != null) controls.append(field("Percentile (P)", pct));

    root.append(field("Your numbers (edit me):", input), controls);

    const svg = svgEl("svg", { viewBox: "0 0 600 230", role: "img", class: "hist-svg" });
    const stats = document.createElement("div");
    stats.className = "hist-stats";
    root.append(svg, stats);

    function draw() {
      const values = input.value.split(/[,\s;]+/).filter((s) => s !== "").map(Number).filter(Number.isFinite);
      svg.replaceChildren();
      const w = Number(width.value);
      if (values.length < 3 || !(w > 0)) {
        stats.textContent = "Type at least 3 numbers and a bin width above 0.";
        return;
      }
      const s = [...values].sort((a, b) => a - b);
      const n = s.length;
      const start = Math.floor(s[0] / w) * w;
      let binCount = Math.floor((s[n - 1] - start) / w) + 1;
      if (binCount > 60) {
        stats.textContent = "That bin width makes more than 60 bins. Try a bigger one.";
        return;
      }
      const counts = new Array(binCount).fill(0);
      s.forEach((v) => counts[Math.min(binCount - 1, Math.floor((v - start) / w))]++);
      const maxC = Math.max(...counts);
      const end = start + binCount * w;

      const L = 34, R = 580, T = 40, B = 190;
      const x = (v) => L + ((v - start) / (end - start)) * (R - L);
      const y = (c) => B - (c / maxC) * (B - T);

      // Gridline + y label for the max count.
      svg.append(svgEl("line", { x1: L, x2: R, y1: T, y2: T, class: "hist-grid" }));
      const yl = svgEl("text", { x: L - 6, y: T + 4, class: "hist-tick", "text-anchor": "end" });
      yl.textContent = maxC;
      svg.append(yl);

      counts.forEach((c, i) => {
        const x0 = x(start + i * w), x1 = x(start + (i + 1) * w);
        if (c > 0) {
          svg.append(svgEl("rect", { x: x0 + 1, y: y(c), width: Math.max(1, x1 - x0 - 2), height: B - y(c), class: "hist-bar" }));
          if (binCount <= 24) {
            const t = svgEl("text", { x: (x0 + x1) / 2, y: y(c) - 4, class: "hist-count", "text-anchor": "middle" });
            t.textContent = c;
            svg.append(t);
          }
        }
      });

      svg.append(svgEl("line", { x1: L, x2: R, y1: B, y2: B, class: "hist-axis" }));
      const every = Math.ceil((binCount + 1) / 10);
      for (let i = 0; i <= binCount; i += every) {
        const v = start + i * w;
        const t = svgEl("text", { x: x(v), y: B + 16, class: "hist-tick", "text-anchor": "middle" });
        t.textContent = fmt(v);
        svg.append(t);
      }

      const mean = s.reduce((a, b) => a + b, 0) / n;
      const med = median(s);
      const p = Math.min(99, Math.max(1, Number(pct.value) || 90));
      const pv = percentileInc(s, p / 100);

      function marker(v, cls, label, yText, anchorRight) {
        svg.append(svgEl("line", { x1: x(v), x2: x(v), y1: yText + 4, y2: B, class: cls }));
        const t = svgEl("text", { x: x(v) + (anchorRight ? -4 : 4), y: yText, class: cls + "-label", "text-anchor": anchorRight ? "end" : "start" });
        t.textContent = label;
        svg.append(t);
      }
      const meanRight = mean >= med;
      marker(med, "hist-median", `median ${fmt(med)}`, 14, meanRight);
      marker(mean, "hist-mean", `mean ${fmt(mean)}`, 30, !meanRight);
      if (opts.percentile != null) marker(pv, "hist-pct", `P${p} ${fmt(pv)}`, 222, false);

      const sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
      const gap = sd > 0 ? (mean - med) / sd : 0;
      const shape = gap > 0.15
        ? "Mean is well above the median: probably <b>right-skewed</b> (long tail to the right). Summarise with median + IQR."
        : gap < -0.15
          ? "Mean is well below the median: probably <b>left-skewed</b> (long tail to the left). Summarise with median + IQR."
          : "Mean and median are close: roughly <b>symmetric</b>. Mean + SD is fine if there are no outliers.";

      const u = opts.unit;
      stats.innerHTML =
        `<span><b class="hist-median-label">Median</b> ${u}${fmt(med)}</span>` +
        `<span><b class="hist-mean-label">Mean</b> ${u}${fmt(mean)}</span>` +
        (opts.percentile != null ? `<span><b class="hist-pct-label">P${p}</b> ${u}${fmt(pv)} <span class="small">(${p}% of values are at or below this)</span></span>` : "") +
        `<span class="small">${n} values in ${binCount} bins of width ${fmt(w)}. Rough shape check: ${shape}</span>`;
    }

    [input, width, pct].forEach((el) => el.addEventListener("input", draw));
    draw();
  }

  window.Histogram = { mount };
})();
