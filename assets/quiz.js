/*
 * Reusable multiple-choice quiz with instant feedback.
 *
 * Usage:
 *   <link rel="stylesheet" href="../assets/quiz.css">
 *   <div id="quiz"></div>
 *   <script src="../assets/quiz.js"></script>
 *   <script>
 *     Quiz.mount(document.getElementById("quiz"), {
 *       id: "0001-diagnostic",          // used for the saved-progress key and the results text
 *       allowUnsure: true,              // adds a "Not sure" button (honest answers beat guesses)
 *       questions: [
 *         { topic: "Percentages", q: "15% of 80?", options: ["10","12","15","18"], answer: 1,
 *           explain: "0.15 × 80 = 12" },
 *       ],
 *     });
 *   </script>
 */
(function () {
  const UNSURE = -1;

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach((c) => node.append(c));
    return node;
  }

  function mount(root, config) {
    const key = "quiz:" + config.id;
    const answers = storageGet(key) || {};
    const summary = el("div", { class: "quiz-summary" });

    config.questions.forEach((item, qi) => {
      const feedback = el("div", { class: "quiz-feedback", "aria-live": "polite" });
      const buttons = item.options.map((opt, oi) =>
        el("button", { class: "quiz-option", type: "button", html: opt, onclick: () => choose(oi) })
      );
      const unsure = config.allowUnsure
        ? el("button", { class: "quiz-unsure", type: "button", onclick: () => choose(UNSURE) }, ["Not sure"])
        : null;

      const card = el("section", { class: "quiz-q" }, [
        el("div", { class: "quiz-num" }, [`Question ${qi + 1} of ${config.questions.length} · ${item.topic}`]),
        el("div", { class: "quiz-prompt", html: item.q }),
        el("div", { class: item.options.some((o) => o.length > 18) ? "quiz-options is-long" : "quiz-options" }, buttons),
        ...(unsure ? [el("div", { class: "quiz-actions" }, [unsure])] : []),
        feedback,
      ]);
      root.append(card);

      function render(choice) {
        buttons.forEach((b, oi) => {
          b.disabled = true;
          if (oi === item.answer) b.classList.add("is-correct");
          if (oi === choice && choice !== item.answer) b.classList.add("is-wrong");
        });
        if (unsure) unsure.disabled = true;
        const verdict = choice === item.answer ? "Correct." : choice === UNSURE ? "No problem, here's how it works." : "Not quite.";
        const cls = choice === item.answer ? "good" : "bad";
        feedback.innerHTML = `<strong class="${cls}">${verdict}</strong> ${item.explain}`;
      }

      function choose(choice) {
        if (qi in answers) return;
        answers[qi] = choice;
        storageSet(key, answers);
        render(choice);
        updateSummary();
      }

      if (qi in answers) render(answers[qi]);
    });

    root.append(summary);
    updateSummary();

    function updateSummary() {
      const done = Object.keys(answers).length;
      const total = config.questions.length;
      if (done < total) {
        summary.innerHTML = `<p class="small">${done} of ${total} answered. Your results appear here when you finish.</p>`;
        return;
      }
      const byTopic = {};
      config.questions.forEach((item, qi) => {
        const t = (byTopic[item.topic] ||= { right: 0, total: 0, unsure: 0 });
        t.total++;
        if (answers[qi] === item.answer) t.right++;
        if (answers[qi] === UNSURE) t.unsure++;
      });
      const right = Object.values(byTopic).reduce((s, t) => s + t.right, 0);
      const rows = Object.entries(byTopic)
        .map(([name, t]) => `<tr><td>${name}</td><td>${t.right} / ${t.total}</td><td>${t.unsure || ""}</td></tr>`)
        .join("");
      const missed = config.questions
        .map((item, qi) => (answers[qi] === item.answer ? null : `Q${qi + 1}${answers[qi] === UNSURE ? " (not sure)" : ""}`))
        .filter(Boolean);
      const text =
        `Quiz ${config.id}: ${right}/${total} correct.\n` +
        Object.entries(byTopic).map(([n, t]) => `- ${n}: ${t.right}/${t.total}${t.unsure ? `, ${t.unsure} not sure` : ""}`).join("\n") +
        (missed.length ? `\nMissed: ${missed.join(", ")}` : "");

      summary.innerHTML = `
        <h3>Your results: ${right} / ${total}</h3>
        <table><thead><tr><th>Topic</th><th>Correct</th><th>Not sure</th></tr></thead><tbody>${rows}</tbody></table>
        <p>Copy this and paste it into the chat with your teacher (Claude):</p>
        <pre class="quiz-results-text"></pre>`;
      summary.querySelector("pre").textContent = text;
      const copy = el("button", { class: "quiz-option", type: "button" }, ["Copy results"]);
      copy.onclick = () => {
        const selectText = () => {
          const range = document.createRange();
          range.selectNodeContents(summary.querySelector("pre"));
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          copy.textContent = "Selected: copy it manually";
        };
        if (!navigator.clipboard) return selectText();
        navigator.clipboard.writeText(text).then(() => (copy.textContent = "Copied ✓"), selectText);
      };
      const reset = el("button", { class: "quiz-unsure", type: "button" }, ["Retake quiz"]);
      reset.onclick = () => { storageSet(key, {}); location.reload(); };
      summary.append(el("div", { class: "quiz-actions" }, [copy, reset]));
    }
  }

  window.Quiz = { mount };
})();
