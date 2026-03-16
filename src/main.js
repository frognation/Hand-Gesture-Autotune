import "./style.css";
import * as Tone from "tone";
import { HandLandmarker } from "@mediapipe/tasks-vision";

const app = document.querySelector("#app");

const landmarkNames = [
  "WRIST",
  "THUMB_CMC",
  "THUMB_MCP",
  "THUMB_IP",
  "THUMB_TIP",
  "INDEX_MCP",
  "INDEX_PIP",
  "INDEX_DIP",
  "INDEX_TIP",
  "MIDDLE_MCP",
  "MIDDLE_PIP",
  "MIDDLE_DIP",
  "MIDDLE_TIP",
  "RING_MCP",
  "RING_PIP",
  "RING_DIP",
  "RING_TIP",
  "PINKY_MCP",
  "PINKY_PIP",
  "PINKY_DIP",
  "PINKY_TIP"
];

const fingerConfigs = [
  { id: "thumb", name: "THUMB", delta: -5, joints: [1, 2, 3, 4] },
  { id: "index", name: "INDEX", delta: 3, joints: [5, 6, 7, 8] },
  { id: "middle", name: "MIDDLE", delta: 7, joints: [9, 10, 11, 12] },
  { id: "ring", name: "RING", delta: 10, joints: [13, 14, 15, 16] },
  { id: "pinky", name: "PINKY", delta: 14, joints: [17, 18, 19, 20] }
];

const handConnections = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

app.innerHTML = `
  <main class="screen">
    <div class="window">
      <header class="titlebar">
        <div class="titlebar-tabs">
          <span>System</span>
          <span>Properties</span>
          <span>View</span>
          <span>Storage</span>
          <span>Usage</span>
        </div>
        <div class="titlebar-actions">
          <span>|</span>
          <span>|</span>
          <span>|</span>
          <span>_</span>
          <span>[]</span>
          <span>X</span>
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar sidebar-left">
          <section class="panel panel-block">
            <p class="tiny-label">Console</p>
            <h1>Hand Gesture Autotune</h1>
            <div class="control-row">
              <button id="startButton" class="button button-primary">INIT</button>
              <button id="stopButton" class="button button-secondary" disabled>HALT</button>
            </div>
            <div class="mono-line">
              <span>MODE</span>
              <strong id="modeBadge">IDLE</strong>
            </div>
          </section>

          <section class="panel panel-block">
            <p class="tiny-label">Status</p>
            <div class="status-stack">
              <div class="status-row">
                <span>CAMERA</span>
                <strong id="cameraStatus">OFFLINE</strong>
              </div>
              <div class="status-row">
                <span>MIC</span>
                <strong id="micStatus">OFFLINE</strong>
              </div>
              <div class="status-row">
                <span>TRACKER</span>
                <strong id="trackerStatus">STANDBY</strong>
              </div>
              <div class="status-row">
                <span>AUDIO FX</span>
                <strong id="engineStatus">BYPASS</strong>
              </div>
            </div>
          </section>
        </aside>

        <section class="stage-wrap">
          <div class="stage-frame">
            <div class="stage-header">
              <span>CAM_FEED</span>
              <span id="gestureName">NO_HAND</span>
            </div>
            <div class="video-shell">
              <video id="video" playsinline muted autoplay></video>
              <canvas id="overlay"></canvas>
            </div>
          </div>
        </section>

        <aside class="sidebar sidebar-right">
          <section class="panel panel-block">
            <p class="tiny-label">Patch</p>
            <div class="metric-row">
              <span>PITCH</span>
              <strong id="pitchValue">0 ST</strong>
            </div>
            <div class="metric-row">
              <span>WET</span>
              <strong id="wetValue">0%</strong>
            </div>
            <div class="metric-row">
              <span>CHAOS</span>
              <strong id="chaosValue">OFF</strong>
            </div>
            <ul id="fingerList" class="finger-grid"></ul>
          </section>

          <section class="panel panel-block">
            <p class="tiny-label">Error</p>
            <strong id="errorName">NO ERRORS</strong>
            <p id="errorDetails" class="panel-copy compact">
              Press INIT. If camera or mic fails, the exact browser error will appear here.
            </p>
          </section>

          <section class="panel panel-block">
            <p class="tiny-label">Landmarks</p>
            <div class="landmark-meta">
              <span>21 NODES</span>
              <span>20 LINKS</span>
            </div>
            <ol id="landmarkLegend" class="landmark-list"></ol>
          </section>
        </aside>
      </div>

      <footer class="statusbar">
        <div class="statuscell statuscell-fixed">EXECUTE</div>
        <div class="statuscell statuscell-wide">OSC:&gt; <span id="gestureSummary">Awaiting camera stream.</span></div>
        <div class="statuscell statuscell-fixed" id="footerGesture">NO_HAND</div>
        <div class="statuscell statuscell-diag" id="videoDiag">VID:0x0 RS:0</div>
      </footer>
    </div>
  </main>
`;

