const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Any path routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, () => {
  const localIp = getLocalIp();
  console.log(`
===================================================================
  🌐 NGROUPSTREAM - DECENTRALIZED P2P STREAM & CALLING
===================================================================
  Status:           ONLINE (100% Serverless & Private)
  Local Host:       http://localhost:${PORT}
  LAN Access:       http://${localIp}:${PORT}
  Architecture:     BitTorrent DHT + Nostr Relays (Zero Third Parties)
===================================================================
  NO TUNNELS. NO THIRD-PARTY LOGS. NO IP SPLASH SCREENS.
  All media streams directly machine-to-machine via WebRTC DTLS 1.3.
===================================================================
  Tip: You can also deploy the 'public' folder directly to GitHub
  Pages or any free static host for permanent public HTTPS access!
===================================================================
  `);
});
