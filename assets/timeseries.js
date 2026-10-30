/*
 * Interactive monthly bar chart for period-over-period comparisons.
 * Tap a bar to select a month; the chart highlights the period it is compared with
 * (previous month for MoM, same month last year for YoY) and shows the calculation.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/timeseries.css">
 *   <div id="ts"></div>
 *   <script src="../assets/timeseries.js"></script>
 *   <script>
 *     TimeSeries.mount(document.getElementById("ts"), {
 *       start: { year: 2025, month: 0 },   // month is 0-based (0 = Jan)
 *       values: [20, 22, 30, ...],
 *       unit: "k€",
 *       mode: "mom",                       // "mom" or "yoy"
 *       selected: 20,                      // index of the month selected at load
 *     });
 *   </script>
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function mount(root, config) {
    let mode = config.mode || "mom";
    let selected = config.selected ?? config.values.length - 1;
    const values = config.values;
    const unit = config.unit || "";
    const label = (i) => {
      const m = (config.start.month + i) % 12;
      const y = config.start.year + Math.floor((config.start.month + i) / 12);
      return `${MONTHS[m]} ${y}`;
    };

    root.classList.add("timeseries");
    const toggle = document.createElement("div");
    toggle.className = "ts-toggle";
    toggle.setAttribute("role", "group");
    toggle.setAttribute("aria-label", "Comparison");
    const buttons = {};
    [["mom", "Month over month (MoM)"], ["yoy", "Year over year (YoY)"]].forEach(([key, text]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", () => { mode = key; draw(); });
      buttons[key] = b;
      toggle.append(b);
    });

    const svg = svgEl("svg", { viewBox: "0 0 620 190", class: "ts-svg", role: "img" });
    const readout = document.createElement("div");
    readout.className = "ts-readout";
    readout.setAttribute("aria-live", "polite");
    root.append(toggle, svg, readout);

    function draw() {
      Object.entries(buttons).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === mode)));
      svg.replaceChildren();

      const n = values.length;
      const left = 34, right = 610, top = 14, base = 160;
      const slot = (right - left) / n;
      const barW = Math.max(6, slot * 0.68);
      const max = Math.max(...values) * 1.1;
      const y = (v) => base - (v / max) * (base - top);
      const back = mode === "mom" ? 1 : 12;
      const compare = selected - back;

      // Gridlines at round values, labelled on the left.
      const raw = max / 4;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const r = raw / mag;
      const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag;
      for (let g = 0; g <= max; g += step) {
        svg.append(svgEl("line", { x1: left, x2: right, y1: y(g), y2: y(g), class: "ts-grid" }));
        const t = svgEl("text", { x: left - 6, y: y(g) + 4, class: "ts-axis", "text-anchor": "end" });
        t.textContent = g;
        svg.append(t);
      }

      values.forEach((v, i) => {
        const x = left + i * slot + (slot - barW) / 2;
        let cls = "ts-bar";
        if (i === selected) cls += " is-selected";
        else if (i === compare) cls += " is-compare";
        const bar = svgEl("rect", { x, y: y(v), width: barW, height: base - y(v), rx: 2, class: cls, tabindex: 0, "aria-label": `${label(i)}: ${v} ${unit}` });
        bar.addEventListener("click", () => { selected = i; draw(); });
        bar.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selected = i; draw(); } });
        svg.append(bar);

        const m = (config.start.month + i) % 12;
        const t = svgEl("text", { x: x + barW / 2, y: base + 14, class: "ts-axis", "text-anchor": "middle" });
        t.textContent = MONTHS[m][0];
        svg.append(t);
        if (m === 0 || i === 0) {
          const yr = svgEl("text", { x: x, y: base + 28, class: "ts-year" });
          yr.textContent = config.start.year + Math.floor((config.start.month + i) / 12);
          svg.append(yr);
        }
      });

      const name = mode === "mom" ? "MoM" : "YoY";
      if (compare < 0) {
        readout.innerHTML = `<b>${label(selected)}</b>: ${values[selected]} ${unit}. There is no ${mode === "mom" ? "previous month" : "same month last year"} in the data, so ${name} is <b>blank</b>.`;
        return;
      }
      const now = values[selected], then = values[compare];
      const pct = ((now - then) / then) * 100;
      const sign = pct > 0 ? "+" : "";
      readout.innerHTML =
        `<b>${label(selected)}</b> vs <b>${label(compare)}</b><br>` +
        `<span class="ts-calc">(${now} − ${then}) ÷ ${then} = <b class="${pct >= 0 ? "ts-up" : "ts-down"}">${sign}${pct.toFixed(1)}%</b></span>`;
    }

    draw();
  }

  window.TimeSeries = { mount };
})();
