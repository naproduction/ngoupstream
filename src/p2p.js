import { joinRoom as joinTorrentRoom } from '@trystero-p2p/torrent';
import { joinRoom as joinNostrRoom } from '@trystero-p2p/nostr';

window.P2P = {
  joinTorrentRoom,
  joinNostrRoom
};

console.log('[P2P] Decentralized WebRTC Engine initialized (Torrent DHT + Nostr Relays). Zero third-party servers.');
