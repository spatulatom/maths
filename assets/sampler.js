/*
 * Sampling simulator. A fixed population of customer order values (right-skewed). Draw
 * random samples of a chosen size; each sample's mean is plotted as one row. Optional
 * biased sampling (big spenders 3× as likely to be picked) and optional 95% confidence
 * intervals (mean ± 2 × SD/√n) with a tally of how many caught the true mean.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/sampler.css">
 *   <div id="sm"></div>
 *   <script src="../assets/sampler.js"></script>
 *   <script>
 *     Sampler.mount(document.getElementById("sm"), {
 *       sizes: [10, 50, 200, 1000], size: 50,
 *       showCI: false,       // draw intervals and count hits
 *       allowBias: true,     // show the "biased survey" switch
 *     });
 *   </script>
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";
  const MAX_ROWS = 20;

  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makePopulation(n, seed) {
    const r = rng(seed);
    const pop = [];
    for (let i = 0; i < n; i++) {
      const z = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
      pop.push(Math.round(Math.exp(Math.log(35) + 0.6 * z) * 100) / 100);
    }
    return pop;
  }
  const money = (v) => "£" + v.toFixed(2);

  function mount(root, config) {
    const opts = Object.assign({ sizes: [10, 50, 200, 1000], size: 50, showCI: false, allowBias: true, seed: 7 }, config);
    root.classList.add("sampler");

    const pop = makePopulation(5000, opts.seed);
    const trueMean = pop.reduce((a, b) => a + b, 0) / pop.length;
    const sorted = [...pop].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const weights = pop.map((v) => (v > median ? 3 : 1));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const cum = [];
    weights.reduce((acc, w, i) => (cum[i] = acc + w), 0);
    const draw = Math.random;

    let size = opts.size, biased = false, history = [];

    function pickIndex() {
      if (!biased) return Math.floor(draw() * pop.length);
      const t = draw() * totalW;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < t) lo = mid + 1; else hi = mid; }
      return lo;
    }
    function sample() {
      const xs = [];
      for (let i = 0; i < size; i++) xs.push(pop[pickIndex()]);
      const m = xs.reduce((a, b) => a + b, 0) / size;
      const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (size - 1));
      const moe = 2 * sd / Math.sqrt(size);
      return { n: size, mean: m, moe, hit: Math.abs(m - trueMean) <= moe, biased };
    }

    // Controls
    const ctr = document.createElement("div");
    ctr.className = "sm-controls";
    const sizeWrap = document.createElement("div");
    sizeWrap.className = "sm-sizes";
    sizeWrap.innerHTML = `<span class="sm-label">Sample size</span>`;
    const sizeBtns = opts.sizes.map((s) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = s;
      b.classList.toggle("is-active", s === size);
      b.addEventListener("click", () => {
        size = s; history = [];
        sizeBtns.forEach((o) => o.classList.toggle("is-active", o === b));
        render();
      });
      sizeWrap.append(b);
      return b;
    });
    const act = document.createElement("div");
    act.className = "sm-actions";
    const one = btn("Draw 1 sample", () => { add(1); });
    const twenty = btn("Draw 20 samples", () => { add(20); });
    const reset = btn("Clear", () => { history = []; render(); });
    reset.classList.add("sm-tool");
    act.append(one, twenty, reset);
    ctr.append(sizeWrap, act);
    if (opts.allowBias) {
      const lab = document.createElement("label");
      lab.className = "sm-bias";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.addEventListener("change", () => { biased = cb.checked; history = []; render(); });
      lab.append(cb, document.createTextNode(" Biased survey: big spenders are 3× as likely to answer"));
      ctr.append(lab);
    }

    const svg = svgEl("svg", { viewBox: "0 0 600 300", class: "sm-svg", role: "img" });
    const out = document.createElement("div");
    out.className = "sm-out";
    root.append(ctr, svg, out);

    function btn(text, fn) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = text;
      b.addEventListener("click", fn);
      return b;
    }
    function add(k) {
      for (let i = 0; i < k; i++) history.unshift(sample());
      history = history.slice(0, 200);
      render();
    }

    const L = 20, R = 580, T = 14, B = 262;
    const lo = Math.floor(trueMean - 25), hi = Math.ceil(trueMean + 25);
    const x = (v) => L + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (R - L);

    function render() {
      svg.replaceChildren();
      svg.append(svgEl("rect", { x: L, y: T, width: R - L, height: B - T, class: "sm-plot" }));
      for (let v = Math.ceil(lo / 5) * 5; v <= hi; v += 5) {
        svg.append(svgEl("line", { x1: x(v), x2: x(v), y1: T, y2: B, class: "sm-grid" }));
        const t = svgEl("text", { x: x(v), y: B + 16, class: "sm-tick", "text-anchor": "middle" });
        t.textContent = "£" + v;
        svg.append(t);
      }
      const cap = svgEl("text", { x: (L + R) / 2, y: B + 34, class: "sm-axis", "text-anchor": "middle" });
      cap.textContent = "Average order value found by each sample (newest at top)";
      svg.append(cap);

      const rows = history.slice(0, MAX_ROWS);
      const rh = (B - T) / MAX_ROWS;
      rows.forEach((s, i) => {
        const cy = T + rh * (i + 0.5);
        if (opts.showCI) {
          svg.append(svgEl("line", { x1: x(s.mean - s.moe), x2: x(s.mean + s.moe), y1: cy, y2: cy, class: s.hit ? "sm-ci" : "sm-ci is-miss" }));
        }
        svg.append(svgEl("circle", { cx: x(s.mean), cy, r: 4.5, class: opts.showCI && !s.hit ? "sm-dot is-miss" : "sm-dot" }));
      });
      svg.append(svgEl("line", { x1: x(trueMean), x2: x(trueMean), y1: T - 6, y2: B, class: "sm-true" }));
      const tl = svgEl("text", { x: x(trueMean) + 5, y: T + 2, class: "sm-true-label" });
      tl.textContent = `True average ${money(trueMean)}`;
      svg.append(tl);

      let html = `<p class="small">Population: ${pop.length.toLocaleString("en-GB")} customers. In real life you never see the true average; here it's shown so you can check the samples.</p>`;
      if (history.length) {
        const last = history[0];
        html += `<p><b>Latest sample</b> (${last.n} customers${last.biased ? ", biased" : ""}): average ${money(last.mean)}` +
          (opts.showCI ? `, 95% interval ${money(last.mean - last.moe)} to ${money(last.mean + last.moe)} (± ${money(last.moe)})` : "") + `.</p>`;
        const ms = history.map((s) => s.mean);
        const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
        html += `<p>${history.length} samples so far. Their averages centre on <b>${money(avg)}</b>`;
        if (ms.length >= 2) {
          const sd = Math.sqrt(ms.reduce((a, v) => a + (v - avg) ** 2, 0) / (ms.length - 1));
          html += ` and typically miss it by about <b>${money(sd)}</b> (SD of the sample averages)`;
        }
        html += `.</p>`;
        if (opts.showCI) {
          const hits = history.filter((s) => s.hit).length;
          html += `<p><b>${hits} of ${history.length}</b> intervals caught the true average (${Math.round((hits / history.length) * 100)}%).</p>`;
        }
      } else {
        html += `<p>Press <b>Draw 1 sample</b> to survey ${size} random customers.</p>`;
      }
      out.innerHTML = html;
    }
    render();
  }

  window.Sampler = { mount };
})();