const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const video = document.querySelector("#video");
const canvas = document.querySelector("#overlay");
const context = canvas.getContext("2d");
const modeBadge = document.querySelector("#modeBadge");
const gestureName = document.querySelector("#gestureName");
const gestureSummary = document.querySelector("#gestureSummary");
const pitchValue = document.querySelector("#pitchValue");
const wetValue = document.querySelector("#wetValue");
const chaosValue = document.querySelector("#chaosValue");
const fingerList = document.querySelector("#fingerList");
const landmarkLegend = document.querySelector("#landmarkLegend");
const cameraStatus = document.querySelector("#cameraStatus");
const micStatus = document.querySelector("#micStatus");
const trackerStatus = document.querySelector("#trackerStatus");
const engineStatus = document.querySelector("#engineStatus");
const errorName = document.querySelector("#errorName");
const errorDetails = document.querySelector("#errorDetails");
const footerGesture = document.querySelector("#footerGesture");
const videoDiag = document.querySelector("#videoDiag");

video.muted = true;
video.autoplay = true;
video.playsInline = true;
video.setAttribute("muted", "");
video.setAttribute("autoplay", "");
video.setAttribute("playsinline", "");

const state = {
  videoStream: null,
  audioStream: null,
  animationFrameId: null,
  handLandmarker: null,
  running: false,
  lastVideoTime: -1,
  audioReady: false,
  audio: null,
  lastPresetSignature: "",
  videoFrameWatcherStarted: false,
  errors: {
    camera: null,
    audio: null,
    tracker: null
  }
};

renderLandmarkLegend();
renderFingerList();
setSystemStatus({
  camera: "OFFLINE",
  mic: "OFFLINE",
  tracker: "STANDBY",
  engine: "BYPASS"
});

function setGestureLabel(value) {
  gestureName.textContent = value;
  footerGesture.textContent = value;
}

function renderLandmarkLegend() {
  landmarkLegend.innerHTML = landmarkNames
    .map((name, index) => `<li><span>${String(index).padStart(2, "0")}</span><strong>${name}</strong></li>`)
    .join("");
}

function renderFingerList(fingerStates = {}) {
  fingerList.innerHTML = fingerConfigs
    .map(({ id, name, delta }) => {
      const finger = fingerStates[id];
      const posture = finger?.posture ?? "OPEN";
      const openness = Math.round((finger?.openness ?? 1) * 100);
      const deltaLabel = delta > 0 ? `+${delta}` : `${delta}`;
      return `
        <li class="${posture.toLowerCase()}">
          <div>
            <span>${name}</span>
            <small>${posture} / ${openness}% OPEN</small>
          </div>
          <strong>${posture === "CLOSED" ? deltaLabel : "0"}</strong>
        </li>
      `;
    })
    .join("");
}

async function setupHandLandmarker() {
  if (state.handLandmarker) {
    return state.handLandmarker;
  }

  const baseUrl = import.meta.env.BASE_URL;
  const vision = {
    wasmLoaderPath: `${baseUrl}mediapipe/vision_wasm_internal.js`,
    wasmBinaryPath: `${baseUrl}mediapipe/vision_wasm_internal.wasm`
  };

  state.handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    },
    runningMode: "VIDEO",
    numHands: 1
  });

  return state.handLandmarker;
}

