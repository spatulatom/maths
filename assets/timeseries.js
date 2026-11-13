/*
 * Interactive monthly bar chart for comparisons and windows over time.
 * Tap a bar to select a month. Depending on the mode the chart highlights:
 *   "mom"  the previous month, and shows the percent change
 *   "yoy"  the same month last year, and shows the percent change
 *   "ytd"  every month from January of that year, and shows the year-to-date total
 *   "ma3"  the last three months, and shows their average (plus a moving-average line)
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
 *       modes: ["mom", "yoy"],             // buttons to show (default mom + yoy); one mode hides the toggle
 *       mode: "mom",                       // mode selected at load
 *       selected: 20,                      // index of the month selected at load
 *     });
 *   </script>
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MODE_LABELS = {
    mom: "Month over month (MoM)",
    yoy: "Year over year (YoY)",
    ytd: "Year to date (YTD)",
    ma3: "3-month moving average",
  };

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const pctText = (now, then) => {
    const pct = ((now - then) / then) * 100;
    return `<b class="${pct >= 0 ? "ts-up" : "ts-down"}">${pct > 0 ? "+" : ""}${pct.toFixed(1)}%</b>`;
  };

  function mount(root, config) {
    const modes = config.modes || ["mom", "yoy"];
    let mode = config.mode || modes[0];
    let selected = config.selected ?? config.values.length - 1;
    const values = config.values;
    const unit = config.unit || "";
    const monthOf = (i) => (config.start.month + i) % 12;
    const yearOf = (i) => config.start.year + Math.floor((config.start.month + i) / 12);
    const label = (i) => `${MONTHS[monthOf(i)]} ${yearOf(i)}`;

    // Indices highlighted alongside the selected month.
    function windowFor(i) {
      if (mode === "mom") return i - 1 >= 0 ? [i - 1] : [];
      if (mode === "yoy") return i - 12 >= 0 ? [i - 12] : [];
      if (mode === "ytd") {
        const from = Math.max(0, i - monthOf(i));
        return Array.from({ length: i - from }, (_, k) => from + k);
      }
      return i >= 2 ? [i - 2, i - 1] : [];
    }

    root.classList.add("timeseries");
    const toggle = document.createElement("div");
    toggle.className = "ts-toggle";
    toggle.setAttribute("role", "group");
    toggle.setAttribute("aria-label", "Calculation");
    const buttons = {};
    modes.forEach((key) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = MODE_LABELS[key];
      b.addEventListener("click", () => { mode = key; draw(); });
      buttons[key] = b;
      toggle.append(b);
    });

    const svg = svgEl("svg", { viewBox: "0 0 620 190", class: "ts-svg", role: "img" });
    const readout = document.createElement("div");
    readout.className = "ts-readout";
    readout.setAttribute("aria-live", "polite");
    if (modes.length > 1) root.append(toggle);
    root.append(svg, readout);

    function draw() {
      Object.entries(buttons).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === mode)));
      svg.replaceChildren();

      const n = values.length;
      const left = 34, right = 610, top = 14, base = 160;
      const slot = (right - left) / n;
      const barW = Math.max(6, slot * 0.68);
      const max = Math.max(...values) * 1.1;
      const y = (v) => base - (v / max) * (base - top);
      const win = windowFor(selected);

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
        else if (win.includes(i)) cls += mode === "mom" || mode === "yoy" ? " is-compare" : " is-window";
        const bar = svgEl("rect", { x, y: y(v), width: barW, height: base - y(v), rx: 2, class: cls, tabindex: 0, "aria-label": `${label(i)}: ${v} ${unit}` });
        bar.addEventListener("click", () => { selected = i; draw(); });
        bar.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selected = i; draw(); } });
        svg.append(bar);

        const t = svgEl("text", { x: x + barW / 2, y: base + 14, class: "ts-axis", "text-anchor": "middle" });
        t.textContent = MONTHS[monthOf(i)][0];
        svg.append(t);
        if (monthOf(i) === 0 || i === 0) {
          const yr = svgEl("text", { x: x, y: base + 28, class: "ts-year" });
          yr.textContent = yearOf(i);
          svg.append(yr);
        }
      });

      if (mode === "ma3") {
        const points = values
          .map((_, i) => (i >= 2 ? `${left + i * slot + slot / 2},${y(sum(values.slice(i - 2, i + 1)) / 3)}` : null))
          .filter(Boolean)
          .join(" ");
        svg.append(svgEl("polyline", { points, class: "ts-line" }));
      }

      const now = values[selected];
      if (mode === "ytd") {
        const months = [...win, selected];
        const total = sum(months.map((i) => values[i]));
        let html =
          `<b>${label(months[0])} → ${label(selected)}</b> (${months.length} month${months.length > 1 ? "s" : ""})<br>` +
          `<span class="ts-calc">${months.map((i) => values[i]).join(" + ")} = <b>${total}</b> ${unit}</span>`;
        const lastYear = months.map((i) => i - 12);
        if (lastYear[0] >= 0) {
          const before = sum(lastYear.map((i) => values[i]));
          html += `<br><span class="ts-note">Same months last year: ${before} ${unit}, so YTD vs last year is ${pctText(total, before)}</span>`;
        }
        readout.innerHTML = html;
        return;
      }
      if (mode === "ma3") {
        if (selected < 2) {
          readout.innerHTML = `<b>${label(selected)}</b>: ${now} ${unit}. A 3-month average needs three months of data, so it is <b>blank</b> here.`;
          return;
        }
        const three = [selected - 2, selected - 1, selected].map((i) => values[i]);
        readout.innerHTML =
          `<b>${label(selected - 2)} → ${label(selected)}</b><br>` +
          `<span class="ts-calc">(${three.join(" + ")}) ÷ 3 = <b>${fmt(sum(three) / 3)}</b> ${unit}</span>`;
        return;
      }

      const name = mode === "mom" ? "MoM" : "YoY";
      if (win.length === 0) {
        readout.innerHTML = `<b>${label(selected)}</b>: ${now} ${unit}. There is no ${mode === "mom" ? "previous month" : "same month last year"} in the data, so ${name} is <b>blank</b>.`;
        return;
      }
      const then = values[win[0]];
      readout.innerHTML =
        `<b>${label(selected)}</b> vs <b>${label(win[0])}</b><br>` +
        `<span class="ts-calc">(${now} − ${then}) ÷ ${then} = ${pctText(now, then)}</span>`;
    }

    draw();
  }

  window.TimeSeries = { mount };
})();
