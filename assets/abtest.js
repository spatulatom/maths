/*
 * A/B test simulator. Set the TRUE conversion rate of version A and version B and the
 * visitors per version; each run simulates the test, then reports observed rates, the
 * gap, a two-sided p-value (two-proportion z-test), and a running tally of how many runs
 * came out "significant" (p < 0.05).
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/abtest.css">
 *   <div id="ab"></div>
 *   <script src="../assets/abtest.js"></script>
 *   <script>
 *     ABTest.mount(document.getElementById("ab"), {
 *       rateA: 5, rateB: 6, visitors: 2000, sizes: [200, 1000, 2000, 10000],
 *       presets: [{ name: "No real difference", rateA: 5, rateB: 5 }],
 *     });
 *   </script>
 */
(function () {
  function erf(x) {
    // Abramowitz–Stegun 7.1.26, accurate to ~1e-7
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

  function pValue(xA, nA, xB, nB) {
    const p = (xA + xB) / (nA + nB);
    const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
    if (se === 0) return 1;
    const z = (xB / nB - xA / nA) / se;
    return 2 * (1 - normCdf(Math.abs(z)));
  }
  function binom(n, p) {
    let k = 0;
    for (let i = 0; i < n; i++) if (Math.random() < p) k++;
    return k;
  }
  const pct = (v, d = 2) => (Math.round(v * 100 * 10 ** d) / 10 ** d).toFixed(d) + "%";
  const fmtP = (p) => (p < 0.001 ? "< 0.001" : p.toFixed(3));

  function mount(root, config) {
    const opts = Object.assign({ rateA: 5, rateB: 6, visitors: 2000, sizes: [200, 1000, 2000, 10000], presets: [] }, config);
    root.classList.add("abtest");
    let rateA = opts.rateA, rateB = opts.rateB, n = opts.visitors, runs = [];

    const setup = document.createElement("div");
    setup.className = "ab-setup";
    const inA = numField("True rate A", rateA, (v) => { rateA = v; runs = []; render(); });
    const inB = numField("True rate B", rateB, (v) => { rateB = v; runs = []; render(); });
    const sizeWrap = document.createElement("div");
    sizeWrap.className = "ab-sizes";
    sizeWrap.innerHTML = `<span class="ab-label">Visitors per version</span>`;
    const sizeBtns = opts.sizes.map((s) => {
      const b = button(s.toLocaleString("en-GB"), () => {
        n = s; runs = [];
        sizeBtns.forEach((o) => o.classList.toggle("is-active", o === b));
        render();
      });
      b.classList.toggle("is-active", s === n);
      sizeWrap.append(b);
      return b;
    });
    setup.append(inA.wrap, inB.wrap, sizeWrap);

    if (opts.presets.length) {
      const pre = document.createElement("div");
      pre.className = "ab-presets";
      opts.presets.forEach((p) => {
        pre.append(button(p.name, () => {
          rateA = p.rateA; rateB = p.rateB; inA.input.value = rateA; inB.input.value = rateB;
          runs = []; render();
        }));
      });
      setup.prepend(pre);
    }

    const act = document.createElement("div");
    act.className = "ab-actions";
    const clear = button("Clear", () => { runs = []; render(); });
    clear.classList.add("ab-tool");
    act.append(button("Run the test once", () => run(1)), button("Run it 20 times", () => run(20)), clear);

    const out = document.createElement("div");
    out.className = "ab-out";
    const grid = document.createElement("div");
    grid.className = "ab-grid";
    root.append(setup, act, out, grid);

    function numField(label, value, onChange) {
      const wrap = document.createElement("label");
      wrap.className = "ab-num";
      wrap.append(document.createTextNode(label + " "));
      const input = document.createElement("input");
      input.type = "number"; input.min = 0; input.max = 100; input.step = 0.5; input.value = value;
      input.inputMode = "decimal";
      input.addEventListener("input", () => {
        const v = parseFloat(input.value);
        onChange(Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);
      });
      wrap.append(input, document.createTextNode(" %"));
      return { wrap, input };
    }
    function button(text, fn) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = text;
      b.addEventListener("click", fn);
      return b;
    }
    function run(k) {
      for (let i = 0; i < k; i++) {
        const xA = binom(n, rateA / 100), xB = binom(n, rateB / 100);
        runs.push({ xA, xB, p: pValue(xA, n, xB, n) });
      }
      runs = runs.slice(-200);
      render();
    }

    function render() {
      const truth = rateA === rateB
        ? `<span class="ab-truth">Truth: no real difference (both ${rateA}%).</span>`
        : `<span class="ab-truth">Truth: B really is ${rateB > rateA ? "better" : "worse"} (${rateA}% vs ${rateB}%).</span>`;
      if (!runs.length) {
        out.innerHTML = `<p>${truth}</p><p>Press <b>Run the test once</b> to send ${n.toLocaleString("en-GB")} visitors to each version.</p>`;
        grid.replaceChildren();
        return;
      }
      const last = runs[runs.length - 1];
      const rA = last.xA / n, rB = last.xB / n;
      const sig = last.p < 0.05;
      const sigCount = runs.filter((r) => r.p < 0.05).length;
      out.innerHTML =
        `<p>${truth}</p>` +
        `<div class="table-wrap"><table class="ab-table">` +
        `<tr><th></th><th>Converted</th><th>Rate</th></tr>` +
        `<tr><td>A</td><td>${last.xA} of ${n.toLocaleString("en-GB")}</td><td>${pct(rA)}</td></tr>` +
        `<tr><td>B</td><td>${last.xB} of ${n.toLocaleString("en-GB")}</td><td>${pct(rB)}</td></tr>` +
        `</table></div>` +
        `<p>Gap: <b>${(rB - rA >= 0 ? "+" : "−") + (Math.abs(rB - rA) * 100).toFixed(2)} points</b> · p-value: <b>${fmtP(last.p)}</b> → ` +
        `<span class="${sig ? "ab-sig" : "ab-ns"}">${sig ? "statistically significant (p < 0.05)" : "not significant (p ≥ 0.05)"}</span></p>` +
        `<p><b>${sigCount} of ${runs.length}</b> runs came out significant (${Math.round((sigCount / runs.length) * 100)}%).</p>`;
      grid.replaceChildren();
      runs.slice(-100).forEach((r) => {
        const c = document.createElement("span");
        c.className = r.p < 0.05 ? "is-sig" : "";
        c.title = "p = " + fmtP(r.p);
        grid.append(c);
      });
    }
    render();
  }

  window.ABTest = { mount, pValue };
})();
