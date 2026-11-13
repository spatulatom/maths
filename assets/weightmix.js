/*
 * Interactive group mixer: groups of different sizes, each with its own mean.
 * Compares the naive "average of the averages" with the true weighted mean (total ÷ count).
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/weightmix.css">
 *   <div id="mix"></div>
 *   <script src="../assets/weightmix.js"></script>
 *   <script>
 *     WeightMix.mount(document.getElementById("mix"), {
 *       countLabel: "Orders", valueLabel: "Avg order (€)",
 *       groups: [ { name: "Store A", count: 100, value: 10 }, { name: "Store B", count: 300, value: 20 } ],
 *     });
 *   </script>
 */
(function () {
  function fmt(x) {
    return Number.isFinite(x) ? (Math.round(x * 100) / 100).toLocaleString("en-US") : "–";
  }

  function mount(root, config) {
    const groups = config.groups.map((g) => ({ ...g }));
    root.classList.add("weightmix");

    const table = document.createElement("table");
    table.innerHTML =
      `<thead><tr><th>Group</th><th>${config.countLabel || "Count"}</th><th>${config.valueLabel || "Mean"}</th><th>Total</th></tr></thead>`;
    const body = document.createElement("tbody");
    table.append(body);

    const result = document.createElement("div");
    result.className = "wm-result";
    root.append(table, result);

    groups.forEach((g, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${g.name}</td>
        <td><input type="number" min="0" step="1" value="${g.count}" data-k="count" aria-label="${g.name} count"></td>
        <td><input type="number" step="any" value="${g.value}" data-k="value" aria-label="${g.name} mean"></td>
        <td class="wm-total"></td>`;
      tr.querySelectorAll("input").forEach((inp) =>
        inp.addEventListener("input", () => { groups[i][inp.dataset.k] = Number(inp.value); draw(); })
      );
      body.append(tr);
    });

    function draw() {
      let totalSum = 0, totalCount = 0;
      body.querySelectorAll(".wm-total").forEach((cell, i) => {
        const t = groups[i].count * groups[i].value;
        cell.textContent = fmt(t);
        totalSum += t;
        totalCount += groups[i].count;
      });
      const naive = groups.reduce((s, g) => s + g.value, 0) / groups.length;
      const weighted = totalSum / totalCount;

      const values = groups.map((g) => g.value).concat([naive, weighted]).filter(Number.isFinite);
      let lo = Math.min(...values), hi = Math.max(...values);
      if (lo === hi) { lo -= 1; hi += 1; }
      const pct = (v) => 4 + ((v - lo) / (hi - lo)) * 92;
      const maxCount = Math.max(...groups.map((g) => g.count), 1);

      result.innerHTML = `
        <div class="wm-scale">
          ${groups.map((g) => `<span class="wm-dot" title="${g.name}" style="left:${pct(g.value)}%;width:${10 + 26 * Math.sqrt(g.count / maxCount)}px;height:${10 + 26 * Math.sqrt(g.count / maxCount)}px"></span>`).join("")}
          <span class="wm-mark wm-naive" style="left:${pct(naive)}%"></span>
          <span class="wm-mark wm-weighted" style="left:${pct(weighted)}%"></span>
        </div>
        <div class="wm-readout">
          <span><b class="wm-naive-label">Average of the averages</b> ${fmt(naive)} <span class="small">(wrong when sizes differ)</span></span>
          <span><b class="wm-weighted-label">Weighted mean</b> = ${fmt(totalSum)} ÷ ${fmt(totalCount)} = <b>${fmt(weighted)}</b></span>
        </div>`;
    }

    draw();
  }

  window.WeightMix = { mount };
})();
