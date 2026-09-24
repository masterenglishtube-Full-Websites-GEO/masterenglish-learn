// Renders a multiple-choice quiz from inline JSON:
//   <div class="lesson-quiz" data-quiz="key"></div>
//   <script type="application/json" id="quiz-key">[{"q":"...","o":["..."],"a":0,"e":"..."}]</script>
// Options are shuffled, each answer shows its explanation, the final score is
// saved through window.MELearner (learner.js) when present.
(function () {
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const ar = (n) => String(n).replace(/[0-9]/g, (d) => AR[d]);

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function render(box, questions, key) {
    box.innerHTML = "";
    let answered = 0, correct = 0;
    questions.forEach((q, qi) => {
      const card = document.createElement("div");
      card.className = "quiz-q";
      const text = document.createElement("p");
      text.className = "quiz-q-text";
      text.textContent = `${ar(qi + 1)}. ${q.q}`;
      const choices = document.createElement("div");
      choices.className = "quiz-choices";
      const feedback = document.createElement("p");
      feedback.className = "quiz-feedback";
      feedback.hidden = true;
      shuffle(q.o.map((label, idx) => ({ label, idx }))).forEach((opt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-choice";
        b.dir = "auto";
        b.textContent = opt.label;
        if (opt.idx === q.a) b.dataset.right = "1";
        b.addEventListener("click", () => {
          const ok = opt.idx === q.a;
          choices.querySelectorAll(".quiz-choice").forEach((c) => {
            c.disabled = true;
            if (c.dataset.right) c.classList.add("correct");
          });
          if (!ok) b.classList.add("incorrect");
          feedback.textContent = (ok ? "✓ إجابة صحيحة. " : "✗ ليست هذه. ") + (q.e || "");
          feedback.hidden = false;
          feedback.classList.add("show");
          answered++;
          if (ok) correct++;
          if (answered === questions.length) finish(box, questions, key, correct);
        });
        choices.appendChild(b);
      });
      card.append(text, choices, feedback);
      box.appendChild(card);
    });
  }

  function finish(box, questions, key, score) {
    const total = questions.length;
    // Saved under the page path so the learner dashboard can show the page title.
    if (window.MELearner) window.MELearner.recordQuiz(location.pathname + (key === "main" ? "" : "#" + key), score, total);
    const result = document.createElement("div");
    result.className = "quiz-result";
    const msg = score === total ? "ممتاز! أتقنت هذا الدرس." :
      score >= Math.ceil(total * 0.6) ? "أحسنت! راجع الأسئلة التي أخطأت فيها ثم أعد المحاولة." :
      "راجع الدرس مرة أخرى ثم جرّب من جديد، التكرار هو ما يثبّت المعلومة.";
    result.innerHTML = `<strong></strong><p style="margin:0;"></p><div class="quiz-actions"></div>`;
    result.querySelector("strong").textContent = `نتيجتك: ${ar(score)} من ${ar(total)}`;
    result.querySelector("p").textContent = msg;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-ghost";
    retry.textContent = "أعد الاختبار";
    retry.addEventListener("click", () => { render(box, questions, key); box.scrollIntoView({ behavior: "smooth", block: "start" }); });
    const mine = document.createElement("a");
    mine.className = "btn btn-outline";
    mine.href = (/\/(articles|paths|topics|lessons|guides)\//.test(location.pathname) ? "../" : "") + "my-learning.html";
    mine.textContent = "تقدّمي في التعلم";
    result.querySelector(".quiz-actions").append(retry, mine);
    box.appendChild(result);
  }

  function init() {
    document.querySelectorAll("[data-quiz]").forEach((box) => {
      const key = box.dataset.quiz;
      const data = document.getElementById("quiz-" + key);
      if (!data) return;
      try { render(box, JSON.parse(data.textContent), key); } catch (e) { box.hidden = true; }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
