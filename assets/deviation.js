/*
 * Standard deviation, step by step: plots each value as its own row with a bar from the mean
 * to the value (its deviation), shades the band mean ± 1 SD, and shows the calculation table:
 * value → distance from mean → squared → sum → ÷ n (or n − 1) → square root.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/deviation.css">
 *   <div id="dev"></div>
 *   <script src="../assets/deviation.js"></script>
 *   <script>
 *     Deviation.mount(document.getElementById("dev"), {
 *       values: [2, 4, 4, 4, 5, 5, 7, 9],
 *       editable: true,     // text box the learner can change
 *       showTable: true,    // the step-by-step calculation table
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
    const s = Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return s.replace("-", "−");
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
    const opts = Object.assign({ editable: true, showTable: true }, config);
    root.classList.add("deviation");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "deviation-input";
    input.value = opts.values.join(", ");
    input.setAttribute("aria-label", "Numbers, separated by commas");
    if (opts.editable) {
      const label = document.createElement("label");
      label.className = "deviation-label";
      label.textContent = "Your numbers (edit me):";
      label.append(input);
      root.append(label);
    }

    const svg = svgEl("svg", { role: "img", class: "deviation-svg" });
    const summary = document.createElement("div");
    summary.className = "deviation-summary";
    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    root.append(svg, summary, tableWrap);

    function draw() {
      const values = input.value.split(/[,\s;]+/).filter((s) => s !== "").map(Number).filter(Number.isFinite).slice(0, 30);
      svg.replaceChildren();
      tableWrap.replaceChildren();
      if (values.length < 2) {
        summary.textContent = "Type at least 2 numbers separated by commas.";
        svg.setAttribute("viewBox", "0 0 600 10");
        return;
      }
      const n = values.length;
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const devs = values.map((v) => v - mean);
      const sq = devs.map((d) => d * d);
      const ss = sq.reduce((a, b) => a + b, 0);
      const sdP = Math.sqrt(ss / n);
      const sdS = Math.sqrt(ss / (n - 1));
      const within = values.filter((v) => Math.abs(v - mean) <= sdP + 1e-9).length;

      let lo = Math.min(...values, mean - sdP), hi = Math.max(...values, mean + sdP);
      if (lo === hi) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.05;
      lo -= pad; hi += pad;
      const x = (v) => 20 + ((v - lo) / (hi - lo)) * 560;

      const rowH = 16, top = 24;
      const axisY = top + n * rowH + 8;
      const H = axisY + 26;
      svg.setAttribute("viewBox", `0 0 600 ${H}`);

      // Mean ± 1 SD band.
      svg.append(svgEl("rect", { x: x(mean - sdP), y: top - 6, width: Math.max(0, x(mean + sdP) - x(mean - sdP)), height: n * rowH + 6, class: "dv-band" }));
      const bandLabel = svgEl("text", { x: x(mean + sdP) - 4, y: 14, class: "dv-band-label", "text-anchor": "end" });
      bandLabel.textContent = "mean ± 1 SD";
      svg.append(bandLabel);

      // Mean line.
      svg.append(svgEl("line", { x1: x(mean), x2: x(mean), y1: top - 10, y2: axisY, class: "dv-mean" }));
      const meanLabel = svgEl("text", { x: x(mean - sdP) + 4, y: 14, class: "dv-mean-label", "text-anchor": "start" });
      meanLabel.textContent = `mean ${fmt(mean)}`;
      svg.append(meanLabel);

      // One row per value: bar from the mean to the value.
      values.forEach((v, i) => {
        const y = top + i * rowH + rowH / 2;
        svg.append(svgEl("line", { x1: x(mean), x2: x(v), y1: y, y2: y, class: v >= mean ? "dv-bar is-up" : "dv-bar is-down" }));
        svg.append(svgEl("circle", { cx: x(v), cy: y, r: 4.5, class: "dv-dot" }));
      });

      // Axis.
      svg.append(svgEl("line", { x1: 20, x2: 580, y1: axisY, y2: axisY, class: "dv-axis" }));
      niceTicks(lo, hi).forEach((t) => {
        svg.append(svgEl("line", { x1: x(t), x2: x(t), y1: axisY, y2: axisY + 5, class: "dv-axis" }));
        const label = svgEl("text", { x: x(t), y: axisY + 19, class: "dv-tick", "text-anchor": "middle" });
        label.textContent = fmt(t);
        svg.append(label);
      });

      summary.innerHTML =
        `<span><b>Mean</b> ${fmt(mean)}</span>` +
        `<span><b class="dv-sd">SD (STDEV.P)</b> ${fmt(sdP)}</span>` +
        `<span><b>SD (STDEV.S)</b> ${fmt(sdS)}</span>` +
        `<span class="small">${within} of ${n} values sit within 1 SD of the mean (the shaded band).</span>`;

      if (!opts.showTable) return;
      const rows = values.map((v, i) =>
        `<tr><td>${fmt(v)}</td><td>${fmt(devs[i])}</td><td>${fmt(sq[i])}</td></tr>`).join("");
      tableWrap.innerHTML =
        `<table class="dv-table">
          <thead><tr><th>Value</th><th>Distance from mean<br><span class="small">value − ${fmt(mean)}</span></th><th>Squared</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td>Sum</td><td>${fmt(devs.reduce((a, b) => a + b, 0))} <span class="small">(always 0)</span></td><td>${fmt(ss)}</td></tr>
            <tr><td colspan="2">÷ n (${n}) = variance, then √</td><td>${fmt(ss / n)} → <b>${fmt(sdP)}</b></td></tr>
            <tr><td colspan="2">÷ (n − 1) (${n - 1}), then √</td><td>${fmt(ss / (n - 1))} → <b>${fmt(sdS)}</b></td></tr>
          </tfoot>
        </table>`;
    }

    input.addEventListener("input", draw);
    draw();
  }

  window.Deviation = { mount };
})();
