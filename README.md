# NgroupStream 🚀

**Production-grade, private peer-to-peer (P2P) screen sharing and voice/video calling application.**

100% Serverless & Decentralized. **Zero third-party tunnels, zero central servers, zero IP leak splash screens, and zero port forwarding required.** All media streams directly machine-to-machine via WebRTC (DTLS 1.3 / SRTP).

---

## ✨ Why This Architecture?

1. **NO Third-Party Tunnels**:
   - No Localtunnel, no Ngrok, no Cloudflare.
   - No anti-phishing warnings, no IP verification pages, no speed throttles.
2. **Decentralized NAT Hole Punching**:
   - Uses open, neutral protocols (**BitTorrent DHT swarm** and **Nostr relays**) exclusively for initial peer discovery.
   - Automatically punches through home routers and NAT firewalls via WebRTC ICE/STUN.
3. **100% Direct Encrypted Streaming**:
   - Screen sharing (up to 60 FPS), voice, webcam, and chat flow **directly computer-to-computer**.
   - No intermediary server ever handles, records, or processes your stream.
4. **Zero-Install for Guests**:
   - Anyone you send the link to opens it directly in their web browser (Chrome, Edge, Firefox, Safari).

---

## 🚀 How to Run

### Option 1: Run Locally (Host from your PC)
Double-click **`start.bat`** (or run in terminal):
```bash
npm start
```
This opens `http://localhost:3000`. Copy the invite link with one click and share it!

### Option 2: Deploy to GitHub Pages (Permanent Free Public HTTPS)
Because NgroupStream is 100% client-side serverless, you can deploy the `public/` folder to **GitHub Pages** (or Cloudflare Pages / Vercel static):
1. Create a free GitHub repository.
2. Push the files inside `public/`.
3. Enable GitHub Pages in repository settings.
4. Now you have a permanent, free, official HTTPS link (e.g. `https://yourname.github.io/#room=secret-code`) accessible from anywhere in the world with **zero backend servers to maintain**!

---

## 🎮 Features & Controls

- **📺 60 FPS Screen Sharing**:
  - Full display, window, or tab capture with audio.
  - Theater stage with Fullscreen and Picture-in-Picture (PiP).
  - Presets: *60 FPS Gaming*, *Balanced*, or *Crisp Detail*.
- **🎙️ Voice & Video Calling**:
  - AI Noise Suppression and Acoustic Echo Cancellation.
  - Real-time Web Audio speaking visualizer (pulsing green halo).
  - Microphone mute (`M`) and Camera toggle (`V`).
- **💬 Direct P2P Chat**:
  - Encrypted real-time text chat delivered straight between peer browsers.

### Keyboard Shortcuts
| Key | Action |
| :---: | :--- |
| `M` | Mute / Unmute Microphone |
| `V` | Turn Camera On / Off |
| `S` | Start / Stop Screen Share |
| `C` | Open / Close Chat Drawer |
