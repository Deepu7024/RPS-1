import { MindReader, NAMES, EMOJI } from "./ai.js";
import { Sound } from "./audio.js";
import { createHandTracker, classifyHand, drawSkeleton } from "./vision.js";

const $ = (id) => document.getElementById(id);

const video = $("video");
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

const bootScreen = $("boot-screen");
const bootText = $("boot-text");

const countEl = $("countdown");
const duelEl = $("duel-display");
const verdictEl = $("verdict");
const subStatusEl = $("sub-status");

const gYou = $("g-you");
const gAi = $("g-ai");

const liveTrackerEl = $("live-tracker");
const liveText = $("live-text");

const meterFill = $("meter-fill");
const meterLabel = $("meter-label");
const modelReason = $("model-reason");
const brainPill = $("brain-pill");
const streakPill = $("streak-pill");

const historyEl = $("history");
const sparkChart = $("spark-chart");
const sctx = sparkChart.getContext("2d");

const confettiCanvas = $("confetti-canvas");
const cctx = confettiCanvas.getContext("2d");

const brain = new MindReader();
let landmarker = null;
let cameraOn = false;
let lastVideoTime = -1;
let results = null;

let confettiParticles = [];
const VOTE_BUFFER_SIZE = 6;
const VOTE_MINIMUM = 3;
let votes = [];

let phase = "idle";
let phaseStart = 0;
let step = -1;
let aiChoice = null;
let manualMove = null;
let autoMode = false;
let roundCount = 0;
let currentStreak = 0;

const BEAT_DURATION = 450;
const SHOOT_TRIGGER_TIME = BEAT_DURATION * 3;
const REVEAL_DURATION = 1800;
const AUTO_MODE_GAP = 700;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function fireConfetti() {
  const colors = ["#22d3ee", "#818cf8", "#34d399", "#fbbf24", "#f43f5e", "#c084fc", "#ffffff"];
  for (let i = 0; i < 50; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 160,
      y: window.innerHeight / 2 - 20,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.75) * 14,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    });
  }
}

function updateConfetti() {
  cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.4;
    p.vx *= 0.98;
    p.rotation += p.rotSpeed;
    p.alpha -= 0.025;

    if (p.alpha <= 0 || p.y > confettiCanvas.height) {
      confettiParticles.splice(i, 1);
      continue;
    }

    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate((p.rotation * Math.PI) / 180);
    cctx.globalAlpha = Math.max(0, p.alpha);
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
    cctx.restore();
  }
}

function getStableGesture() {
  if (votes.length < VOTE_MINIMUM) return null;
  const count = [0, 0, 0];
  for (const v of votes) {
    if (v !== null) count[v]++;
  }
  let best = 0;
  for (let k = 1; k < 3; k++) {
    if (count[k] > count[best]) best = k;
  }
  return count[best] >= VOTE_MINIMUM ? best : null;
}

function startRound() {
  if (phase !== "idle") return;
  phase = "count";
  phaseStart = performance.now();
  step = -1;
  manualMove = null;

  aiChoice = brain.decide();
  duelEl.classList.remove("active");
  verdictEl.className = "";
  verdictEl.textContent = "";
  subStatusEl.textContent = "AI committed move 🔒 Throw now";
  modelReason.innerHTML = "Prediction locked. Awaiting throw… <b>?</b>";
  if (brainPill) brainPill.textContent = "Locked";
}

function selectManualMove(moveIndex) {
  Sound.click();
  if (phase === "idle") {
    startRound();
    manualMove = moveIndex;
  } else if (phase === "count") {
    manualMove = moveIndex;
  }
  liveTrackerEl.classList.add("active", "locked");
  liveText.textContent = `${EMOJI[moveIndex]} ${NAMES[moveIndex]} (selected)`;
}

function resolveRound() {
  const player = manualMove ?? getStableGesture();

  if (player === null) {
    phase = "reveal";
    phaseStart = performance.now();
    countEl.className = "";
    verdictEl.className = "show draw";
    verdictEl.textContent = "No Throw";
    subStatusEl.textContent = "Show a hand in frame, press [R]/[P]/[S], or click buttons.";
    modelReason.innerHTML = "Round skipped — insufficient gesture signal.";
    if (brainPill) brainPill.textContent = "Skipped";
    Sound.draw();
    return;
  }

  const ai = aiChoice.move;
  const result = brain.learn(player, ai);
  roundCount++;

  if (result === 1) {
    currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    Sound.win();
    fireConfetti();
  } else if (result === -1) {
    currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    Sound.lose();
    canvas.classList.add("shake");
    setTimeout(() => canvas.classList.remove("shake"), 350);
  } else {
    currentStreak = 0;
    Sound.draw();
  }

  updateStreakDisplay();

  gYou.textContent = EMOJI[player];
  gAi.textContent = EMOJI[ai];
  gYou.style.animation = "none";
  gAi.style.animation = "none";
  void gYou.offsetWidth;
  gYou.style.animation = "";
  gAi.style.animation = "";

  countEl.className = "";
  duelEl.classList.add("active");
  verdictEl.className = "show " + (result === 1 ? "win" : result === -1 ? "lose" : "draw");
  verdictEl.textContent = result === 1 ? "YOU WIN" : result === -1 ? "AI WINS" : "DRAW";
  subStatusEl.textContent = `${NAMES[player]} vs ${NAMES[ai]}`;

  modelReason.innerHTML = aiChoice.source
    ? `<b>${aiChoice.source}</b> — ${aiChoice.reason}`
    : aiChoice.reason;

  if (brainPill) {
    brainPill.textContent = result === -1 ? "Hit" : "Learned";
  }

  recordHistory(player, ai, result);
  refreshMetrics();

  phase = "reveal";
  phaseStart = performance.now();
}

