/*
 * Interactive box plot: plots a list of numbers as dots, draws the box (Q1, median, Q3),
 * whiskers, and the 1.5 × IQR fences, and flags anything outside the fences as an outlier.
 *
 * Quartile method: "median of each half". With an odd count, the middle value is left out
 * of both halves (Excel's box-and-whisker chart default, "exclusive median").
 * Excel's QUARTILE.INC numbers are shown underneath for comparison.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/boxplot.css">
 *   <div id="box"></div>
 *   <script src="../assets/boxplot.js"></script>
 *   <script>
 *     BoxPlot.mount(document.getElementById("box"), {
 *       values: [2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 21],
 *       unit: "days",          // optional, shown after numbers
 *       editable: true,        // text box the learner can change
 *       showFences: true,      // dashed 1.5 × IQR fence lines and outlier flags
 *       showExcel: true,       // QUARTILE.INC comparison line
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

  function median(sorted) {
    const n = sorted.length;
    const mid = Math.floor(n / 2);
    return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Excel QUARTILE.INC / PERCENTILE.INC: position (n − 1) × p, interpolated.
  function quartileInc(sorted, p) {
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function niceTicks(lo, hi) {
    const raw = (hi - lo) / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const ticks = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
    return ticks;
  }

  function mount(root, config) {
    const opts = Object.assign({ editable: true, showFences: true, showExcel: true, unit: "" }, config);
    const u = opts.unit ? " " + opts.unit : "";
    root.classList.add("boxplot");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "boxplot-input";
    input.value = opts.values.join(", ");
    input.setAttribute("aria-label", "Numbers, separated by commas");
    if (opts.editable) {
      const label = document.createElement("label");
      label.className = "boxplot-label";
      label.textContent = "Your numbers (edit me):";
      label.append(input);
      root.append(label);
    }

    const svg = svgEl("svg", { viewBox: "0 0 600 180", role: "img", class: "boxplot-svg" });
    const sortedRow = document.createElement("div");
    sortedRow.className = "boxplot-sorted";
    const stats = document.createElement("dl");
    stats.className = "boxplot-stats";
    const note = document.createElement("p");
    note.className = "boxplot-note small";
    root.append(svg, sortedRow, stats, note);

    function draw() {
      const values = input.value.split(/[,\s;]+/).filter((s) => s !== "").map(Number).filter(Number.isFinite);
      svg.replaceChildren();
      stats.replaceChildren();
      note.textContent = "";
      if (values.length < 4) {
        sortedRow.textContent = "Type at least 4 numbers separated by commas.";
        return;
      }
      const s = [...values].sort((a, b) => a - b);
      const n = s.length;
      const half = Math.floor(n / 2);
      const lower = s.slice(0, half);
      const upper = s.slice(n % 2 ? half + 1 : half);
      const q1 = median(lower);
      const med = median(s);
      const q3 = median(upper);
      const iqr = q3 - q1;
      const loF = q1 - 1.5 * iqr;
      const hiF = q3 + 1.5 * iqr;
      const isOut = (v) => opts.showFences && (v < loF || v > hiF);
      const inside = s.filter((v) => !isOut(v));
      const wLo = inside[0];
      const wHi = inside[inside.length - 1];

      let lo = s[0], hi = s[n - 1];
      if (opts.showFences) { lo = Math.min(lo, loF); hi = Math.max(hi, hiF); }
      if (lo === hi) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.04;
      lo -= pad; hi += pad;
      const x = (v) => 20 + ((v - lo) / (hi - lo)) * 560;

      // Axis with round-number ticks.
      svg.append(svgEl("line", { x1: 20, x2: 580, y1: 150, y2: 150, class: "bp-axis" }));
      niceTicks(lo, hi).forEach((t) => {
        svg.append(svgEl("line", { x1: x(t), x2: x(t), y1: 150, y2: 155, class: "bp-axis" }));
        const label = svgEl("text", { x: x(t), y: 170, class: "bp-tick", "text-anchor": "middle" });
        label.textContent = fmt(t);
        svg.append(label);
      });

      // Fences.
      if (opts.showFences) {
        [[loF, "lower fence"], [hiF, "upper fence"]].forEach(([v, name], i) => {
          svg.append(svgEl("line", { x1: x(v), x2: x(v), y1: 18, y2: 150, class: "bp-fence" }));
          const t = svgEl("text", { x: x(v) + (i ? -4 : 4), y: 12, class: "bp-fence-label", "text-anchor": i ? "end" : "start" });
          t.textContent = `${name} ${fmt(v)}`;
          svg.append(t);
        });
      }

      // Box and whiskers.
      const by = 92, bh = 34;
      svg.append(svgEl("line", { x1: x(wLo), x2: x(q1), y1: by + bh / 2, y2: by + bh / 2, class: "bp-whisker" }));
      svg.append(svgEl("line", { x1: x(q3), x2: x(wHi), y1: by + bh / 2, y2: by + bh / 2, class: "bp-whisker" }));
      [wLo, wHi].forEach((v) => svg.append(svgEl("line", { x1: x(v), x2: x(v), y1: by + 8, y2: by + bh - 8, class: "bp-whisker" })));
      svg.append(svgEl("rect", { x: x(q1), y: by, width: Math.max(1, x(q3) - x(q1)), height: bh, class: "bp-box" }));
      svg.append(svgEl("line", { x1: x(med), x2: x(med), y1: by, y2: by + bh, class: "bp-median" }));

      // Dots, stacked for duplicates.
      const seen = {};
      s.forEach((v) => {
        const k = (seen[v] = (seen[v] || 0) + 1);
        svg.append(svgEl("circle", { cx: x(v), cy: 78 - 9 * (k - 1), r: 5.5, class: isOut(v) ? "bp-dot is-out" : "bp-dot" }));
      });

      // Sorted list: lower half, middle, upper half.
      const role = (i) => {
        if (n % 2 && i === half) return "is-middle";
        return i < half ? "is-lower" : "is-upper";
      };
      sortedRow.innerHTML =
        "<span class='bp-caption'>Sorted:</span> " +
        s.map((v, i) => `<span class="bp-num ${role(i)}${isOut(v) ? " is-out" : ""}">${fmt(v)}</span>`).join("") +
        `<span class="bp-key"><span class="bp-num is-lower">lower half</span> median = Q1 · ` +
        (n % 2 ? `<span class="bp-num is-middle">middle</span> left out · ` : "") +
        `<span class="bp-num is-upper">upper half</span> median = Q3</span>`;

      const outs = s.filter(isOut);
      const rows = [
        ["Min", fmt(s[0]) + u], ["Q1", fmt(q1) + u], ["Median", fmt(med) + u], ["Q3", fmt(q3) + u], ["Max", fmt(s[n - 1]) + u],
        ["Range", `${fmt(s[n - 1])} − ${fmt(s[0])} = <b>${fmt(s[n - 1] - s[0])}</b>`],
        ["IQR", `${fmt(q3)} − ${fmt(q1)} = <b>${fmt(iqr)}</b>`],
      ];
      if (opts.showFences) {
        rows.push(["Fences", `${fmt(q1)} − ${fmt(1.5 * iqr)} = ${fmt(loF)} · ${fmt(q3)} + ${fmt(1.5 * iqr)} = ${fmt(hiF)}`]);
        rows.push(["Outliers", outs.length ? `<b class="bp-out-text">${outs.map(fmt).join(", ")}</b>` : "none"]);
      }
      rows.forEach(([k, v]) => {
        const dt = document.createElement("dt");
        dt.textContent = k;
        const dd = document.createElement("dd");
        dd.innerHTML = v;
        stats.append(dt, dd);
      });

      if (opts.showExcel) {
        note.textContent = `Excel's QUARTILE.INC uses a slightly different method and gives Q1 ${fmt(quartileInc(s, 0.25))}, Q3 ${fmt(quartileInc(s, 0.75))}. Small differences like this are normal.`;
      }
    }

    input.addEventListener("input", draw);
    draw();
  }

  window.BoxPlot = { mount };
})();
