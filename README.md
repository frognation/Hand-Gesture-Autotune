# Hand Gesture Autotune

웹캠으로 손동작을 인식하고, 마이크 입력 음성을 손가락 접힘 상태에 따라 실시간으로 피치 변조하는 웹앱입니다.

## 동작 규칙

- 손을 다 펴면 기본 톤
- 엄지 접힘: `-5 semitones`
- 검지 접힘: `+3 semitones`
- 중지 접힘: `+7 semitones`
- 약지 접힘: `+10 semitones`
- 소지 접힘: `+14 semitones`
- 주먹: 강한 피치 이동 + 딜레이 + 왜곡 + 오토필터

여러 손가락을 동시에 접으면 각 손가락의 값이 합산됩니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 표시된 `localhost` 주소를 열고 카메라/마이크 권한을 허용하면 됩니다.

## 사용 기술

- Vite
- MediaPipe Tasks Vision `HandLandmarker`
- Tone.js

## 주의

- 마이크와 카메라는 `localhost` 또는 HTTPS 환경에서만 정상 동작합니다.
- 현재 구현은 브라우저 기반 실시간 퍼포먼스용 프로토타입입니다.
- 진짜 스튜디오급 오토튠처럼 음정 보정하는 구조가 아니라, 손동작 기반 실시간 피치 시프팅/이펙트 변조에 가깝습니다.
