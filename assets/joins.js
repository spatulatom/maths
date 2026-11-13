/*
 * Join explorer: two small tables, the six Power Query join kinds, a Venn diagram of
 * which rows survive, and the result table. Optional total of one column, which shows
 * how duplicate keys multiply rows (double counting).
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/joins.css">
 *   <div id="jn"></div>
 *   <script src="../assets/joins.js"></script>
 *   <script>
 *     Joins.mount(document.getElementById("jn"), {
 *       presets: [{
 *         name: "Customers and orders",
 *         left:  { name: "Orders", key: "CustID", cols: ["OrderID", "CustID", "Amount"], rows: [[1, "C1", 40]] },
 *         right: { name: "Customers", key: "CustID", cols: ["CustID", "Name"], rows: [["C1", "Ana"]] },
 *       }],
 *       kinds: ["Left outer", "Right outer", "Full outer", "Inner", "Left anti", "Right anti"],
 *       kind: "Left outer",
 *       sumCol: "Amount",        // optional: show the total of this column in the result
 *     });
 *   </script>
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";
  const KINDS = {
    "Left outer": { l: true, both: true, r: false, text: "All rows from the left table, plus matching details from the right. No match → nulls." },
    "Right outer": { l: false, both: true, r: true, text: "All rows from the right table, plus matching details from the left." },
    "Full outer": { l: true, both: true, r: true, text: "Every row from both tables, matched where possible." },
    "Inner": { l: false, both: true, r: false, text: "Only rows whose key appears in both tables." },
    "Left anti": { l: true, both: false, r: false, text: "Only left rows with no match on the right. Great for finding gaps." },
    "Right anti": { l: false, both: false, r: true, text: "Only right rows with no match on the left." },
  };

  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  }
  function cell(v) {
    return v === null || v === undefined ? `<td class="jn-null">null</td>` : `<td>${v}</td>`;
  }

  function join(left, right, kind) {
    const k = KINDS[kind];
    const li = left.cols.indexOf(left.key), ri = right.cols.indexOf(right.key);
    const rows = [];
    const rightMatched = new Set();
    const nullR = right.cols.map(() => null), nullL = left.cols.map(() => null);
    left.rows.forEach((lr) => {
      const matches = right.rows.filter((rr) => rr[ri] === lr[li]);
      matches.forEach((rr) => rightMatched.add(rr));
      if (matches.length && k.both) matches.forEach((rr) => rows.push({ cells: [...lr, ...rr], zone: "both" }));
      if (!matches.length && k.l) rows.push({ cells: [...lr, ...nullR], zone: "l" });
    });
    if (k.r) right.rows.forEach((rr) => {
      if (!rightMatched.has(rr)) rows.push({ cells: [...nullL, ...rr], zone: "r" });
    });
    // Anti joins keep only one table's columns, as Power Query shows after expanding nothing.
    if (kind === "Left anti") return { cols: left.cols.map((c) => ({ c, side: "l" })), rows: rows.map((r) => ({ cells: r.cells.slice(0, left.cols.length), zone: r.zone })) };
    if (kind === "Right anti") return { cols: right.cols.map((c) => ({ c, side: "r" })), rows: rows.map((r) => ({ cells: r.cells.slice(left.cols.length), zone: r.zone })) };
    return { cols: [...left.cols.map((c) => ({ c, side: "l" })), ...right.cols.map((c) => ({ c, side: "r" }))], rows };
  }

  function mount(root, config) {
    const opts = Object.assign({ presets: [], kinds: Object.keys(KINDS), kind: "Left outer", sumCol: null }, config);
    root.classList.add("joins");
    let preset = opts.presets[0], kind = opts.kind;

    const top = document.createElement("div");
    top.className = "jn-bar";
    if (opts.presets.length > 1) {
      const pre = document.createElement("div");
      pre.className = "jn-presets";
      const pb = opts.presets.map((p) => {
        const b = button(p.name, () => { preset = p; pb.forEach((o) => o.classList.toggle("is-active", o === b)); render(); });
        b.classList.toggle("is-active", p === preset);
        pre.append(b);
        return b;
      });
      top.append(pre);
    }
    const kindBar = document.createElement("div");
    kindBar.className = "jn-kinds";
    const kb = opts.kinds.map((name) => {
      const b = button(name, () => { kind = name; kb.forEach((o) => o.classList.toggle("is-active", o === b)); render(); });
      b.classList.toggle("is-active", name === kind);
      kindBar.append(b);
      return b;
    });
    top.append(kindBar);

    const sources = document.createElement("div");
    sources.className = "jn-sources";
    const mid = document.createElement("div");
    mid.className = "jn-mid";
    const venn = svgEl("svg", { viewBox: "0 0 220 126", class: "jn-venn", role: "img" });
    const desc = document.createElement("p");
    desc.className = "jn-desc";
    mid.append(venn, desc);
    const result = document.createElement("div");
    result.className = "jn-result";
    root.append(top, sources, mid, result);

    function button(text, fn) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = text;
      b.addEventListener("click", fn);
      return b;
    }

    // Duplicates are only flagged in the right (lookup) table; repeats on the left are normal.
    function srcTable(t, other, flagDups) {
      const ki = t.cols.indexOf(t.key), oi = other.cols.indexOf(other.key);
      const keys = new Set(other.rows.map((r) => r[oi]));
      const counts = {};
      t.rows.forEach((r) => { counts[r[ki]] = (counts[r[ki]] || 0) + 1; });
      let h = `<div class="jn-src"><p class="jn-title">${t.name}</p><div class="table-wrap"><table><tr>`;
      h += t.cols.map((c) => `<th>${c === t.key ? "🔑 " + c : c}</th>`).join("") + `</tr>`;
      t.rows.forEach((r) => {
        const matched = keys.has(r[ki]);
        const dup = flagDups && counts[r[ki]] > 1;
        h += `<tr class="${matched ? "is-match" : "is-orphan"}${dup ? " is-dup" : ""}">` + r.map(cell).join("") + `</tr>`;
      });
      return h + `</table></div></div>`;
    }

    function render() {
      const { left, right } = preset;
      sources.innerHTML = srcTable(left, right, false) + srcTable(right, left, true);

      const k = KINDS[kind];
      venn.replaceChildren();
      const defs = svgEl("defs", {});
      const cp = svgEl("clipPath", { id: "jn-clip-" + root.id });
      cp.append(svgEl("circle", { cx: 85, cy: 74, r: 48 }));
      defs.append(cp);
      venn.append(defs);
      venn.append(svgEl("circle", { cx: 85, cy: 74, r: 48, class: k.l ? "jn-on" : "jn-off" }));
      venn.append(svgEl("circle", { cx: 135, cy: 74, r: 48, class: k.r ? "jn-on" : "jn-off" }));
      const clip = `url(#jn-clip-${root.id})`;
      venn.append(svgEl("circle", { cx: 135, cy: 74, r: 48, class: "jn-off", "clip-path": clip }));
      if (k.both) venn.append(svgEl("circle", { cx: 135, cy: 74, r: 48, class: "jn-on", "clip-path": clip }));
      venn.append(svgEl("circle", { cx: 85, cy: 74, r: 48, class: "jn-edge" }));
      venn.append(svgEl("circle", { cx: 135, cy: 74, r: 48, class: "jn-edge" }));
      const tl = svgEl("text", { x: 70, y: 16, class: "jn-vlabel", "text-anchor": "middle" }); tl.textContent = left.name;
      const tr = svgEl("text", { x: 150, y: 16, class: "jn-vlabel", "text-anchor": "middle" }); tr.textContent = right.name;
      venn.append(tl, tr);
      desc.innerHTML = `<b>${kind}</b> (${left.name} on the left): ${k.text}`;

      const res = join(left, right, kind);
      let h = `<p class="jn-title">Result: ${res.rows.length} row${res.rows.length === 1 ? "" : "s"}`;
      if (opts.sumCol) {
        const idx = res.cols.findIndex((c) => c.c === opts.sumCol);
        if (idx >= 0) {
          const total = res.rows.reduce((a, r) => a + (typeof r.cells[idx] === "number" ? r.cells[idx] : 0), 0);
          const base = [left, right].find((t) => t.cols.includes(opts.sumCol));
          const ci = base.cols.indexOf(opts.sumCol);
          const truth = base.rows.reduce((a, r) => a + (typeof r[ci] === "number" ? r[ci] : 0), 0);
          h += ` · total ${opts.sumCol} = <b class="${total > truth ? "jn-bad" : ""}">${total.toLocaleString("en-GB")}</b>` +
            (total > truth ? ` <span class="jn-bad">(the ${base.name} table only adds up to ${truth.toLocaleString("en-GB")}: rows were duplicated)</span>` : "");
        }
      }
      h += `</p><div class="table-wrap"><table><tr>` + res.cols.map((c) => `<th class="jn-${c.side}">${c.c}</th>`).join("") + `</tr>`;
      res.rows.forEach((r) => { h += `<tr class="jn-z-${r.zone}">` + r.cells.map(cell).join("") + `</tr>`; });
      if (!res.rows.length) h += `<tr><td colspan="${res.cols.length}" class="jn-null">no rows</td></tr>`;
      result.innerHTML = h + `</table></div>`;
    }
    render();
  }

  window.Joins = { mount, join };
})();
