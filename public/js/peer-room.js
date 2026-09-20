/**
 * NGROUPSTREAM - INSTANT P2P ROOM ENGINE (POWERED BY PEERJS)
 * Connects in under 500ms. Zero BitTorrent announce delays.
 * Full-mesh WebRTC for 60fps screen sharing, voice/video calling, and direct data chat.
 */

class PeerRoom {
  constructor(roomId, username, localStream) {
    this.roomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'general';
    this.username = username || 'User-' + Math.floor(1000 + Math.random() * 9000);
    this.localStream = localStream;
    this.localScreenStream = null;

    this.peer = null;
    this.myPeerId = null;
    this.isHost = false;
    this.hostId = `ngroup-host-${this.roomId}`;

    // Active connections: peerId -> { conn: DataConnection, call: MediaConnection, screenCall: MediaConnection, username }
    this.connectedPeers = new Map();

    // Callbacks to UI
    this.onPeerJoined = null;
    this.onPeerLeft = null;
    this.onRemoteStream = null;
    this.onRemoteScreenStream = null;
    this.onRemoteScreenStopped = null;
    this.onChatMessage = null;
    this.onPeerMeta = null;
    this.onStatusChange = null;

    this.peerConfig = {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ]
      }
    };
  }

  async init() {
    this._updateStatus('Connecting to P2P network...');
    return new Promise((resolve) => {
      // First attempt: try to be the room host
      this._initAsHost((success) => {
        if (success) {
          resolve(true);
        } else {
          // If host ID is taken, join as guest
          this._initAsGuest(() => resolve(true));
        }
      });
    });
  }

  _initAsHost(callback) {
    let resolved = false;
    const peer = new Peer(this.hostId, this.peerConfig);

    peer.on('open', (id) => {
      if (resolved) return;
      resolved = true;
      this.peer = peer;
      this.myPeerId = id;
      this.isHost = true;
      this._setupListeners();
      this._updateStatus('Host (Room Ready)');
      callback(true);
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Someone is already the host for this room
        if (!resolved) {
          resolved = true;
          peer.destroy();
          callback(false);
        }
      } else {
        console.warn('[P2P Host Error]:', err.type, err.message);
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        peer.destroy();
        callback(false);
      }
    }, 4000);
  }

  _initAsGuest(callback) {
    const guestId = `ngroup-peer-${Math.random().toString(36).substring(2, 8)}`;
    const peer = new Peer(guestId, this.peerConfig);

    peer.on('open', (id) => {
      this.peer = peer;
      this.myPeerId = id;
      this.isHost = false;
      this._setupListeners();
      this._updateStatus('Connected to Room');

      // Connect data channel to room host
      const conn = peer.connect(this.hostId, {
        metadata: { username: this.username }
      });

      this._handleDataConnection(conn);

      // Call host with local stream
      if (this.localStream) {
        const call = peer.call(this.hostId, this.localStream, {
          metadata: { type: 'cam', username: this.username }
        });
        this._handleMediaCall(call);
      }

      callback(true);
    });

    peer.on('error', (err) => {
      console.error('[P2P Guest Error]:', err.type, err.message);
      this._updateStatus('Reconnecting...');
    });
  }

  _setupListeners() {
    // 1. Incoming P2P Data Connections
    this.peer.on('connection', (conn) => {
      this._handleDataConnection(conn);
    });

    // 2. Incoming WebRTC Media Calls (Cam or Screen Share)
    this.peer.on('call', (call) => {
      this._handleMediaCall(call);
    });

    // 3. Disconnect handling
    this.peer.on('disconnected', () => {
      this._updateStatus('Disconnected. Reconnecting...');
      this.peer.reconnect();
    });
  }

  _handleDataConnection(conn) {
    conn.on('open', () => {
      const peerId = conn.peer;
      const username = conn.metadata?.username || `User-${peerId.substring(peerId.length - 4)}`;

      let peerObj = this.connectedPeers.get(peerId) || {};
      peerObj.conn = conn;
      peerObj.username = username;
      this.connectedPeers.set(peerId, peerObj);

      if (this.onPeerJoined) {
        this.onPeerJoined(peerId, username);
      }

      // If I am the host, inform the new guest about all existing peers in the room
      if (this.isHost) {
        const otherPeerIds = Array.from(this.connectedPeers.keys()).filter((id) => id !== peerId);
        conn.send({
          type: 'room-peers',
          peers: otherPeerIds,
          hostUsername: this.username
        });
      }

      // If I have an active screen share, call the newly joined peer with the screen stream
      if (this.localScreenStream) {
        const screenCall = this.peer.call(peerId, this.localScreenStream, {
          metadata: { type: 'screen', username: this.username }
        });
        peerObj.screenCall = screenCall;
      }
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'room-peers' && Array.isArray(data.peers)) {
        // Guest receives list of other peers from the host -> connect to each of them!
        data.peers.forEach((remoteId) => {
          if (remoteId !== this.myPeerId && !this.connectedPeers.has(remoteId)) {
            const peerConn = this.peer.connect(remoteId, {
              metadata: { username: this.username }
            });
            this._handleDataConnection(peerConn);

            if (this.localStream) {
              const call = this.peer.call(remoteId, this.localStream, {
                metadata: { type: 'cam', username: this.username }
              });
              this._handleMediaCall(call);
            }
          }
        });
      } else if (data.type === 'chat') {
        if (this.onChatMessage) this.onChatMessage(data);
      } else if (data.type === 'meta') {
        if (this.onPeerMeta) this.onPeerMeta(conn.peer, data);
      } else if (data.type === 'screen-stop') {
        if (this.onRemoteScreenStopped) this.onRemoteScreenStopped(conn.peer);
      }
    });

    conn.on('close', () => {
      this._removePeer(conn.peer);
    });

    conn.on('error', () => {
      this._removePeer(conn.peer);
    });
  }

  _handleMediaCall(call) {
    const isScreen = call.metadata?.type === 'screen';
    const remoteId = call.peer;
    const username = call.metadata?.username;

    // Answer call (if cam call, send our stream back; if screen, answer without sending our stream)
    call.answer(isScreen ? null : this.localStream);

    call.on('stream', (remoteStream) => {
      if (isScreen) {
        if (this.onRemoteScreenStream) {
          this.onRemoteScreenStream(remoteId, remoteStream, username);
        }
      } else {
        if (this.onRemoteStream) {
          this.onRemoteStream(remoteId, remoteStream, username);
        }
      }
    });

    call.on('close', () => {
      if (isScreen && this.onRemoteScreenStopped) {
        this.onRemoteScreenStopped(remoteId);
      }
    });
  }

  _removePeer(peerId) {
    if (this.connectedPeers.has(peerId)) {
      const peerObj = this.connectedPeers.get(peerId);
      this.connectedPeers.delete(peerId);
      if (this.onPeerLeft) {
        this.onPeerLeft(peerId, peerObj.username);
      }
    }
  }

  _updateStatus(text) {
    if (this.onStatusChange) this.onStatusChange(text);
  }

  // Broadcast data to all connected peers
  broadcast(data) {
    for (const [peerId, peerObj] of this.connectedPeers.entries()) {
      if (peerObj.conn && peerObj.conn.open) {
        peerObj.conn.send(data);
      }
    }
  }

  // Start 60fps Screen Share
  startScreenShare(screenStream) {
    this.localScreenStream = screenStream;

    // Call all connected peers with the screen stream
    for (const [peerId, peerObj] of this.connectedPeers.entries()) {
      const call = this.peer.call(peerId, screenStream, {
        metadata: { type: 'screen', username: this.username }
      });
      peerObj.screenCall = call;
    }
  }

  // Stop Screen Share
  stopScreenShare() {
    this.broadcast({ type: 'screen-stop' });
    this.localScreenStream = null;
  }

  leave() {
    if (this.peer) {
      this.peer.destroy();
    }
  }
}

window.PeerRoom = PeerRoom;