function updateStreakDisplay() {
  if (!streakPill) return;
  if (currentStreak >= 2) {
    streakPill.textContent = `YOU +${currentStreak}`;
    streakPill.className = "show";
  } else if (currentStreak <= -2) {
    streakPill.textContent = `AI +${Math.abs(currentStreak)}`;
    streakPill.className = "show";
  } else {
    streakPill.className = "";
    streakPill.textContent = "";
  }
}

function tickPhase(now) {
  if (phase === "count") {
    const elapsed = now - phaseStart;
    const currentStep = Math.min(3, Math.floor(elapsed / BEAT_DURATION));
    if (currentStep !== step) {
      step = currentStep;
      const countLabels = ["3", "2", "1", "SHOOT"];
      countEl.textContent = countLabels[step];
      countEl.className = "";
      void countEl.offsetWidth;
      countEl.className = "pop";
      if (step === 3) {
        Sound.shoot();
      } else {
        Sound.count(step);
      }
    }
    if (elapsed >= SHOOT_TRIGGER_TIME + 120) {
      resolveRound();
    }
  } else if (phase === "reveal") {
    if (now - phaseStart >= REVEAL_DURATION) {
      phase = "idle";
      countEl.className = "";
      countEl.textContent = "";
      duelEl.classList.remove("active");
      verdictEl.className = "";
      subStatusEl.textContent = autoMode ? "" : "Press [Space] or pick a throw to continue.";
      if (brainPill) brainPill.textContent = "Standby";
      if (autoMode) {
        setTimeout(() => autoMode && startRound(), AUTO_MODE_GAP);
      }
    }
  }
}

function recordHistory(player, ai, result) {
  const row = document.createElement("div");
  row.className = "history-row " + (result === 1 ? "win" : result === -1 ? "lose" : "draw");
  row.innerHTML =
    `<span class="indicator-bar"></span><span class="round-number">#${roundCount}</span>` +
    `<span>${EMOJI[player]}</span><span class="mid-label">vs</span><span>${EMOJI[ai]}</span>`;
  historyEl.appendChild(row);
  while (historyEl.children.length > 10) {
    historyEl.removeChild(historyEl.firstChild);
  }
}

function refreshMetrics() {
  const { you, ai, draw } = brain.tally();
  $("score-you").textContent = you;
  $("score-ai").textContent = ai;
  $("score-draw").textContent = draw;

  const readability = brain.predictability();
  meterFill.style.width = `${(readability * 100).toFixed(0)}%`;
  const decided = you + ai;
  const winRate = decided ? Math.round((ai / decided) * 100) : 0;
  meterLabel.innerHTML = brain.hist.length < 4
    ? "Gathering move patterns…"
    : `Readability: <b>${Math.round(readability * 100)}%</b> · AI Win Rate: <b>${winRate}%</b>`;

  drawSparkline();
}

function drawSparkline() {
  const dpr = window.devicePixelRatio || 1;
  const width = sparkChart.clientWidth || 230;
  const height = 38;
  sparkChart.width = width * dpr;
  sparkChart.height = height * dpr;
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.clearRect(0, 0, width, height);

  sctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  sctx.setLineDash([3, 3]);
  sctx.lineWidth = 1;
  const chanceLineY = height - (1 / 3) * height;
  sctx.beginPath();
  sctx.moveTo(0, chanceLineY);
  sctx.lineTo(width, chanceLineY);
  sctx.stroke();
  sctx.setLineDash([]);

  const hist = brain.hist;
  if (hist.length < 2) return;

  const points = [];
  let aiWins = 0;
  hist.forEach((round, index) => {
    if (round.result === -1) aiWins++;
    points.push({
      x: (index / (hist.length - 1)) * width,
      y: height - (aiWins / (index + 1)) * height,
    });
  });

  const grad = sctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#22d3ee");
  grad.addColorStop(0.5, "#818cf8");
  grad.addColorStop(1, "#f43f5e");

  sctx.beginPath();
  points.forEach((pt, i) => (i ? sctx.lineTo(pt.x, pt.y) : sctx.moveTo(pt.x, pt.y)));
  sctx.strokeStyle = grad;
  sctx.lineWidth = 2.5;
  sctx.lineJoin = "round";
  sctx.shadowColor = "rgba(34, 211, 238, 0.4)";
  sctx.shadowBlur = 6;
  sctx.stroke();
  sctx.shadowBlur = 0;

  const lastPt = points[points.length - 1];
  sctx.beginPath();
  sctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
  sctx.fillStyle = "#22d3ee";
  sctx.fill();
  sctx.lineWidth = 1.5;
  sctx.strokeStyle = "#ffffff";
  sctx.stroke();
}

