let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone(freq, type = "sine", duration = 0.1, gainVal = 0.08) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

export const Sound = {
  click() {
    playTone(700, "sine", 0.04, 0.04);
  },
  count(step) {
    playTone(400 + step * 100, "sine", 0.08, 0.08);
  },
  shoot() {
    playTone(650, "triangle", 0.12, 0.1);
    setTimeout(() => playTone(850, "sine", 0.1, 0.06), 40);
  },
  win() {
    [600, 800, 1000].forEach((freq, i) => {
      setTimeout(() => playTone(freq, "sine", 0.15, 0.08), i * 70);
    });
  },
  lose() {
    [320, 240].forEach((freq, i) => {
      setTimeout(() => playTone(freq, "triangle", 0.14, 0.06), i * 80);
    });
  },
  draw() {
    [450, 450].forEach((freq, i) => {
      setTimeout(() => playTone(freq, "sine", 0.08, 0.06), i * 80);
    });
  },
  toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) this.click();
    return soundEnabled;
  },
  isSoundEnabled() {
    return soundEnabled;
  }
};
