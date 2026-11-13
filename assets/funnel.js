/*
 * Conversion funnel: editable step percentages → people left at each step, overall
 * probability (the AND rule: multiply), biggest drop, and optional expected value.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/funnel.css">
 *   <div id="fn"></div>
 *   <script src="../assets/funnel.js"></script>
 *   <script>
 *     Funnel.mount(document.getElementById("fn"), {
 *       visitors: 10000,
 *       steps: [{ name: "View a product", pct: 40 }, { name: "Add to basket", pct: 25 }],
 *       aov: 60,                 // optional average order value → revenue per visitor
 *       currency: "£",
 *     });
 *   </script>
 */
(function () {
  function fmtNum(x) { return Math.round(x).toLocaleString("en-GB"); }
  function fmtPct(p) {
    const v = p * 100;
    const d = v >= 10 ? 1 : v >= 1 ? 2 : 3;
    return String(Math.round(v * 10 ** d) / 10 ** d) + "%";
  }

  function mount(root, config) {
    const opts = Object.assign({ visitors: 10000, steps: [], aov: null, currency: "£" }, config);
    const steps = opts.steps.map((s) => ({ name: s.name, pct: s.pct }));
    root.classList.add("funnel");

    const list = document.createElement("div");
    list.className = "fn-steps";
    const out = document.createElement("div");
    out.className = "fn-out";
    root.append(list, out);

    function build() {
      list.replaceChildren();
      const head = document.createElement("div");
      head.className = "fn-row fn-start";
      head.innerHTML = `<span class="fn-name">Visitors arrive</span><span></span><span class="fn-bar"><i style="width:100%"></i></span><span class="fn-count">${fmtNum(opts.visitors)}</span>`;
      list.append(head);
      steps.forEach((s, i) => {
        const row = document.createElement("div");
        row.className = "fn-row";
        const name = document.createElement("span");
        name.className = "fn-name";
        name.textContent = s.name;
        const lab = document.createElement("label");
        lab.className = "fn-pct";
        const inp = document.createElement("input");
        inp.type = "number"; inp.min = 0; inp.max = 100; inp.step = 1; inp.value = s.pct;
        inp.inputMode = "decimal";
        inp.setAttribute("aria-label", `${s.name}: percent of the previous step`);
        inp.addEventListener("input", () => {
          const v = parseFloat(inp.value);
          s.pct = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
          update();
        });
        lab.append(inp, document.createTextNode(" %"));
        const bar = document.createElement("span");
        bar.className = "fn-bar";
        bar.append(document.createElement("i"));
        const count = document.createElement("span");
        count.className = "fn-count";
        row.append(name, lab, bar, count);
        list.append(row);
      });
      update();
    }

    function update() {
      let p = 1;
      let worst = -1, worstLoss = -1;
      const rows = list.querySelectorAll(".fn-row:not(.fn-start)");
      steps.forEach((s, i) => {
        const before = p;
        p *= s.pct / 100;
        const loss = before - p;
        if (loss > worstLoss) { worstLoss = loss; worst = i; }
        rows[i].querySelector(".fn-bar i").style.width = (p * 100) + "%";
        rows[i].querySelector(".fn-count").textContent = fmtNum(opts.visitors * p);
      });
      rows.forEach((r, i) => r.classList.toggle("is-worst", i === worst && worstLoss > 0));
      const chain = steps.map((s) => (s.pct / 100).toString()).join(" × ");
      let html =
        `<p><b class="fn-big">${fmtPct(p)}</b> of visitors make it through every step.</p>` +
        `<p class="small">AND rule: ${chain} = ${Math.round(p * 100000) / 100000}</p>`;
      if (worst >= 0 && worstLoss > 0) {
        html += `<p>Most people are lost at <b>${steps[worst].name}</b> (${fmtNum(opts.visitors * worstLoss)} of ${fmtNum(opts.visitors)}).</p>`;
      }
      if (opts.aov) {
        const ev = p * opts.aov;
        html += `<p><b>Expected revenue per visitor</b> = ${fmtPct(p)} × ${opts.currency}${opts.aov} = <b>${opts.currency}${(Math.round(ev * 100) / 100).toFixed(2)}</b>. Across ${fmtNum(opts.visitors)} visitors that's about ${opts.currency}${fmtNum(ev * opts.visitors)}.</p>`;
      }
      out.innerHTML = html;
    }

    build();
  }

  window.Funnel = { mount };
})();