async function setupAudioChain() {
  if (state.audioReady) {
    return state.audio;
  }

  const userMedia = new Tone.UserMedia();
  await userMedia.open();

  const pitchShift = new Tone.PitchShift({ pitch: 0, wet: 0 });
  const chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 3.2, depth: 0.28, wet: 0.06 }).start();
  const feedbackDelay = new Tone.FeedbackDelay({ delayTime: 0.18, feedback: 0.22, wet: 0.04 });
  const filter = new Tone.AutoFilter({ frequency: 0.35, baseFrequency: 150, octaves: 2.2, wet: 0 }).start();
  const distortion = new Tone.Distortion({ distortion: 0, wet: 0 });
  const gain = new Tone.Gain(0.92).toDestination();

  userMedia.chain(pitchShift, chorus, filter, distortion, feedbackDelay, gain);

  state.audio = { userMedia, pitchShift, chorus, feedbackDelay, filter, distortion, gain };
  state.audioReady = true;
  return state.audio;
}

async function requestVideoStream() {
  const primary = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: { ideal: "user" }
    },
    audio: false
  };

  try {
    return await navigator.mediaDevices.getUserMedia(primary);
  } catch (primaryError) {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false }).catch(() => {
      throw primaryError;
    });
  }
}

async function waitForVideoReady(videoElement) {
  if (videoElement.readyState >= 2) {
    return;
  }

  await new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video element could not start playback."));
    };
    const cleanup = () => {
      videoElement.removeEventListener("loadedmetadata", onReady);
      videoElement.removeEventListener("canplay", onReady);
      videoElement.removeEventListener("error", onError);
    };

    videoElement.addEventListener("loadedmetadata", onReady, { once: true });
    videoElement.addEventListener("canplay", onReady, { once: true });
    videoElement.addEventListener("error", onError, { once: true });
  });
}

function attachVideoStream(stream) {
  const [track] = stream.getVideoTracks();
  if (!track) {
    throw new Error("No video track was returned by getUserMedia.");
  }

  video.srcObject = stream;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("playsinline", "");
  updateVideoDiagnostics();
}

function updateVideoDiagnostics(extra = "") {
  const track = state.videoStream?.getVideoTracks?.()[0];
  const resolution = `${video.videoWidth || 0}x${video.videoHeight || 0}`;
  const ready = `RS:${video.readyState}`;
  const trackState = track ? `${track.readyState}/${track.enabled ? "EN" : "DIS"}` : "NO-TRACK";
  videoDiag.textContent = `VID:${resolution} ${ready} ${trackState}${extra ? ` ${extra}` : ""}`;
}

