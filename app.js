/* Nid des Âmes — app.js (no framework)
   Loads question.json, renders quiz, computes gentle result from tags.
*/

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const views = {
  home: $("#view-home"),
  test: $("#view-test"),
  result: $("#view-result"),
};

const navButtons = $$("[data-nav]");

function showView(key) {
  Object.entries(views).forEach(([k, el]) => {
    el.classList.toggle("is-active", k === key);
  });

  navButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.nav === key));

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===== Elements ===== */
const btnEnter = $("#btn-enter");
const btnPreview = $("#btn-preview");

const qText = $("#qText");
const qOptions = $("#qOptions");
const progressText = $("#progressText");
const progressFill = $("#progressFill");

const btnBack = $("#btn-back");
const btnNext = $("#btn-next");

const btnRestart = $("#btn-restart");
const resultSummary = $("#resultSummary");
const resultTags = $("#resultTags");

/* ===== State ===== */
let QUESTIONS = [];
let idx = 0;
let answers = []; // store selected option object per question
let selectedKey = null;
let loaded = false;

/* ===== Helpers ===== */
function isFileProtocol() {
  return window.location.protocol === "file:";
}

function friendlyError(msg) {
  qText.textContent = msg;
  qOptions.innerHTML = "";
  btnBack.disabled = true;
  btnNext.disabled = true;
  progressText.textContent = "0 / 0";
  progressFill.style.width = "0%";
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function setProgress(current, total) {
  progressText.textContent = `${current} / ${total}`;
  const pct = total ? (current / total) * 100 : 0;
  progressFill.style.width = `${clamp(pct, 0, 100)}%`;
}

/* ===== Load JSON ===== */
async function loadQuestions() {
  if (loaded) return true;

  if (isFileProtocol()) {
    // This is the #1 cause of "Failed to fetch"
    friendlyError(
      "JSON tidak bisa diload kalau masih buka file langsung (file://). Jalankan pakai Live Server (VSCode) ya."
    );
    return false;
  }

  try {
    const res = await fetch("./question.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      throw new Error("Format JSON harus array of questions.");
    }

    // basic validation
    const ok = data.every((q) => q && q.text && Array.isArray(q.options) && q.options.length);
    if (!ok) throw new Error("Ada item question yang strukturnya tidak sesuai (text/options).");

    QUESTIONS = data;
    answers = new Array(QUESTIONS.length).fill(null);
    idx = 0;
    selectedKey = null;
    loaded = true;

    return true;
  } catch (err) {
    console.error(err);
    friendlyError(
      "Gagal load question.json. Pastikan file-nya satu folder dengan index.html, dan jalankan via Live Server."
    );
    return false;
  }
}

/* ===== Render Quiz ===== */
function renderQuestion() {
  const total = QUESTIONS.length;
  const q = QUESTIONS[idx];

  // restore if already answered
  const prev = answers[idx];
  selectedKey = prev?.key || null;

  qText.textContent = q.text;
  qOptions.innerHTML = "";

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "optBtn";
    btn.dataset.key = opt.key;

    // label: "A — text"
    btn.innerHTML = `
      <span class="optKey">${opt.key}</span>
      <span class="optText">${opt.text}</span>
    `;

    if (selectedKey === opt.key) btn.classList.add("is-selected");

    btn.addEventListener("click", () => {
      // select single
      selectedKey = opt.key;
      qOptions.querySelectorAll(".optBtn").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");

      // store answer
      answers[idx] = opt;

      // enable next
      btnNext.disabled = false;
    });

    qOptions.appendChild(btn);
  });

  setProgress(idx + 1, total);

  // nav buttons state
  btnBack.disabled = idx === 0;
  btnNext.disabled = !answers[idx]; // must pick first
  btnNext.textContent = idx === total - 1 ? "Finish" : "Next";
}

