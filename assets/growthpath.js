/*
 * Compound growth explorer: yearly values as bars, with two "steady growth" lines from the first value.
 *   dashed line: grows by the simple average of the yearly % changes (usually misses the end)
 *   solid line:  grows by the CAGR, which always lands exactly on the last value
 * Every value is editable, so the learner can try their own numbers.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/growthpath.css">
 *   <div id="gp"></div>
 *   <script src="../assets/growthpath.js"></script>
 *   <script>
 *     GrowthPath.mount(document.getElementById("gp"), {
 *       startYear: 2022,
 *       values: [100, 150, 120, 180],
 *       unit: "k€",
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

  const pct = (r) => `${r > 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;
  const num = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

  function mount(root, config) {
    const values = config.values.slice();
    const unit = config.unit || "";
    root.classList.add("growthpath");

    const inputs = document.createElement("div");
    inputs.className = "gp-inputs";
    values.forEach((v, i) => {
      const lab = document.createElement("label");
      lab.textContent = config.startYear + i;
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "1";
      inp.inputMode = "decimal";
      inp.value = v;
      inp.addEventListener("input", () => {
        const x = parseFloat(inp.value);
        if (x > 0) { values[i] = x; draw(); }
      });
      lab.append(inp);
      inputs.append(lab);
    });

    const svg = svgEl("svg", { viewBox: "0 0 620 200", class: "gp-svg", role: "img", "aria-label": "Yearly values with steady-growth lines" });
    const legend = document.createElement("div");
    legend.className = "gp-legend";
    legend.innerHTML =
      '<span><i class="gp-key gp-key-naive"></i>Grows by the simple average every year</span>' +
      '<span><i class="gp-key gp-key-cagr"></i>Grows by the CAGR every year</span>';
    const readout = document.createElement("div");
    readout.className = "gp-readout";
    readout.setAttribute("aria-live", "polite");
    root.append(inputs, svg, legend, readout);

    function draw() {
      svg.replaceChildren();
      const n = values.length;
      const periods = n - 1;
      const changes = values.slice(1).map((v, i) => (v - values[i]) / values[i]);
      const naive = changes.reduce((a, b) => a + b, 0) / periods;
      const first = values[0], last = values[n - 1];
      const cagr = Math.pow(last / first, 1 / periods) - 1;
      const naivePath = values.map((_, i) => first * Math.pow(1 + naive, i));
      const cagrPath = values.map((_, i) => first * Math.pow(1 + cagr, i));

      const left = 40, right = 610, top = 14, base = 170;
      const slot = (right - left) / n;
      const barW = Math.min(60, slot * 0.55);
      const max = Math.max(...values, ...naivePath) * 1.1;
      const y = (v) => base - (v / max) * (base - top);
      const cx = (i) => left + i * slot + slot / 2;

      const raw = max / 4;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const r = raw / mag;
      const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag;
      for (let g = 0; g <= max; g += step) {
        svg.append(svgEl("line", { x1: left, x2: right, y1: y(g), y2: y(g), class: "gp-grid" }));
        const t = svgEl("text", { x: left - 6, y: y(g) + 4, class: "gp-axis", "text-anchor": "end" });
        t.textContent = g;
        svg.append(t);
      }

      values.forEach((v, i) => {
        svg.append(svgEl("rect", { x: cx(i) - barW / 2, y: y(v), width: barW, height: base - y(v), rx: 2, class: "gp-bar" }));
        const val = svgEl("text", { x: cx(i), y: y(v) - 5, class: "gp-value", "text-anchor": "middle" });
        val.textContent = num(v);
        svg.append(val);
        const yr = svgEl("text", { x: cx(i), y: base + 16, class: "gp-axis", "text-anchor": "middle" });
        yr.textContent = config.startYear + i;
        svg.append(yr);
        if (i > 0) {
          const ch = svgEl("text", { x: left + i * slot, y: base + 30, class: changes[i - 1] >= 0 ? "gp-change gp-up" : "gp-change gp-down", "text-anchor": "middle" });
          ch.textContent = pct(changes[i - 1]);
          svg.append(ch);
        }
      });

      const line = (path, cls) => svg.append(svgEl("polyline", { points: path.map((v, i) => `${cx(i)},${y(v)}`).join(" "), class: cls }));
      line(naivePath, "gp-line gp-naive");
      line(cagrPath, "gp-line gp-cagr");

      const miss = naivePath[n - 1];
      readout.innerHTML =
        `<b>${periods}</b> periods of growth (${config.startYear} → ${config.startYear + periods})<br>` +
        `<span class="gp-calc">Simple average of the % changes = <b>${pct(naive)}</b>. Growing ${num(first)} by that every year ends at <b>${num(miss)}</b>, not ${num(last)}.</span><br>` +
        `<span class="gp-calc">CAGR = (${num(last)} ÷ ${num(first)})<sup>1/${periods}</sup> − 1 = <b>${pct(cagr)}</b>. Growing by that every year lands exactly on ${num(last)}.</span>`;
    }

    draw();
  }

  window.GrowthPath = { mount };
})();
