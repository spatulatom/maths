/*
 * Filter playground: a small table, a few conditions you can switch on, flip with NOT,
 * and combine with AND or OR. Matching rows light up; count and total update live.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/filters.css">
 *   <div id="fl"></div>
 *   <script src="../assets/filters.js"></script>
 *   <script>
 *     Filters.mount(document.getElementById("fl"), {
 *       cols: ["Region", "Product", "Amount"],
 *       rows: [["North", "Tea", 120]],
 *       conditions: [{ label: "Region = North", test: (r) => r[0] === "North", on: true }],
 *       sumCol: 2,          // optional column index to total
 *       combine: "AND",
 *     });
 *   </script>
 */
(function () {
  function mount(root, config) {
    const opts = Object.assign({ cols: [], rows: [], conditions: [], sumCol: null, combine: "AND" }, config);
    const conds = opts.conditions.map((c) => ({ label: c.label, test: c.test, on: !!c.on, not: !!c.not }));
    let combine = opts.combine;
    root.classList.add("filters");

    const panel = document.createElement("div");
    panel.className = "fl-panel";
    const comb = document.createElement("div");
    comb.className = "fl-combine";
    comb.innerHTML = `<span class="fl-label">Combine switched-on conditions with</span>`;
    const cb = ["AND", "OR"].map((m) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = m;
      b.classList.toggle("is-active", m === combine);
      b.addEventListener("click", () => { combine = m; cb.forEach((o) => o.classList.toggle("is-active", o === b)); render(); });
      comb.append(b);
      return b;
    });
    const list = document.createElement("div");
    list.className = "fl-conds";
    conds.forEach((c) => {
      const row = document.createElement("div");
      row.className = "fl-cond";
      const on = document.createElement("label");
      const onBox = document.createElement("input");
      onBox.type = "checkbox"; onBox.checked = c.on;
      onBox.addEventListener("change", () => { c.on = onBox.checked; render(); });
      on.append(onBox, document.createTextNode(" " + c.label));
      const not = document.createElement("button");
      not.type = "button"; not.className = "fl-not"; not.textContent = "NOT";
      not.setAttribute("aria-pressed", c.not);
      not.classList.toggle("is-active", c.not);
      not.addEventListener("click", () => {
        c.not = !c.not;
        not.classList.toggle("is-active", c.not);
        not.setAttribute("aria-pressed", c.not);
        render();
      });
      row.append(not, on);
      list.append(row);
    });
    panel.append(list, comb);

    const expr = document.createElement("p");
    expr.className = "fl-expr";
    const table = document.createElement("div");
    table.className = "table-wrap";
    const out = document.createElement("p");
    out.className = "fl-out";
    root.append(panel, expr, out, table);

    function render() {
      const active = conds.filter((c) => c.on);
      const pass = (r) => {
        if (!active.length) return true;
        const vals = active.map((c) => (c.not ? !c.test(r) : !!c.test(r)));
        return combine === "AND" ? vals.every(Boolean) : vals.some(Boolean);
      };
      expr.innerHTML = active.length
        ? "Filter: " + active.map((c) => `<code>${c.not ? "NOT (" + c.label + ")" : c.label}</code>`).join(` <b>${combine}</b> `)
        : "Filter: none, so every row is kept.";
      let n = 0, total = 0;
      let h = `<table><tr>` + opts.cols.map((c) => `<th>${c}</th>`).join("") + `</tr>`;
      opts.rows.forEach((r) => {
        const ok = pass(r);
        if (ok) { n++; if (opts.sumCol !== null) total += r[opts.sumCol]; }
        h += `<tr class="${ok ? "is-kept" : "is-dropped"}">` + r.map((v) => `<td>${v === "" || v === null ? '<span class="fl-blank">(blank)</span>' : v}</td>`).join("") + `</tr>`;
      });
      table.innerHTML = h + `</table>`;
      out.innerHTML = `<b>${n} of ${opts.rows.length}</b> rows kept` +
        (opts.sumCol !== null ? ` · total ${opts.cols[opts.sumCol]} = <b>${total.toLocaleString("en-GB")}</b>` : "");
    }
    render();
  }

  window.Filters = { mount };
})();
