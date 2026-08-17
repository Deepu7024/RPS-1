export const ROCK = 0;
export const PAPER = 1;
export const SCISSORS = 2;

export const NAMES = ["Rock", "Paper", "Scissors"];
export const EMOJI = ["✊", "✋", "✌️"];

export const beats = (a, b) => (a - b + 3) % 3 === 1;
export const counter = (m) => (m + 1) % 3;

function mode(moves) {
  if (!moves.length) return null;
  const count = [0, 0, 0];
  for (const m of moves) count[m]++;
  let best = 0;
  for (let i = 1; i < 3; i++) {
    if (count[i] > count[best]) best = i;
  }
  if (count[best] === 0) return null;
  const ties = count.filter((v) => v === count[best]).length;
  return ties === 3 ? null : best;
}

function ngram(hist, n) {
  if (hist.length <= n) return null;
  const seq = hist.map((h) => h.player);
  const key = seq.slice(-n).join("");
  const next = [];
  for (let i = 0; i + n < seq.length; i++) {
    if (seq.slice(i, i + n).join("") === key) {
      next.push(seq[i + n]);
    }
  }
  return mode(next);
}

function outcomeGram(hist) {
  if (hist.length < 3) return null;
  const formatKey = (h) => `${h.player}|${h.result}`;
  const key = formatKey(hist[hist.length - 1]);
  const next = [];
  for (let i = 0; i < hist.length - 1; i++) {
    if (formatKey(hist[i]) === key) {
      next.push(hist[i + 1].player);
    }
  }
  return mode(next);
}

export const PREDICTORS = [
  {
    id: "freq",
    label: "overall favourite move",
    fn: (h) => (h.length >= 4 ? mode(h.map((x) => x.player)) : null),
  },
  {
    id: "recent",
    label: "recent move trend",
    fn: (h) => (h.length >= 4 ? mode(h.slice(-8).map((x) => x.player)) : null),
  },
  { id: "ngram1", label: "single-step sequence pattern", fn: (h) => ngram(h, 1) },
  { id: "ngram2", label: "two-step sequence pattern", fn: (h) => ngram(h, 2) },
  { id: "ngram3", label: "three-step sequence pattern", fn: (h) => ngram(h, 3) },
  { id: "outcome", label: "reaction to winning/losing", fn: outcomeGram },
  {
    id: "wsls",
    label: "win-stay / lose-shift habit",
    fn: (h) => {
      if (!h.length) return null;
      const last = h[h.length - 1];
      if (last.result === 1) return last.player;
      if (last.result === -1) return counter(last.ai);
      return counter(last.player);
    },
  },
  {
    id: "mirror",
    label: "countering the AI's last move",
    fn: (h) => (h.length ? counter(h[h.length - 1].ai) : null),
  },
  {
    id: "rotate",
    label: "cycling rock → paper → scissors",
    fn: (h) => (h.length ? counter(h[h.length - 1].player) : null),
  },
  {
    id: "antirepeat",
    label: "avoiding third repeat of same move",
    fn: (h) => {
      if (h.length < 2) return null;
      const [a, b] = [h[h.length - 1].player, h[h.length - 2].player];
      return a === b ? counter(a) : null;
    },
  },
];

const DECAY = 0.92;
const MIN_SCORE = 0.55;
const EXPLORE = 0.08;

export class MindReader {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.hist = [];
    this.scores = Object.fromEntries(PREDICTORS.map((p) => [p.id, 0]));
    this.pending = null;
  }

  decide() {
    const guesses = {};
    for (const p of PREDICTORS) {
      let g = null;
      try { g = p.fn(this.hist); } catch { g = null; }
      guesses[p.id] = (g === 0 || g === 1 || g === 2) ? g : null;
    }
    this.pending = guesses;

    const ballot = [0, 0, 0];
    let leader = null;
    let leaderWeight = 0;

    for (const p of PREDICTORS) {
      const g = guesses[p.id];
      if (g === null) continue;
      const w = this.scores[p.id];
      if (w <= 0) continue;
      ballot[g] += w * w;
      if (w > leaderWeight) {
        leaderWeight = w;
        leader = p;
      }
    }

    const total = ballot[0] + ballot[1] + ballot[2];
    const isExploring = this.rng() < EXPLORE;

    if (isExploring || !leader || leaderWeight < MIN_SCORE || total === 0) {
      return {
        move: Math.floor(this.rng() * 3) % 3,
        source: null,
        reason: this.hist.length < 4
          ? "Observing moves. Playing randomly until patterns emerge."
          : "Randomizing throw to remain unpredictable.",
        confidence: 0,
      };
    }

    let predicted = 0;
    for (let i = 1; i < 3; i++) {
      if (ballot[i] > ballot[predicted]) predicted = i;
    }

    const backers = PREDICTORS.filter((p) => guesses[p.id] === predicted && this.scores[p.id] > 0);
    backers.sort((a, b) => this.scores[b.id] - this.scores[a.id]);
    const source = backers[0] ?? leader;

    return {
      move: counter(predicted),
      source: source.id,
      reason: `Tracking ${source.label}. Predicting ${NAMES[predicted]}.`,
      confidence: Math.min(1, ballot[predicted] / total),
    };
  }

  learn(playerMove, aiMove) {
    if (this.pending) {
      for (const p of PREDICTORS) {
        const g = this.pending[p.id];
        this.scores[p.id] *= DECAY;
        if (g === null) continue;
        this.scores[p.id] += (g === playerMove) ? 1 : -0.6;
      }
      this.pending = null;
    }
    const result = (playerMove === aiMove) ? 0 : beats(playerMove, aiMove) ? 1 : -1;
    this.hist.push({ player: playerMove, ai: aiMove, result });
    return result;
  }

  reset() {
    this.hist = [];
    this.scores = Object.fromEntries(PREDICTORS.map((p) => [p.id, 0]));
    this.pending = null;
  }

  predictability() {
    const n = this.hist.length;
    if (n < 5) return 0;
    const moves = this.hist.map((h) => h.player);

    const counts = [0, 0, 0];
    for (const m of moves) counts[m]++;
    let hEntropy = 0;
    for (const k of counts) {
      if (k) {
        const p = k / n;
        hEntropy -= p * Math.log2(p);
      }
    }

    const transitions = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 1; i < n; i++) {
      transitions[moves[i - 1]][moves[i]]++;
    }

    let conditionalEntropy = 0;
    for (let a = 0; a < 3; a++) {
      const rowSum = transitions[a][0] + transitions[a][1] + transitions[a][2];
      if (!rowSum) continue;
      let h = 0;
      for (const k of transitions[a]) {
        if (k) {
          const p = k / rowSum;
          h -= p * Math.log2(p);
        }
      }
      conditionalEntropy += (rowSum / (n - 1)) * h;
    }

    const maxEntropy = Math.log2(3);
    const confidence = Math.min(1, (n - 4) / 12);
    return Math.max(0, Math.min(1, (1 - Math.min(hEntropy, conditionalEntropy) / maxEntropy) * confidence));
  }

  tally() {
    let you = 0;
    let ai = 0;
    let draw = 0;
    for (const h of this.hist) {
      if (h.result === 1) you++;
      else if (h.result === -1) ai++;
      else draw++;
    }
    return { you, ai, draw, rounds: this.hist.length };
  }
}
