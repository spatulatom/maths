/*
 * Interactive dot strip: plots a list of numbers on a line and marks the median and mean.
 * Shows the sorted list with the middle value(s) highlighted, so you can see where the median comes from.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/datastrip.css">
 *   <div id="strip"></div>
 *   <script src="../assets/datastrip.js"></script>
 *   <script>
 *     DataStrip.mount(document.getElementById("strip"), {
 *       values: [3, 9, 1, 7, 100],
 *       editable: true,       // shows a text box the learner can change
 *       showMean: true,
 *       showMedian: true,
 *     });
 *   </script>
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";

  function median(sorted) {
    const n = sorted.length;
    const mid = Math.floor(n / 2);
    return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function fmt(x) {
    return Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function mount(root, config) {
    const opts = Object.assign({ editable: true, showMean: true, showMedian: true }, config);
    root.classList.add("datastrip");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "datastrip-input";
    input.value = opts.values.join(", ");
    input.setAttribute("aria-label", "Numbers, separated by commas");
    if (opts.editable) {
      const label = document.createElement("label");
      label.className = "datastrip-label";
      label.textContent = "Your numbers (edit me):";
      label.append(input);
      root.append(label);
    }

    const svg = svgEl("svg", { viewBox: "0 0 600 130", role: "img", class: "datastrip-svg" });
    const sortedRow = document.createElement("div");
    sortedRow.className = "datastrip-sorted";
    const stats = document.createElement("div");
    stats.className = "datastrip-stats";
    root.append(svg, sortedRow, stats);

    function draw() {
      const values = input.value.split(/[,\s;]+/).filter((s) => s !== "").map(Number).filter(Number.isFinite);
      svg.replaceChildren();
      if (!values.length) {
        sortedRow.textContent = "Type some numbers separated by commas.";
        stats.textContent = "";
        return;
      }
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      const med = median(sorted);
      const mean = sorted.reduce((s, v) => s + v, 0) / n;

      let lo = sorted[0], hi = sorted[n - 1];
      if (lo === hi) { lo -= 1; hi += 1; }
      const x = (v) => 30 + ((v - lo) / (hi - lo)) * 540;

      svg.append(svgEl("line", { x1: 30, x2: 570, y1: 80, y2: 80, class: "ds-axis" }));
      [lo, hi].forEach((v) => {
        const t = svgEl("text", { x: x(v), y: 100, class: "ds-tick", "text-anchor": "middle" });
        t.textContent = fmt(v);
        svg.append(t);
      });

      // Stack duplicate values so every dot stays visible.
      const seen = {};
      sorted.forEach((v) => {
        const k = (seen[v] = (seen[v] || 0) + 1);
        svg.append(svgEl("circle", { cx: x(v), cy: 80 - 9 * k, r: 6, class: "ds-dot" }));
      });

      function marker(v, cls, label, y) {
        svg.append(svgEl("line", { x1: x(v), x2: x(v), y1: 22, y2: 86, class: cls }));
        const t = svgEl("text", { x: x(v), y, class: cls + "-label", "text-anchor": "middle" });
        t.textContent = `${label} ${fmt(v)}`;
        svg.append(t);
      }
      if (opts.showMedian) marker(med, "ds-median", "median", 16);
      if (opts.showMean) marker(mean, "ds-mean", "mean", 122);

      const mid = Math.floor(n / 2);
      const middle = n % 2 ? [mid] : [mid - 1, mid];
      sortedRow.innerHTML =
        "<span class='ds-caption'>Sorted:</span> " +
        sorted.map((v, i) => `<span class="ds-num${middle.includes(i) ? " is-middle" : ""}">${fmt(v)}</span>`).join("");

      const how = n % 2
        ? `${n} values (odd), so the median is the single middle value.`
        : `${n} values (even), so the median is the mean of the two middle values: (${fmt(sorted[mid - 1])} + ${fmt(sorted[mid])}) ÷ 2.`;
      stats.innerHTML =
        (opts.showMedian ? `<span><b class="ds-median-label">Median</b> ${fmt(med)}</span>` : "") +
        (opts.showMean ? `<span><b class="ds-mean-label">Mean</b> ${fmt(mean)}</span>` : "") +
        `<span class="small">${how}</span>`;
    }

    input.addEventListener("input", draw);
    draw();
  }

  window.DataStrip = { mount };
})();
