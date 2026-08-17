import { HandLandmarker, FilesetResolver } from
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/" +
  "hand_landmarker/float16/1/hand_landmarker.task";

const FINGERS = [[8, 6], [12, 10], [16, 14], [20, 18]];
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function classifyHand(landmarks) {
  const wrist = landmarks[0];
  const extended = FINGERS.map(([tip, pip]) => d2(landmarks[tip], wrist) > d2(landmarks[pip], wrist) * 1.08);
  const [index, middle, ring, pinky] = extended;
  const count = extended.filter(Boolean).length;

  if (count === 0) return 0;
  if (count >= 4) return 1;
  if (index && middle && !ring && !pinky) return 2;
  if (count === 1 && !index && !middle) return 0;
  return null;
}

export function drawSkeleton(ctx, landmarks, width, height) {
  const toPixel = (p) => ({ x: (1 - p.x) * width, y: p.y * height });
  const points = landmarks.map(toPixel);

  ctx.save();
  // Outer glow for connections
  ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(points[a].x, points[a].y);
    ctx.lineTo(points[b].x, points[b].y);
    ctx.stroke();
  }

  // Core sharp bright cyan lines
  ctx.strokeStyle = "rgba(165, 243, 252, 0.95)";
  ctx.lineWidth = 2.5;

  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(points[a].x, points[a].y);
    ctx.lineTo(points[b].x, points[b].y);
    ctx.stroke();
  }

  // Finger tips: 4, 8, 12, 16, 20
  const tips = [4, 8, 12, 16, 20];

  // Draw joints
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const isTip = tips.includes(i);

    if (isTip) {
      // Glowing tip pulse
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 211, 238, 0.35)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
    }
  }
  ctx.restore();
}

export async function createHandTracker() {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  try {
    return await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
  } catch (gpuErr) {
    console.warn("GPU delegate failed for MediaPipe, falling back to CPU:", gpuErr);
    return await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
  }
}
