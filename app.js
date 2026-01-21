document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ app.js loaded");

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ===== sections =====
  const sections = {
    hero: $("#hero"),
    quiz: $("#quiz"),
    result: $("#result"),
  };

  function showOnly(key) {
    Object.entries(sections).forEach(([k, el]) => {
      if (!el) return;
      el.classList.toggle("hidden", k !== key);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ===== quiz DOM refs =====
  const qPrompt = $("#qPrompt");
  const optionsWrap = $("#options");
  const bar = $("#bar");
  const meta = $("#meta");

  const startBtn = $("#startBtn");
  const previewBtn = $("#previewBtn");

  const backBtn = $("#backBtn");
  const exitBtn = $("#exitBtn");
  const nextBtn = $("#nextBtn");
  const resetBtn = $("#resetBtn");

  const restartBtn = $("#restartBtn");
  const copyBtn = $("#copyBtn");
  const letterEl = $(".letter");

  // ===== state =====
  let QUESTIONS = [];
  let idx = 0;
  let selectedKey = null;

  // answers: { [questionId]: { key, tags, text } }
  const answers = {};

  // ===== helpers =====
  function safeText(s) {
    return String(s ?? "");
  }

  function setProgress() {
    const total = QUESTIONS.length || 1;
    const current = Math.min(idx + 1, total);
    const pct = Math.round((current / total) * 100);

    if (bar) bar.style.width = `${pct}%`;
    if (meta) meta.textContent = `${current} / ${total}`;
  }

  function setNextEnabled(enabled) {
    if (!nextBtn) return;
    nextBtn.disabled = !enabled;
  }

  function renderQuestion() {
    if (!QUESTIONS.length) return;

    const q = QUESTIONS[idx];
    selectedKey = answers[q.id]?.key ?? null;

    setProgress();
    setNextEnabled(!!selectedKey);

    if (qPrompt) qPrompt.textContent = safeText(q.text);

    // build options
    if (!optionsWrap) return;
    optionsWrap.innerHTML = "";

    (q.options || []).forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt" + (selectedKey === opt.key ? " selected" : "");
      btn.innerHTML = `
        <span class="pillKey">${safeText(opt.key || String.fromCharCode(65 + i))}</span>
        <span>${safeText(opt.text)}</span>
      `;

      btn.addEventListener("click", () => {
        // select UI
        $$(".opt").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");

        selectedKey = opt.key;
        setNextEnabled(true);
      });

      optionsWrap.appendChild(btn);
    });
  }

  function saveCurrentAnswer() {
    const q = QUESTIONS[idx];
    if (!q || !selectedKey) return false;

    const chosen = (q.options || []).find((o) => o.key === selectedKey);
    if (!chosen) return false;

    answers[q.id] = {
      key: chosen.key,
      text: chosen.text,
      tags: Array.isArray(chosen.tags) ? chosen.tags : [],
    };
    return true;
  }

  function countTags() {
    const counts = {};
    Object.values(answers).forEach((a) => {
      (a.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }

  function pickTop(counts, prefix = null, topN = 3) {
    let entries = Object.entries(counts);
    if (prefix) entries = entries.filter(([k]) => k.startsWith(prefix));
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, topN);
  }

  function humanizeTag(tag) {
    const map = {
      // love language
      ll_words: "Words of affirmation",
      ll_time: "Quality time",
      ll_acts: "Acts of service",
      ll_touch: "Physical touch",
      ll_gifts: "Receiving gifts",

      // attachment (contoh)
      att_secure: "Secure leaning",
      att_anxious: "Anxious leaning",
      att_avoidant: "Avoidant leaning",

      // contoh tambahan (biar nggak kosong)
      mbti_i: "Introvert energy",
      mbti_e: "Extrovert energy",
      disc_s: "Steady warmth",
      disc_i: "Expressive spark",
      disc_c: "Careful clarity",
      disc_d: "Direct drive",

      // color vibes
      color_red: "Red warmth",
      color_blue: "Blue calm",
      color_gold: "Gold steadiness",
      color_purple: "Purple depth",
    };
    return map[tag] || tag.replaceAll("_", " ");
  }

  function buildResultHTML() {
    const total = QUESTIONS.length || 1;
    const answered = Object.keys(answers).length;

    const counts = countTags();

    const topAny = pickTop(counts, null, 6);
    const topLL = pickTop(counts, "ll_", 1)[0];
    const topATT = pickTop(counts, "att_", 1)[0];

    const llText = topLL ? humanizeTag(topLL[0]) : "—";
    const attText = topATT ? humanizeTag(topATT[0]) : "—";

    // nada lembut: bukan label, hanya kecenderungan yang sering muncul
    const vibeLines = topAny.slice(0, 4).map(([t, c]) => {
      return `<li><b>${humanizeTag(t)}</b> <span class="soft">(${c})</span></li>`;
    }).join("");

    return `
      <p><b>A gentle snapshot — not a verdict.</b></p>
      <p class="soft">You answered <b>${answered}</b> of <b>${total}</b> questions.</p>

      <p>
        <b>Most present love-signal:</b> ${llText}<br/>
        <b>Safety tendency:</b> ${attText}
      </p>

      <p class="soft">
        If this feels close to you, let it be a mirror — not a sentence.
        You can always change, soften, and learn new ways to stay connected.
      </p>

      <div style="margin-top:10px;">
        <div class="qLabel">Your strongest themes</div>
        <ul style="margin:8px 0 0; padding-left:18px; line-height:1.7;">
          ${vibeLines || "<li class='soft'>Not enough data yet.</li>"}
        </ul>
      </div>
    `;
  }

  function finishQuiz() {
    if (letterEl) letterEl.innerHTML = buildResultHTML();
    showOnly("result");
  }

  // ===== load JSON =====
  async function loadQuestions() {
    try {
      // IMPORTANT: question.json harus 1 folder dengan index.html
      const res = await fetch("./question.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (!Array.isArray(json)) throw new Error("question.json harus berupa ARRAY");
      if (!json.length) throw new Error("question.json kosong");

      QUESTIONS = json;
      console.log(`✅ Loaded questions: ${QUESTIONS.length}`);

      // init quiz view (tapi tetap start dari Hero)
      idx = 0;
      renderQuestion();
      setProgress();
      setNextEnabled(false);
    } catch (err) {
      console.error("❌ Failed to load question.json:", err);

      // tampilkan pesan lembut di hero biar user tau
      const micro = $(".micro");
      if (micro) {
        micro.textContent =
          "I can’t read question.json yet. Check file path & run with Preview/Live Server (not file://).";
      }
    }
  }

  // ===== wire UI =====

  // nav chips
  $$("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => showOnly(btn.dataset.go));
  });

  // CTA
  startBtn?.addEventListener("click", () => {
    // pastikan question sudah render sebelum show quiz
    if (!QUESTIONS.length) {
      console.warn("⚠️ Questions not loaded yet.");
    }
    showOnly("quiz");
  });

  previewBtn?.addEventListener("click", () => {
    // preview result dari jawaban yang ada (boleh kosong)
    if (letterEl) letterEl.innerHTML = buildResultHTML();
    showOnly("result");
  });

  // Quiz actions
  backBtn?.addEventListener("click", () => {
    if (idx > 0) {
      // simpan kalau ada pilihan
      if (selectedKey) saveCurrentAnswer();
      idx--;
      renderQuestion();
    } else {
      showOnly("hero");
    }
  });

  exitBtn?.addEventListener("click", () => {
    showOnly("hero");
  });

  resetBtn?.addEventListener("click", () => {
    const q = QUESTIONS[idx];
    if (q) delete answers[q.id];
    selectedKey = null;
    renderQuestion();
    setNextEnabled(false);
  });

  nextBtn?.addEventListener("click", () => {
    // jangan lanjut kalau belum pilih
    if (!selectedKey) return;

    const ok = saveCurrentAnswer();
    if (!ok) return;

    if (idx < QUESTIONS.length - 1) {
      idx++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  });

  // Result actions
  restartBtn?.addEventListener("click", () => {
    // reset state
    idx = 0;
    selectedKey = null;
    Object.keys(answers).forEach((k) => delete answers[k]);
    renderQuestion();
    showOnly("hero");
  });

  copyBtn?.addEventListener("click", async () => {
    const text = letterEl?.innerText?.trim() || "";
    try {
      await navigator.clipboard.writeText(text);
      const old = copyBtn.textContent;
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => (copyBtn.textContent = old), 1200);
    } catch {
      alert("Copy failed. Please copy manually.");
    }
  });

  // ===== start =====
  showOnly("hero");
  loadQuestions();
});