/* ===== Compute Result from Tags ===== */
const TAG_META = {
  // Attachment
  att_secure:   { label: "Secure", group: "Attachment", blurb: "kamu cenderung tenang saat dekat; aman tanpa harus menguasai." },
  att_anxious:  { label: "Anxious", group: "Attachment", blurb: "kamu peka pada jarak; butuh kepastian saat sinyal berubah." },
  att_avoidant: { label: "Avoidant", group: "Attachment", blurb: "kamu menjaga ruang diri; dekat, tapi tetap butuh napas." },

  // Love Language
  ll_words: { label: "Words", group: "Love Language", blurb: "kata-kata yang hangat bisa jadi rumah." },
  ll_time:  { label: "Time",  group: "Love Language", blurb: "hadir dan ditemani terasa seperti cinta." },
  ll_acts:  { label: "Acts",  group: "Love Language", blurb: "tindakan kecil yang konsisten terasa paling nyata." },
  ll_touch: { label: "Touch", group: "Love Language", blurb: "kehangatan fisik menenangkan sistemmu." },
  ll_gifts: { label: "Gifts", group: "Love Language", blurb: "simbol kecil bisa menyimpan makna besar." },

  // Conflict
  conf_fighter:  { label: "Fighter",  group: "Conflict", blurb: "kamu bergerak cepat saat ada masalah—ingin selesai, bukan menggantung." },
  conf_freezer:  { label: "Freezer",  group: "Conflict", blurb: "kamu bisa diam saat tegang—bukan menyerah, tapi menahan diri." },
  conf_pleaser:  { label: "Pleaser",  group: "Conflict", blurb: "kamu cenderung merapikan suasana—kadang mengorbankan kebutuhanmu." },
  conf_analyzer: { label: "Analyzer", group: "Conflict", blurb: "kamu perlu memahami dulu sebelum merespons." },
  conf_echo:     { label: "Echo",     group: "Conflict", blurb: "kamu menangkap nada & perubahan halus; sering ‘membaca’ sebelum bicara." },

  // Emotion regulation
  emo_soothe:    { label: "Soothe",    group: "Regulation", blurb: "kamu pandai menenangkan diri lewat cara yang lembut." },
  emo_reframe:   { label: "Reframe",   group: "Regulation", blurb: "kamu bisa melihat ulang makna; mencari sudut pandang yang lebih aman." },
  emo_suppress:  { label: "Suppress",  group: "Regulation", blurb: "kamu kuat menahan; tapi kadang tubuh tetap menyimpan." },

  // Processing
  proc_micro:    { label: "Micro",   group: "Processing", blurb: "kamu peka detail; hal kecil terasa berarti." },
  proc_global:   { label: "Global",  group: "Processing", blurb: "kamu melihat gambaran besar; mencari pola dari keseluruhan." },

  // DISC
  disc_d: { label: "D", group: "DISC", blurb: "tegas, langsung, suka keputusan." },
  disc_i: { label: "I", group: "DISC", blurb: "hangat, ekspresif, mudah membangun energi." },
  disc_s: { label: "S", group: "DISC", blurb: "tenang, stabil, loyal pada ritme." },
  disc_c: { label: "C", group: "DISC", blurb: "rapi, akurat, hati-hati sebelum melangkah." },

  // MBTI letters
  mbti_e: { label: "E", group: "MBTI", blurb: "energi dari interaksi." },
  mbti_i: { label: "I", group: "MBTI", blurb: "energi dari ruang tenang." },
  mbti_s: { label: "S", group: "MBTI", blurb: "nyata, konkret, grounded." },
  mbti_n: { label: "N", group: "MBTI", blurb: "imajinatif, pola, makna." },
  mbti_t: { label: "T", group: "MBTI", blurb: "logis, konsisten, prinsip." },
  mbti_f: { label: "F", group: "MBTI", blurb: "empatik, nilai, rasa." },
  mbti_j: { label: "J", group: "MBTI", blurb: "terstruktur, jelas, rapi." },
  mbti_p: { label: "P", group: "MBTI", blurb: "fleksibel, terbuka, mengalir." },

  // Colors
  color_blue: { label: "Blue", group: "Color", blurb: "tenang, jernih, aman." },
  color_gold: { label: "Gold", group: "Color", blurb: "hangat, setia, memberi." },
  color_red:  { label: "Red",  group: "Color", blurb: "berani, intens, jujur." },
};

const GROUP_ORDER = ["Attachment", "Love Language", "Conflict", "Regulation", "Processing", "DISC", "MBTI", "Color"];

function countTagsFromAnswers() {
  const counts = new Map();

  answers.forEach((opt) => {
    if (!opt?.tags) return;
    opt.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
  });

  return counts;
}

function pickTopByGroup(counts) {
  // group -> [{tag, score}]
  const grouped = new Map();

  counts.forEach((score, tag) => {
    const meta = TAG_META[tag];
    if (!meta) return; // ignore unknown tags silently
    const g = meta.group;
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g).push({ tag, score });
  });

  // sort each group
  const top = [];
  GROUP_ORDER.forEach((g) => {
    const arr = grouped.get(g);
    if (!arr || !arr.length) return;
    arr.sort((a, b) => b.score - a.score);
    top.push({ group: g, ...arr[0] });
  });

  return top;
}

