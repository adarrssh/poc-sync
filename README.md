# Video Sync App

This is a minimal full-stack app to sync video playback between a host and viewers in real time using Node.js, Express, Socket.IO, React, and Tailwind.

## Features
- Host and viewers join a room via URL (e.g., `?roomId=abc123`)
- Host's play, pause, and seek actions are synced to all viewers
- Video is streamed from a public S3 URL (not included in repo)

---

## Backend (Node.js + Express + Socket.IO)

### Setup
```bash
cd backend
npm install
```

### Run
```bash
npm start
```

---

## Frontend (React + Tailwind)

### Setup
```bash
cd frontend
npm install
```

### Run
```bash
npm start
```

---

## Usage
1. Start backend and frontend servers.
2. Open `/host?roomId=YOUR_ROOM_ID` in one browser (host).
3. Open `/viewer?roomId=YOUR_ROOM_ID` in another browser (viewer).
4. Both will watch the same video in sync.

---

## Notes
- No authentication or media upload.
- Only host can control playback; viewers are always synced.
- Video URL is hardcoded in the frontend for demo purposes. 