# Hand Gesture Autotune

Web app prototype that reads hand gestures from a webcam and modulates live microphone input with pitch-shift style voice effects.

## Links

- Live demo: [https://frognation.github.io/Hand-Gesture-Autotune/](https://frognation.github.io/Hand-Gesture-Autotune/)
- Repository: [https://github.com/frognation/Hand-Gesture-Autotune](https://github.com/frognation/Hand-Gesture-Autotune)

## Gesture Map

- Open palm: dry / normal voice
- Thumb closed: `-5 semitones`
- Index closed: `+3 semitones`
- Middle closed: `+7 semitones`
- Ring closed: `+10 semitones`
- Pinky closed: `+14 semitones`
- Full fist: chaos mode with stronger delay, distortion, and filter motion

Multiple closed fingers stack their pitch values together. Half-curled fingers contribute partial pitch movement.

## Local Development

```bash
npm install
npm run dev
```

Open the local Vite URL in the browser, then press `INIT`.

## Production Build

```bash
npm run build
```

The project is configured for GitHub Pages using the repository base path:

- production base: `/Hand-Gesture-Autotune/`
- deploy workflow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## Stack

- Vite
- MediaPipe Tasks Vision `HandLandmarker`
- Tone.js

## Permissions

- Camera and microphone require `localhost` or `HTTPS`.
- Chrome/Safari may block microphone start until a direct user gesture happens on the page.
- On macOS, browser-level permission is not enough if Camera or Microphone access is disabled in System Settings.

## Troubleshooting

- `CAMERA ONLINE` but no hand tracking:
  MediaPipe WASM and model files must load successfully. On deployed builds, this depends on the correct GitHub Pages base path.
- `MIC DENIED`:
  Browser or OS microphone permission is blocked.
- `MIC BUSY`:
  Another app is already using the microphone.
- `VID:1280x720 RS:4 live/EN`:
  The camera stream is active and the video element is receiving frames.

## Notes

- This is a browser-based performance prototype, not studio-grade autotune.
- The audio path is closer to live pitch shifting and effect modulation than to note-correction vocal processing.