function renderResult() {
  // if not finished
  const total = QUESTIONS.length;
  const answered = answers.filter(Boolean).length;

  if (!total || answered < total) {
    resultSummary.textContent = "Selesaikan test dulu ya 🙂";
    resultTags.innerHTML = "";
    return;
  }

  const counts = countTagsFromAnswers();
  const top = pickTopByGroup(counts);

  // chips
  resultTags.innerHTML = "";
  top.forEach((t) => {
    const meta = TAG_META[t.tag];
    const chip = document.createElement("span");
    chip.className = "resultChip";
    chip.textContent = `${t.group}: ${meta.label}`;
    resultTags.appendChild(chip);
  });

  // gentle narrative
  const byGroup = Object.fromEntries(top.map((t) => [t.group, t.tag]));
  const lines = [];

  // Attachment + Love Language as core
  if (byGroup.Attachment) lines.push(`Di kedekatan, kamu cenderung membawa nuansa ${TAG_META[byGroup.Attachment].label.toLowerCase()}—${TAG_META[byGroup.Attachment].blurb}`);
  if (byGroup["Love Language"]) lines.push(`Cara cintamu paling sering terdengar lewat ${TAG_META[byGroup["Love Language"]].label.toLowerCase()}—${TAG_META[byGroup["Love Language"]].blurb}`);

  // Conflict + Regulation
  if (byGroup.Conflict) lines.push(`Saat ada gesekan, pola refleksmu lebih dekat ke ${TAG_META[byGroup.Conflict].label.toLowerCase()}—${TAG_META[byGroup.Conflict].blurb}`);
  if (byGroup.Regulation) lines.push(`Untuk bertahan tetap baik, sistemmu sering memilih ${TAG_META[byGroup.Regulation].label.toLowerCase()}—${TAG_META[byGroup.Regulation].blurb}`);

  // Processing / Color as mood tone
  if (byGroup.Processing) lines.push(`Kamu memproses rasa dengan cara ${TAG_META[byGroup.Processing].label.toLowerCase()}—${TAG_META[byGroup.Processing].blurb}`);
  if (byGroup.Color) lines.push(`Warna dominanmu terasa ${TAG_META[byGroup.Color].label.toLowerCase()}—${TAG_META[byGroup.Color].blurb}`);

  // close
  lines.push("Tidak ada jawaban ideal di sini. Yang ada: pola yang jujur—dan itu sudah cukup baik untuk mulai dipahami.");

  resultSummary.textContent = lines.join(" ");
}

/* ===== Flow controls ===== */
async function startQuiz() {
  showView("test");
  const ok = await loadQuestions();
  if (!ok) return;

  renderQuestion();
}

function goNext() {
  const total = QUESTIONS.length;

  // must have answer
  if (!answers[idx]) return;

  // if last -> result
  if (idx >= total - 1) {
    renderResult();
    showView("result");
    return;
  }

  idx += 1;
  renderQuestion();
}

function goBack() {
  if (idx <= 0) return;
  idx -= 1;
  renderQuestion();
}

function restartAll() {
  if (!loaded) {
    showView("home");
    return;
  }
  idx = 0;
  answers = new Array(QUESTIONS.length).fill(null);
  selectedKey = null;

  // reset UI
  renderQuestion();
  showView("home");
}

/* ===== Nav ===== */
navButtons.forEach((b) => {
  b.addEventListener("click", async () => {
    const target = b.dataset.nav;

    if (target === "test") {
      // allow entering test even before loading; it will load safely
      showView("test");
      if (!loaded) {
        const ok = await loadQuestions();
        if (ok) renderQuestion();
      }
      return;
    }

    if (target === "result") {
      showView("result");
      renderResult();
      return;
    }

    showView("home");
  });
});

/* ===== Buttons ===== */
btnEnter?.addEventListener("click", startQuiz);
btnPreview?.addEventListener("click", () => {
  showView("result");
  renderResult();
});

btnBack?.addEventListener("click", goBack);
btnNext?.addEventListener("click", goNext);

btnRestart?.addEventListener("click", () => {
  // restart -> back to home & clear progress
  if (loaded) {
    idx = 0;
    answers = new Array(QUESTIONS.length).fill(null);
    selectedKey = null;
  }
  showView("home");
});

/* ===== Boot ===== */
showView("home");
