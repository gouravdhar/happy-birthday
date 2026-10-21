(() => {
  const STORAGE_KEY = "riya-birthday-progress-v1";
  const CLUES = window.CLUES;
  const N = CLUES.length;

  const $ = (id) => document.getElementById(id);

  // ---------- State ----------
  // solved: how many clues have been answered (clues unlock in order)
  // viewing: index of the clue on screen; N means the finale
  const defaultState = () => ({ started: false, solved: 0, viewing: 0 });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!s) return defaultState();
      const solved = Math.min(Math.max(0, s.solved | 0), N);
      return { started: !!s.started, solved, viewing: Math.min(Math.max(0, s.viewing | 0), solved) };
    } catch {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  }

  let state = load();

  // ---------- Helpers ----------
  const normalize = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

  const isCorrect = (clue, input) => {
    const n = normalize(input);
    return n.length > 0 && clue.answers.some((a) => normalize(a) === n);
  };

  const driveId = (url) => (url.match(/\/d\/([^/?]+)/) || [])[1];
  const embedUrl = (url) => (driveId(url) ? `https://drive.google.com/file/d/${driveId(url)}/preview` : url);

  const wrongMessages = [
    "Not quite! Try again 💭",
    "Hmm, that's not it 🙈",
    "Close? Maybe not. Think again! 🤔",
    "Nope! Read the clue once more 💌",
  ];

  // ---------- Rendering ----------
  function show(screenId) {
    ["intro", "clue", "finale"].forEach((id) => ($(id).hidden = id !== screenId));
    $("journeyBtn").hidden = !state.started;
    $("progressText").textContent = `${state.solved}/${N}`;
    // Instant, not smooth: on mobile the first tap during a smooth scroll only stops the scroll
    window.scrollTo(0, 0);
  }

  function render() {
    if (!state.started) return show("intro");
    if (state.viewing >= N) return show("finale");

    const i = state.viewing;
    const clue = CLUES[i];
    const solved = i < state.solved;

    $("clueLabel").textContent = `Clue ${i + 1} of ${N}`;
    $("progressBar").style.width = `${(state.solved / N) * 100}%`;
    $("cluePanel").hidden = solved;
    $("videoPanel").hidden = !solved;

    if (solved) {
      $("fromName").textContent = `With love, from ${clue.from}`;
      const src = embedUrl(clue.video);
      if ($("videoFrame").getAttribute("src") !== src) $("videoFrame").src = src;
      $("videoLink").href = clue.video;
      $("nextBtn").textContent = i + 1 < N ? "Next clue →" : "One last thing… 💖";
    } else {
      $("videoFrame").removeAttribute("src"); // stop any playing video
      $("clueText").textContent = clue.clue;
      $("answerInput").value = "";
      $("feedback").textContent = "";
      $("feedback").className = "feedback";
    }
    show("clue");
  }

  function renderJourney() {
    const list = $("journeyList");
    list.innerHTML = "";
    CLUES.forEach((clue, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      const done = i < state.solved;
      const current = i === state.solved;
      if (done) li.className = "done";
      if (current) li.className = "current";
      btn.disabled = !done && !current;
      btn.innerHTML = `<span class="num">${i + 1}</span><span></span>`;
      btn.lastChild.textContent = done ? clue.from : current ? "Current clue" : "🔒 Locked";
      btn.onclick = () => goTo(i);
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function goTo(i) {
    state.viewing = i;
    save();
    closeDrawer();
    render();
  }

  const openDrawer = () => { renderJourney(); $("drawer").hidden = false; };
  const closeDrawer = () => { $("drawer").hidden = true; };

  // ---------- Events ----------
  $("introText").textContent = window.INTRO;
  $("finaleText").textContent = window.FINALE;

  $("startBtn").onclick = () => {
    state.started = true;
    state.viewing = Math.min(state.solved, N);
    save();
    render();
  };

  $("answerForm").onsubmit = (e) => {
    e.preventDefault();
    const i = state.viewing;
    const input = $("answerInput");
    if (isCorrect(CLUES[i], input.value)) {
      state.solved = Math.max(state.solved, i + 1);
      save();
      input.blur();
      confetti();
      render();
    } else {
      const fb = $("feedback");
      fb.textContent = wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
      fb.className = "feedback err";
      input.classList.remove("shake");
      void input.offsetWidth; // restart animation
      input.classList.add("shake");
    }
  };

  $("nextBtn").onclick = () => {
    state.viewing += 1;
    save();
    if (state.viewing >= N) confetti(true);
    render();
  };

  $("journeyBtn").onclick = openDrawer;
  $("rewatchBtn").onclick = openDrawer;
  $("closeDrawer").onclick = closeDrawer;
  $("drawer").onclick = (e) => { if (e.target.id === "drawer") closeDrawer(); };

  $("resetBtn").onclick = () => {
    if (!confirm("Reset all progress? Every clue will be locked again.")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
    state = defaultState();
    $("videoFrame").removeAttribute("src");
    closeDrawer();
    render();
  };

  // ---------- Confetti ----------
  const canvas = $("confetti");
  const ctx = canvas.getContext("2d");
  let pieces = [];
  let animating = false;

  function confetti(big = false) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#e8558f", "#f6c453", "#ffffff", "#b388ff", "#ff8fb1"];
    const count = big ? 260 : 140;
    for (let k = 0; k < count; k++) {
      pieces.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * 80,
        y: innerHeight * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 7 + 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[k % colors.length],
        life: 0,
      });
    }
    if (!animating) { animating = true; canvas.style.display = "block"; requestAnimationFrame(tick); }
  }

  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pieces = pieces.filter((p) => p.y < innerHeight + 20 && p.life < 300);
    for (const p of pieces) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (pieces.length) requestAnimationFrame(tick);
    else {
      // Remove the canvas entirely when idle so it can never sit over the video iframe
      animating = false;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      canvas.style.display = "none";
    }
  }

  render();
})();
