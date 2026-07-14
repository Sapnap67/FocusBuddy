# FocusBuddy 🐱

**Your Focus Companion** — a webcam that watches you study, and a pixel pet that starves when you slack off.

## What is this

An AI-powered focus detection system using your webcam to determine if you're paying attention. Pair it with a Pomodoro timer and an ESP32 LED pixel pet for real-time feedback.

- 📷 Triple detection: face orientation + eye closure + head turning
- 🍅 Pomodoro timer (25min focus / 5min break)
- 🐱 ESP32 8×8 LED pixel pet (real-time expression changes)
- 📊 Focus stats + visualization charts

## Quick Start

```bash
# Web app
Double-click 启动MVP.bat
# or: python -m http.server 8080
# → http://localhost:8080/mvp.html

# ESP32 Hardware
# 1. Upload esp32/FocusBuddy_Matrix/FocusBuddy_Matrix.ino
# 2. Connect WiFi: FocusBuddy / 12345678
# 3. Control panel: http://10.10.10.1/
```

## Tech Stack

- **AI Detection:** MediaPipe FaceMesh (468 landmarks)
- **Frontend:** HTML/CSS/JS + Chart.js
- **Hardware:** ESP32-S3-Matrix (8×8 NeoPixel)
- **Communication:** WiFi HTTP (ESP32 AP mode)

## Team

Dream Team · HHCC 2026  
Vickie (Hardware & Vision) & Ryan (Frontend)

## License

MIT