function drawMirroredVideo(source) {
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function renderLoop() {
  const now = performance.now();

  if (cameraOn) {
    drawMirroredVideo(video);
    if (landmarker && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        results = landmarker.detectForVideo(video, now);
        const hand = results?.landmarks?.[0] ?? null;
        votes.push(hand ? classifyHand(hand) : null);
        if (votes.length > VOTE_BUFFER_SIZE) {
          votes.shift();
        }
      } catch (err) {
        console.warn("Detection error in render loop:", err);
      }
    }
    const hand = results?.landmarks?.[0] ?? null;
    if (hand) {
      drawSkeleton(ctx, hand, canvas.width, canvas.height);
    }

    const gesture = getStableGesture();
    liveTrackerEl.classList.toggle("active", phase !== "reveal");
    liveTrackerEl.classList.toggle("locked", gesture !== null);
    liveText.textContent = gesture === null ? "Tracking hand…" : `${EMOJI[gesture]} ${NAMES[gesture]}`;
  } else {
    ctx.fillStyle = "#070913";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  updateConfetti();
  tickPhase(now);
  requestAnimationFrame(renderLoop);
}

function toggleAutoMode() {
  autoMode = !autoMode;
  $("btn-auto").classList.toggle("active", autoMode);
  $("btn-auto").innerHTML = autoMode ? 'Auto: ON <span class="kbd">A</span>' : 'Auto <span class="kbd">A</span>';
  if (autoMode && phase === "idle") {
    startRound();
  }
}

function resetGame() {
  autoMode = false;
  $("btn-auto").classList.remove("active");
  $("btn-auto").innerHTML = 'Auto <span class="kbd">A</span>';

  brain.reset();
  roundCount = 0;
  currentStreak = 0;
  updateStreakDisplay();
  historyEl.innerHTML = "";
  phase = "idle";
  countEl.className = "";
  countEl.textContent = "";
  duelEl.classList.remove("active");
  verdictEl.className = "";
  verdictEl.textContent = "";
  subStatusEl.textContent = "";
  modelReason.innerHTML = "The AI locks its choice in <b>before</b> your gesture is read.";
  if (brainPill) brainPill.textContent = "Standby";
  refreshMetrics();
  Sound.click();
}

function bindEventListeners() {
  $("btn-play").addEventListener("click", () => {
    Sound.click();
    startRound();
  });
  $("btn-auto").addEventListener("click", () => {
    Sound.click();
    toggleAutoMode();
  });
  $("btn-sound").addEventListener("click", () => {
    const isEnabled = Sound.toggleSound();
    $("btn-sound").textContent = isEnabled ? "Sound" : "Muted";
    $("btn-sound").classList.toggle("active", isEnabled);
  });
  $("btn-reset").addEventListener("click", resetGame);

  document.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const move = parseInt(btn.dataset.move, 10);
      selectManualMove(move);
    });
  });

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.code === "Space") {
      e.preventDefault();
      startRound();
      return;
    }
    if (key === "a") {
      toggleAutoMode();
      return;
    }
    if (key === "backspace") {
      e.preventDefault();
      resetGame();
      return;
    }
    const moveIndex = { r: 0, p: 1, s: 2 }[key];
    if (moveIndex !== undefined) {
      selectManualMove(moveIndex);
    }
  });

  window.addEventListener("resize", drawSparkline);
}

async function bootstrap() {
  bindEventListeners();
  refreshMetrics();

  try {
    bootText.textContent = "Connecting camera stream…";
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
    } catch (constraintErr) {
      console.warn("Retrying with standard video constraint:", constraintErr);
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    video.srcObject = stream;
    await new Promise((resolve) => {
      if (video.readyState >= 1) resolve();
      else {
        video.onloadedmetadata = () => resolve();
        video.addEventListener("loadeddata", () => resolve(), { once: true });
        setTimeout(resolve, 2000);
      }
    });
    await video.play().catch((e) => console.warn("Video play error:", e));

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    cameraOn = true;
  } catch (err) {
    console.warn("Camera fallback to manual input:", err);
    cameraOn = false;
    canvas.width = 1280;
    canvas.height = 720;
    liveTrackerEl.classList.add("active");
    liveText.textContent = "Manual input mode";
  }

  if (cameraOn) {
    try {
      bootText.textContent = "Loading neural hand tracker…";
      landmarker = await createHandTracker();
    } catch (trackerErr) {
      console.warn("MediaPipe model loading warning:", trackerErr);
    }
  }

  bootScreen.classList.add("hidden");
  subStatusEl.textContent = cameraOn
    ? "Press [Space] or choose a throw, then throw on SHOOT."
    : "Press [R], [P], [S] or click the buttons below.";
  requestAnimationFrame(renderLoop);
}

bootstrap().catch((err) => {
  console.error(err);
  bootScreen.classList.remove("hidden");
  bootScreen.querySelector(".loader-spinner")?.remove();
  bootText.textContent = `Initialization notice: ${err.message}`;
});
