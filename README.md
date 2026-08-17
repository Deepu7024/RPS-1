# Jnyandeep's RPS ✊✋✌️

An AI-powered, real-time hand-tracking Rock Paper Scissors game featuring MediaPipe neural computer vision, pattern-learning AI mind reader, synthesized audio effects, and cyber-neon visual aesthetics.

![Jnyandeep's RPS](https://img.shields.io/badge/Game-Jnyandeep's%20RPS-06b6d4?style=for-the-badge)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Vision-8b5cf6?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/ES6-Vanilla%20JS-f59e0b?style=for-the-badge)

---

## ✨ Features

- 🖐️ **Real-Time Neural Hand Tracking**: Powered by Google MediaPipe Tasks Vision (`HandLandmarker`) with automatic GPU/CPU fallback and augmented skeleton visualization.
- 🧠 **Adaptive Mind-Reading AI**: Incorporates 10 distinct predictive algorithms (n-grams, transition entropy, win-stay/lose-shift, frequency patterns, anti-repeat counter habits) that learn your playstyle in real time.
- 🎨 **Cyber-Neon Dark Aesthetic**: Modern frosted glassmorphic UI with vibrant Cyan, Violet, Emerald, and Rose glow palettes, sparkline win-rate charts, and confetti win bursts.
- 🔊 **Web Audio Synthesizer**: Custom real-time sound effects for countdowns, shoots, victories, draws, and defeats with no external audio file dependencies.
- ⚡ **Zero Build Step**: Native ES Modules running directly in modern web browsers.
- ⌨️ **Hybrid Input**: Play naturally with physical hand gestures in front of your camera, or use keyboard shortcuts (`R`, `P`, `S`, `Space`, `A`, `Backspace`) / mouse controls.

---

## 🚀 Quick Start

Because camera access and WebAssembly neural models require a secure origin (`http://localhost` or `https://`), run the project using any local web server:

### Option 1: Python (Built-in)
```bash
# Inside the project folder
python3 -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Node.js / npx
```bash
npx serve .
```

---

## 🎮 How to Play

1. Allow camera permissions when prompted by your browser.
2. Hold your hand in frame. The neural tracker will detect your gesture (✊ Rock, ✋ Paper, ✌️ Scissors).
3. Press **[Space]** or click **Play Round** to start the countdown: `3`, `2`, `1`, `SHOOT!`.
4. Hold your gesture on **SHOOT** to duel against the AI.
5. Watch the **Predictor** panel track your move patterns, entropy, and read your strategy!

### Keyboard Controls
- `Space` : Start round
- `R` : Select Rock
- `P` : Select Paper
- `S` : Select Scissors
- `A` : Toggle Auto-Play mode
- `Backspace` : Reset game & AI memory

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, CSS Animations)
- **Vision AI**: MediaPipe `@mediapipe/tasks-vision` HandLandmarker
- **Predictive Engine**: Probabilistic Markov chains & Multi-model ensemble
- **Audio**: Web Audio API oscillator synthesis

---

## 📄 License

MIT License. Created by Jnyandeep.