function startVideoWatcher() {
  if (state.videoFrameWatcherStarted) {
    return;
  }

  state.videoFrameWatcherStarted = true;

  const tick = () => {
    if (!state.running && !state.videoStream) {
      state.videoFrameWatcherStarted = false;
      return;
    }

    updateVideoDiagnostics();
    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function angleAt(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magnitude = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  const ratio = clamp(dot / (magnitude || 1), -1, 1);
  return toDegrees(Math.acos(ratio));
}

function normalizeOpenValue(angle) {
  return clamp((angle - 55) / 125, 0, 1);
}

function getFingerMetric(landmarks, config, handedness) {
  const [base, pip, dip, tip] = config.joints;
  const primaryAngle = angleAt(landmarks[base], landmarks[pip], landmarks[dip]);
  const secondaryAngle = angleAt(landmarks[pip], landmarks[dip], landmarks[tip]);
  const reach = distance(landmarks[base], landmarks[tip]) / Math.max(distance(landmarks[0], landmarks[9]), 0.001);

  let openness = (normalizeOpenValue(primaryAngle) * 0.55) + (normalizeOpenValue(secondaryAngle) * 0.35) + clamp(reach / 1.7, 0, 1) * 0.1;

  if (config.id === "thumb") {
    const thumbSpread = handedness === "Right"
      ? landmarks[4].x < landmarks[3].x
      : landmarks[4].x > landmarks[3].x;
    openness = clamp(openness + (thumbSpread ? 0.08 : -0.08), 0, 1);
  }

  let posture = "OPEN";
  if (openness < 0.42) {
    posture = "CLOSED";
  } else if (openness < 0.72) {
    posture = "HALF";
  }

  return {
    openness,
    posture,
    closed: posture === "CLOSED",
    primaryAngle,
    secondaryAngle
  };
}

function getFingerStates(landmarks, handedness = "Right") {
  return fingerConfigs.reduce((accumulator, config) => {
    accumulator[config.id] = getFingerMetric(landmarks, config, handedness);
    return accumulator;
  }, {});
}

function getPresetFromFingerStates(fingerStates) {
  const closedFingers = fingerConfigs.filter(({ id }) => fingerStates[id]?.closed);
  const halfFingers = fingerConfigs.filter(({ id }) => fingerStates[id]?.posture === "HALF");
  const signature = fingerConfigs
    .map(({ id }) => (fingerStates[id]?.closed ? "2" : fingerStates[id]?.posture === "HALF" ? "1" : "0"))
    .join("");

  const pitch = closedFingers.reduce((sum, finger) => sum + finger.delta, 0)
    + halfFingers.reduce((sum, finger) => sum + Math.round(finger.delta * 0.5), 0);

  if (closedFingers.length === 0 && halfFingers.length === 0) {
    return {
      name: "OPEN PALM",
      summary: "All fingers extended. Voice stays close to the dry signal.",
      pitch,
      wet: 0.08,
      chaos: false,
      badge: "DRY",
      signature
    };
  }

  if (closedFingers.length === 5) {
    return {
      name: "FULL FIST",
      summary: "All fingers curled. Chaos patch enabled with delay, distortion and filter sweep.",
      pitch: 19,
      wet: 0.94,
      chaos: true,
      badge: "CHAOS",
      signature
    };
  }

  return {
    name: closedFingers.concat(halfFingers).map((finger) => finger.name).join(" + "),
    summary: `${closedFingers.length} closed / ${halfFingers.length} half-curled fingers are driving the pitch map.`,
    pitch,
    wet: clamp(0.12 + closedFingers.length * 0.13 + halfFingers.length * 0.06, 0.12, 0.78),
    chaos: false,
    badge: `SHIFT ${Math.abs(pitch)}ST`,
    signature
  };
}

function applyAudioPreset(preset, syncUi = true) {
  if (!state.audioReady || !state.audio) {
    if (syncUi) {
      pitchValue.textContent = `${preset.pitch} ST`;
      wetValue.textContent = `${Math.round(preset.wet * 100)}%`;
      chaosValue.textContent = preset.chaos ? "ON" : "OFF";
      modeBadge.textContent = preset.badge;
      setGestureLabel(preset.name);
      gestureSummary.textContent = `${preset.summary} // MIC OFFLINE`;
    }
    return;
  }

  const { pitchShift, chorus, feedbackDelay, filter, distortion } = state.audio;

  pitchShift.pitch = preset.pitch;
  pitchShift.wet.value = preset.wet;
  chorus.wet.value = clamp(preset.wet * 0.5, 0.04, 0.48);
  feedbackDelay.wet.value = preset.chaos ? 0.34 : clamp(preset.wet * 0.26, 0.03, 0.18);
  feedbackDelay.feedback.value = preset.chaos ? 0.58 : 0.22;
  distortion.distortion = preset.chaos ? 0.72 : clamp(preset.wet * 0.18, 0, 0.14);
  distortion.wet.value = preset.chaos ? 0.44 : clamp(preset.wet * 0.1, 0, 0.12);
  filter.wet.value = preset.chaos ? 0.4 : 0;

  if (syncUi) {
    pitchValue.textContent = `${preset.pitch} ST`;
    wetValue.textContent = `${Math.round(preset.wet * 100)}%`;
    chaosValue.textContent = preset.chaos ? "ON" : "OFF";
    modeBadge.textContent = preset.badge;
    setGestureLabel(preset.name);
    gestureSummary.textContent = preset.summary;
  }
}

function drawHand(landmarks, fingerStates) {
  context.lineWidth = 2;
  context.strokeStyle = "#39ff14";
  context.fillStyle = "#ff2bd6";
  context.font = "12px 'Courier New', monospace";
  context.textBaseline = "middle";

  handConnections.forEach(([from, to]) => {
    const start = landmarks[from];
    const end = landmarks[to];
    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.stroke();
  });

  landmarks.forEach((point, index) => {
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;
    const isTip = [4, 8, 12, 16, 20].includes(index);

    context.beginPath();
    context.fillStyle = "#ff2bd6";
    context.arc(x, y, isTip ? 8 : 5.5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ff8c1a";
    context.fillText(String(index), x + 10, y - 10);
  });

  fingerConfigs.forEach((config) => {
    const finger = fingerStates[config.id];
    const tip = landmarks[config.joints[3]];
    const x = tip.x * canvas.width;
    const y = tip.y * canvas.height;

    context.fillStyle = finger.closed ? "#ff8c1a" : finger.posture === "HALF" ? "#ff2bd6" : "#39ff14";
    context.fillText(finger.posture, x - 18, y - 26);
  });
}

function drawVideoFrame() {
  if (!video.videoWidth || !video.videoHeight || canvas.width === 0 || canvas.height === 0) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

function syncCanvasSize() {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) {
    return;
  }

  canvas.width = videoWidth;
  canvas.height = videoHeight;
}

function clearVisualState(message = "No hand detected. Keep the full hand inside the frame.") {
  renderFingerList();
  setGestureLabel("NO_HAND");
  gestureSummary.textContent = message;
  pitchValue.textContent = "0 ST";
  wetValue.textContent = "0%";
  chaosValue.textContent = "OFF";
  modeBadge.textContent = state.audioReady ? "ARMED" : "CAM ONLY";

  applyAudioPreset(
    {
      name: "OPEN PALM",
      summary: message,
      pitch: 0,
      wet: 0.08,
      chaos: false,
      badge: state.audioReady ? "ARMED" : "CAM ONLY"
    },
    false
  );
}

function setSystemStatus(statuses) {
  if (statuses.camera) {
    cameraStatus.textContent = statuses.camera;
  }
  if (statuses.mic) {
    micStatus.textContent = statuses.mic;
  }
  if (statuses.tracker) {
    trackerStatus.textContent = statuses.tracker;
  }
  if (statuses.engine) {
    engineStatus.textContent = statuses.engine;
  }
}

function describeError(error) {
  if (!error) {
    return {
      title: "NO ERRORS",
      detail: "Press INIT. If camera or mic fails, the exact browser error will appear here."
    };
  }

  const code = error.name || "Error";
  const message = error.message || "Unknown browser error";

  if (code === "NotAllowedError") {
    return {
      title: "PERMISSION BLOCKED",
      detail: `${code}: Browser or macOS camera/mic access was denied.`
    };
  }

  if (code === "NotReadableError") {
    return {
      title: "DEVICE BUSY",
      detail: `${code}: Another app is already using the camera or microphone.`
    };
  }

  if (code === "NotFoundError") {
    return {
      title: "DEVICE MISSING",
      detail: `${code}: No camera or microphone was found on this machine.`
    };
  }

  if (code === "OverconstrainedError") {
    return {
      title: "CONSTRAINT FAIL",
      detail: `${code}: Requested camera settings are not supported by this device.`
    };
  }

  return {
    title: code.toUpperCase(),
    detail: `${code}: ${message}`
  };
}

function showError(error) {
  const view = describeError(error);
  errorName.textContent = view.title;
  errorDetails.textContent = view.detail;
  updateVideoDiagnostics(view.title);
}

function getMicStatusFromError(error) {
  switch (error?.name) {
    case "NotAllowedError":
      return "DENIED";
    case "NotReadableError":
      return "BUSY";
    case "NotFoundError":
      return "MISSING";
    default:
      return "FAIL";
  }
}

function loop() {
  if (!state.running) {
    return;
  }

  syncCanvasSize();
  drawVideoFrame();

  if (!state.handLandmarker) {
    setSystemStatus({ tracker: "FAIL" });
    state.animationFrameId = window.requestAnimationFrame(loop);
    return;
  }

  if (video.currentTime !== state.lastVideoTime) {
    state.lastVideoTime = video.currentTime;
    const result = state.handLandmarker.detectForVideo(video, performance.now());

    if (result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      const handedness = result.handednesses[0]?.[0]?.categoryName ?? "Right";
      const fingerStates = getFingerStates(landmarks, handedness);
      const preset = getPresetFromFingerStates(fingerStates);

      renderFingerList(fingerStates);
      drawHand(landmarks, fingerStates);
      setSystemStatus({ tracker: "LOCKED" });

      if (preset.signature !== state.lastPresetSignature) {
        applyAudioPreset(preset);
        state.lastPresetSignature = preset.signature;
      } else {
        pitchValue.textContent = `${preset.pitch} ST`;
        wetValue.textContent = `${Math.round(preset.wet * 100)}%`;
        chaosValue.textContent = preset.chaos ? "ON" : "OFF";
      }
    } else {
      clearVisualState();
      state.lastPresetSignature = "";
      setSystemStatus({ tracker: "SEARCHING" });
    }
  }

  state.animationFrameId = window.requestAnimationFrame(loop);
}

function ensureMediaSupport() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("navigator.mediaDevices.getUserMedia is unavailable in this browser.");
  }
}

async function startExperience() {
  if (state.running) {
    return;
  }

  startButton.disabled = true;
  startButton.textContent = "BOOTING";
  stopButton.disabled = true;
  state.lastVideoTime = -1;
  state.lastPresetSignature = "";
  state.errors = { camera: null, audio: null, tracker: null };
  showError(null);
  gestureSummary.textContent = "Boot sequence: tracker + camera + audio.";
  setSystemStatus({
    camera: "BOOT",
    mic: "BOOT",
    tracker: "BOOT",
    engine: "BOOT"
  });

  try {
    ensureMediaSupport();
    await Tone.start();

    const videoStream = await requestVideoStream();
    state.videoStream = videoStream;
    attachVideoStream(videoStream);
    await waitForVideoReady(video);
    await video.play();
    updateVideoDiagnostics("PLAY");
    startVideoWatcher();

    setSystemStatus({
      camera: "ONLINE",
      tracker: "BOOT",
      engine: "WAIT MIC"
    });

    let audioReady = false;

    try {
      await setupAudioChain();
      audioReady = true;
      setSystemStatus({
        mic: "ONLINE",
        engine: "PATCHED"
      });
    } catch (audioError) {
      state.errors.audio = audioError;
      showError(audioError);
      setSystemStatus({
        mic: getMicStatusFromError(audioError),
        engine: "CAM ONLY"
      });
    }

    try {
      state.handLandmarker = await setupHandLandmarker();
      setSystemStatus({ tracker: "ONLINE" });
    } catch (trackerError) {
      state.errors.tracker = trackerError;
      state.handLandmarker = null;
      showError(trackerError);
      setSystemStatus({ tracker: "FAIL" });
    }

    state.running = true;
    startButton.textContent = "LIVE";
    stopButton.disabled = false;
    clearVisualState(
      audioReady
        ? state.handLandmarker
          ? "Camera, tracker and microphone are online."
          : "Camera and microphone are online. Tracker failed, so only the live feed is active."
        : state.handLandmarker
          ? "Camera and tracker are online. Microphone patch failed, so the app is running in camera-only mode."
          : "Camera is online. Tracker and microphone are unavailable."
    );
    loop();
  } catch (error) {
    state.errors.camera = error;
    showError(error);
    setSystemStatus({
      camera: "FAIL",
      mic: "OFFLINE",
      tracker: "FAIL",
      engine: "OFFLINE"
    });
    setGestureLabel("BOOT_FAIL");
    gestureSummary.textContent = "Initialization stopped before the live camera stream came online.";
    startButton.disabled = false;
    startButton.textContent = "INIT";
    stopButton.disabled = true;
  }
}

function teardownAudioChain() {
  if (!state.audioReady || !state.audio) {
    return;
  }

  state.audio.userMedia.close();
  state.audio.pitchShift.dispose();
  state.audio.chorus.dispose();
  state.audio.feedbackDelay.dispose();
  state.audio.filter.dispose();
  state.audio.distortion.dispose();
  state.audio.gain.dispose();
  state.audio = null;
  state.audioReady = false;
}

function stopTracks(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function stopExperience() {
  state.running = false;
  state.lastVideoTime = -1;
  state.lastPresetSignature = "";
  startButton.disabled = false;
  startButton.textContent = "INIT";
  stopButton.disabled = true;

  if (state.animationFrameId) {
    window.cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }

  stopTracks(state.videoStream);
  stopTracks(state.audioStream);
  state.videoStream = null;
  state.audioStream = null;
  state.videoFrameWatcherStarted = false;
  teardownAudioChain();

  if (video.srcObject) {
    video.srcObject = null;
  }

  clearVisualState("System halted. Press INIT to re-open the camera and microphone.");
  showError(null);
  setSystemStatus({
    camera: "OFFLINE",
    mic: "OFFLINE",
    tracker: "STANDBY",
    engine: "BYPASS"
  });
  modeBadge.textContent = "HALT";
  setGestureLabel("NO_HAND");
  updateVideoDiagnostics("HALT");
}

startButton.addEventListener("click", startExperience);
stopButton.addEventListener("click", stopExperience);
