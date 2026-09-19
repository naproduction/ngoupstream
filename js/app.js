/**
 * NGROUPSTREAM - DECENTRALIZED P2P CLIENT CONTROLLER
 * Zero Third-Party Servers. Direct WebRTC NAT Hole Punching.
 * High-Grade UI with Theater Screen Share, Audio Visualizer, and Direct P2P Chat.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Header Elements
  const roomNameDisplay = document.getElementById('roomNameDisplay');
  const participantCount = document.getElementById('participantCount');
  const latencyDisplay = document.getElementById('latencyDisplay');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const btnSettings = document.getElementById('btnSettings');

  // Stage & Tiles
  const stageContainer = document.getElementById('stageContainer');
  const screenStage = document.getElementById('screenStage');
  const screenVideo = document.getElementById('screenVideo');
  const screenPresenterName = document.getElementById('screenPresenterName');
  const screenQualityBadge = document.getElementById('screenQualityBadge');
  const btnPipScreen = document.getElementById('btnPipScreen');
  const btnFullscreenScreen = document.getElementById('btnFullscreenScreen');
  const participantsGrid = document.getElementById('participantsGrid');

  // Local User Elements
  const localTile = document.getElementById('localTile');
  const localVideo = document.getElementById('localVideo');
  const localAvatar = document.getElementById('localAvatar');
  const localAvatarCircle = document.getElementById('localAvatarCircle');
  const localUserName = document.getElementById('localUserName');
  const localSpeakingHalo = document.getElementById('localSpeakingHalo');
  const localMicStatus = document.getElementById('localMicStatus');
  const localCamStatus = document.getElementById('localCamStatus');

  // Dock Buttons
  const btnToggleMic = document.getElementById('btnToggleMic');
  const btnToggleCam = document.getElementById('btnToggleCam');
  const btnToggleScreen = document.getElementById('btnToggleScreen');
  const btnToggleChat = document.getElementById('btnToggleChat');
  const btnLeaveCall = document.getElementById('btnLeaveCall');
  const iconMic = document.getElementById('iconMic');
  const iconCam = document.getElementById('iconCam');
  const iconScreen = document.getElementById('iconScreen');
  const labelScreen = document.getElementById('labelScreen');
  const micGlowRing = document.getElementById('micGlowRing');
  const chatUnreadBadge = document.getElementById('chatUnreadBadge');

  // Side Panel
  const sidePanel = document.getElementById('sidePanel');
  const btnClosePanel = document.getElementById('btnClosePanel');
  const tabChatBtn = document.getElementById('tabChatBtn');
  const tabUsersBtn = document.getElementById('tabUsersBtn');
  const chatTabContent = document.getElementById('chatTabContent');
  const usersTabContent = document.getElementById('usersTabContent');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const participantsList = document.getElementById('participantsList');

  // Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnCancelSettings = document.getElementById('btnCancelSettings');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const selectAudioInput = document.getElementById('selectAudioInput');
  const selectVideoInput = document.getElementById('selectVideoInput');
  const selectAudioOutput = document.getElementById('selectAudioOutput');
  const selectNetworkMode = document.getElementById('selectNetworkMode');
  const selectScreenPreset = document.getElementById('selectScreenPreset');
  const checkNoiseSuppression = document.getElementById('checkNoiseSuppression');
  const checkEchoCancellation = document.getElementById('checkEchoCancellation');

  // Lobby Modal
  const lobbyModal = document.getElementById('lobbyModal');
  const previewVideo = document.getElementById('previewVideo');
  const previewAvatar = document.getElementById('previewAvatar');
  const btnPreviewMic = document.getElementById('btnPreviewMic');
  const btnPreviewCam = document.getElementById('btnPreviewCam');
  const inputUsername = document.getElementById('inputUsername');
  const inputRoomId = document.getElementById('inputRoomId');
  const btnEnterRoom = document.getElementById('btnEnterRoom');

  // App State
  let currentRoomId = 'general';
  let myUsername = 'You';
  let isMuted = false;
  let isCamOff = false;
  let isScreenSharing = false;
  let unreadChatCount = 0;
  let previewStream = null;

  // Media Streams
  let localMediaStream = null;
  let localScreenStream = null;

  // Decentralized Room
  let p2pRoom = null;
  let sendChatAction = null;
  let sendMetaAction = null;

  // Remote participants: peerId -> { username, tileEl, videoEl, isMuted, isCamOff, hasScreen }
  const remotePeers = new Map();
  let activeScreenPresenterId = null;

  // Audio analysis
  let audioContext = null;
  let analyser = null;

  // 1. Resolve Room ID from URL
  function resolveRoomId() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('room=')) {
      return hash.replace('room=', '').toLowerCase();
    }
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'room' && pathParts[1]) {
      return pathParts[1].toLowerCase();
    }
    return 'p2p-' + Math.random().toString(36).substring(2, 7);
  }

  currentRoomId = resolveRoomId();
  roomNameDisplay.textContent = currentRoomId;
  inputRoomId.value = currentRoomId;

  // Stored username
  const savedName = localStorage.getItem('ngroup_username');
  if (savedName) {
    inputUsername.value = savedName;
  } else {
    inputUsername.value = 'User-' + Math.floor(1000 + Math.random() * 9000);
  }

  // 2. Camera & Mic Preview
  try {
    previewStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    previewVideo.srcObject = previewStream;
    previewAvatar.classList.add('hidden');
  } catch (e) {
    console.log('Preview media unavailable, using avatar mode:', e.message);
    previewAvatar.classList.remove('hidden');
  }

  let lobbyMuted = false;
  let lobbyCamOff = false;

  btnPreviewMic.addEventListener('click', () => {
    lobbyMuted = !lobbyMuted;
    if (previewStream && previewStream.getAudioTracks()[0]) {
      previewStream.getAudioTracks()[0].enabled = !lobbyMuted;
    }
    btnPreviewMic.classList.toggle('muted', lobbyMuted);
    btnPreviewMic.innerHTML = `<i data-lucide="${lobbyMuted ? 'mic-off' : 'mic'}"></i>`;
    lucide.createIcons();
  });

  btnPreviewCam.addEventListener('click', () => {
    lobbyCamOff = !lobbyCamOff;
    if (previewStream && previewStream.getVideoTracks()[0]) {
      previewStream.getVideoTracks()[0].enabled = !lobbyCamOff;
    }
    previewAvatar.classList.toggle('hidden', !lobbyCamOff);
    btnPreviewCam.classList.toggle('muted', lobbyCamOff);
    btnPreviewCam.innerHTML = `<i data-lucide="${lobbyCamOff ? 'video-off' : 'video'}"></i>`;
    lucide.createIcons();
  });

  // 3. Enter Room Trigger
  btnEnterRoom.addEventListener('click', async () => {
    const rawUsername = inputUsername.value.trim();
    if (!rawUsername) {
      showToast('Please enter your display name', 'error');
      return;
    }

    myUsername = rawUsername;
    localStorage.setItem('ngroup_username', myUsername);

    const enteredRoom = inputRoomId.value.trim() || currentRoomId;
    currentRoomId = enteredRoom;
    roomNameDisplay.textContent = currentRoomId;

    // Set clean hash in URL
    window.location.hash = `room=${currentRoomId}`;

    // Release preview stream
    if (previewStream) {
      previewStream.getTracks().forEach(t => t.stop());
    }

    lobbyModal.classList.add('hidden');
    await startP2PSession();
  });

  // 4. Initialize Decentralized P2P Session
  async function startP2PSession() {
    localUserName.textContent = `${myUsername} (You)`;
    localAvatarCircle.textContent = myUsername.substring(0, 2).toUpperCase();

    // Acquire Local User Media
    try {
      localMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: checkEchoCancellation.checked,
          noiseSuppression: checkNoiseSuppression.checked
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });
      localVideo.srcObject = localMediaStream;
      localAvatar.classList.add('hidden');
      setupLocalAudioVisualizer(localMediaStream);
    } catch (err) {
      console.warn('Webcam/Mic access denied or unavailable:', err);
      localAvatar.classList.remove('hidden');
    }

    if (lobbyMuted) toggleMic(true);
    if (lobbyCamOff) toggleCam(true);

    // Join Decentralized Swarm (Default: BitTorrent DHT / Trackers)
    const p2pConfig = {
      appId: 'ngroupstream-p2p-v2'
    };

    const mode = selectNetworkMode ? selectNetworkMode.value : 'torrent';
    if (mode === 'nostr' && window.P2P.joinNostrRoom) {
      p2pRoom = window.P2P.joinNostrRoom(p2pConfig, currentRoomId);
      latencyDisplay.textContent = 'P2P (Nostr)';
    } else {
      p2pRoom = window.P2P.joinTorrentRoom(p2pConfig, currentRoomId);
      latencyDisplay.textContent = 'P2P (BitTorrent)';
    }

    // Direct P2P Actions (Chat & Meta)
    const [sendChat, getChat] = p2pRoom.makeAction('chat');
    const [sendMeta, getMeta] = p2pRoom.makeAction('meta');
    sendChatAction = sendChat;
    sendMetaAction = sendMeta;

    // Incoming P2P Chat
    getChat((msg, peerId) => {
      appendChatMessage(msg);
      if (sidePanel.classList.contains('collapsed')) {
        unreadChatCount++;
        chatUnreadBadge.textContent = unreadChatCount;
        chatUnreadBadge.classList.remove('hidden');
      }
    });

    // Incoming Peer State Updates
    getMeta((meta, peerId) => {
      let peer = remotePeers.get(peerId);
      if (!peer) {
        addRemoteParticipantTile(peerId, meta.username || `User-${peerId.substring(0, 4)}`);
        peer = remotePeers.get(peerId);
      }

      if (meta.username) {
        peer.username = meta.username;
        const nameEl = peer.tileEl.querySelector('.user-name');
        if (nameEl) nameEl.textContent = meta.username;
        updateParticipantsList();
      }

      if (typeof meta.isMuted !== 'undefined') {
        peer.isMuted = meta.isMuted;
        const micIcon = peer.tileEl.querySelector('.remote-mic-status');
        if (micIcon) {
          micIcon.classList.toggle('muted', meta.isMuted);
          micIcon.innerHTML = `<i data-lucide="${meta.isMuted ? 'mic-off' : 'mic'}"></i>`;
          lucide.createIcons();
        }
      }

      if (typeof meta.isCamOff !== 'undefined') {
        peer.isCamOff = meta.isCamOff;
        const avatarEl = peer.tileEl.querySelector('.avatar-fallback');
        if (avatarEl) {
          avatarEl.classList.toggle('hidden', !meta.isCamOff);
        }
      }

      if (typeof meta.isSpeaking !== 'undefined') {
        const halo = peer.tileEl.querySelector('.speaking-halo');
        if (halo) halo.classList.toggle('active', meta.isSpeaking);
        peer.tileEl.classList.toggle('speaking', meta.isSpeaking);
      }
    });

    // When a Peer Joins the P2P Swarm
    p2pRoom.onPeerJoin((peerId) => {
      console.log('[P2P] Peer joined swarm:', peerId);
      addRemoteParticipantTile(peerId, `User-${peerId.substring(0, 4)}`);
      updateParticipantsCount();
      showToast('A peer connected directly via P2P', 'info');

      // Send our identity and current media states
      sendMeta({
        username: myUsername,
        isMuted,
        isCamOff
      }, peerId);

      // Send local streams to this peer
      if (localMediaStream) {
        p2pRoom.addStream(localMediaStream, { target: peerId, metadata: { type: 'cam' } });
      }
      if (localScreenStream) {
        p2pRoom.addStream(localScreenStream, { target: peerId, metadata: { type: 'screen' } });
      }
    });

    // When a Peer Leaves the Swarm
    p2pRoom.onPeerLeave((peerId) => {
      console.log('[P2P] Peer left swarm:', peerId);
      const peer = remotePeers.get(peerId);
      const name = peer ? peer.username : 'Participant';
      removeRemoteParticipantTile(peerId);
      updateParticipantsCount();
      showToast(`${name} left the room`, 'info');

      if (activeScreenPresenterId === peerId) {
        stopScreenStage();
      }
    });

    // Incoming Media Streams from Peers
    p2pRoom.onPeerStream = (stream, peerId, metadata) => {
      console.log('[P2P] Received stream from peer:', peerId, metadata);

      let peer = remotePeers.get(peerId);
      if (!peer) {
        addRemoteParticipantTile(peerId, `User-${peerId.substring(0, 4)}`);
        peer = remotePeers.get(peerId);
      }

      const isScreen = (metadata && metadata.type === 'screen') || 
        stream.getVideoTracks().length > 0 && (stream.getVideoTracks()[0].label.toLowerCase().includes('screen') || stream.id.toLowerCase().includes('screen'));

      if (isScreen) {
        activeScreenPresenterId = peerId;
        screenVideo.srcObject = stream;
        screenPresenterName.textContent = `${peer.username}'s Screen`;
        screenStage.classList.remove('hidden');
        updateGridLayout();
        showToast(`${peer.username} started screen sharing`, 'info');
        return;
      }

      // Normal webcam / mic stream
      if (peer.videoEl) {
        peer.videoEl.srcObject = stream;
        const avatarEl = peer.tileEl.querySelector('.avatar-fallback');
        if (avatarEl && stream.getVideoTracks().length > 0) {
          avatarEl.classList.add('hidden');
        }
      }
    };

    // Broadcast our initial stream to the room
    if (localMediaStream) {
      p2pRoom.addStream(localMediaStream, { metadata: { type: 'cam' } });
    }

    showToast(`Connected to decentralized room: ${currentRoomId}`, 'success');
  }

  // 5. Tile & Grid Layout Management
  function addRemoteParticipantTile(peerId, username) {
    if (remotePeers.has(peerId)) return;

    const tile = document.createElement('div');
    tile.className = 'participant-tile';
    tile.id = `tile-${peerId}`;

    const initials = username.substring(0, 2).toUpperCase();

    tile.innerHTML = `
      <div class="video-container">
        <video id="video-${peerId}" autoplay playsinline></video>
        <div class="avatar-fallback" id="avatar-${peerId}">
          <div class="avatar-circle">${initials}</div>
        </div>
      </div>
      <div class="tile-bar">
        <div class="user-meta">
          <span class="speaking-halo"></span>
          <span class="user-name">${username}</span>
        </div>
        <div class="tile-status-icons">
          <span class="status-icon remote-mic-status">
            <i data-lucide="mic"></i>
          </span>
          <span class="status-icon remote-cam-status">
            <i data-lucide="video"></i>
          </span>
        </div>
      </div>
    `;

    participantsGrid.appendChild(tile);
    lucide.createIcons();

    const videoEl = tile.querySelector('video');
    remotePeers.set(peerId, {
      username,
      tileEl: tile,
      videoEl,
      isMuted: false,
      isCamOff: false
    });

    updateGridLayout();
    updateParticipantsList();
  }

  function removeRemoteParticipantTile(peerId) {
    const peer = remotePeers.get(peerId);
    if (peer && peer.tileEl) {
      peer.tileEl.remove();
    }
    remotePeers.delete(peerId);
    updateGridLayout();
    updateParticipantsList();
  }

  function updateParticipantsCount() {
    participantCount.textContent = `${remotePeers.size + 1} Online`;
  }

  function updateGridLayout() {
    const totalTiles = remotePeers.size + 1;
    participantsGrid.className = 'participants-grid';

    if (!screenStage.classList.contains('hidden')) {
      participantsGrid.classList.add('layout-strip');
    } else if (totalTiles === 1) {
      participantsGrid.classList.add('layout-hero');
    } else if (totalTiles === 2) {
      participantsGrid.classList.add('layout-dual');
    } else {
      participantsGrid.classList.add('layout-grid');
    }
  }

  function stopScreenStage() {
    screenStage.classList.add('hidden');
    screenVideo.srcObject = null;
    activeScreenPresenterId = null;
    updateGridLayout();
  }

  // 6. Dock Controls
  btnToggleMic.addEventListener('click', () => toggleMic());
  btnToggleCam.addEventListener('click', () => toggleCam());

  function toggleMic(forceState) {
    if (typeof forceState === 'boolean') {
      isMuted = forceState;
    } else {
      isMuted = !isMuted;
    }

    if (localMediaStream) {
      const track = localMediaStream.getAudioTracks()[0];
      if (track) track.enabled = !isMuted;
    }

    btnToggleMic.classList.toggle('muted', isMuted);
    iconMic.setAttribute('data-lucide', isMuted ? 'mic-off' : 'mic');
    localMicStatus.classList.toggle('muted', isMuted);
    localMicStatus.innerHTML = `<i data-lucide="${isMuted ? 'mic-off' : 'mic'}"></i>`;
    lucide.createIcons();

    if (sendMetaAction) {
      sendMetaAction({ isMuted });
    }
    showToast(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  }

  function toggleCam(forceState) {
    if (typeof forceState === 'boolean') {
      isCamOff = forceState;
    } else {
      isCamOff = !isCamOff;
    }

    if (localMediaStream) {
      const track = localMediaStream.getVideoTracks()[0];
      if (track) track.enabled = !isCamOff;
    }

    btnToggleCam.classList.toggle('muted', isCamOff);
    iconCam.setAttribute('data-lucide', isCamOff ? 'video-off' : 'video');
    localAvatar.classList.toggle('hidden', !isCamOff);
    localCamStatus.classList.toggle('muted', isCamOff);
    localCamStatus.innerHTML = `<i data-lucide="${isCamOff ? 'video-off' : 'video'}"></i>`;
    lucide.createIcons();

    if (sendMetaAction) {
      sendMetaAction({ isCamOff });
    }
    showToast(isCamOff ? 'Camera turned off' : 'Camera turned on', 'info');
  }

  // 60 FPS Screen Sharing
  btnToggleScreen.addEventListener('click', async () => {
    if (!isScreenSharing) {
      await startScreenShare();
    } else {
      stopScreenShare();
    }
  });

  async function startScreenShare() {
    let preset = selectScreenPreset.value;
    let videoConstraints = {
      frameRate: { ideal: 60, max: 60 },
      width: { ideal: 1920 }
    };

    if (preset === 'balanced') {
      videoConstraints = { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1920 } };
    } else if (preset === 'text') {
      videoConstraints = { frameRate: { ideal: 30 }, width: { ideal: 2560 } };
    }

    try {
      localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: videoConstraints,
        audio: true
      });

      isScreenSharing = true;
      btnToggleScreen.classList.add('active');
      iconScreen.setAttribute('data-lucide', 'screen-share-off');
      labelScreen.textContent = 'Stop';
      lucide.createIcons();

      // Show on our theater stage
      screenVideo.srcObject = localScreenStream;
      screenPresenterName.textContent = `${myUsername} (Your Screen)`;
      screenStage.classList.remove('hidden');
      updateGridLayout();

      // Broadcast to P2P swarm
      if (p2pRoom) {
        p2pRoom.addStream(localScreenStream, { metadata: { type: 'screen' } });
      }

      showToast('60 FPS Screen sharing active', 'success');

      localScreenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  }

  function stopScreenShare() {
    if (!localScreenStream) return;

    localScreenStream.getTracks().forEach(t => t.stop());
    if (p2pRoom) {
      p2pRoom.removeStream(localScreenStream);
    }
    localScreenStream = null;
    isScreenSharing = false;

    btnToggleScreen.classList.remove('active');
    iconScreen.setAttribute('data-lucide', 'screen-share');
    labelScreen.textContent = 'Share';
    lucide.createIcons();

    stopScreenStage();
    showToast('Screen sharing stopped', 'info');
  }

  // Fullscreen & PiP for Screen Share
  btnFullscreenScreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      screenStage.requestFullscreen().catch(e => console.warn(e));
    } else {
      document.exitFullscreen();
    }
  });

  btnPipScreen.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (screenVideo.srcObject) {
        await screenVideo.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP not supported:', e);
    }
  });

  // 7. Audio Visualizer (Speaking Halo)
  function setupLocalAudioVisualizer(stream) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let wasSpeaking = false;

      setInterval(() => {
        if (!analyser || isMuted) {
          if (wasSpeaking) {
            wasSpeaking = false;
            localSpeakingHalo.classList.remove('active');
            localTile.classList.remove('speaking');
            micGlowRing.classList.remove('active');
            if (sendMetaAction) sendMetaAction({ isSpeaking: false });
          }
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        const isSpeaking = avg > 18;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          localSpeakingHalo.classList.toggle('active', isSpeaking);
          localTile.classList.toggle('speaking', isSpeaking);
          micGlowRing.classList.toggle('active', isSpeaking);
          if (sendMetaAction) sendMetaAction({ isSpeaking });
        }
      }, 100);
    } catch (e) {
      console.warn('Web Audio speaking detector unavailable:', e);
    }
  }

  // 8. Direct P2P Chat
  btnToggleChat.addEventListener('click', () => {
    const isCollapsed = sidePanel.classList.toggle('collapsed');
    btnToggleChat.classList.toggle('active', !isCollapsed);
    if (!isCollapsed) {
      unreadChatCount = 0;
      chatUnreadBadge.classList.add('hidden');
      chatInput.focus();
    }
  });

  btnClosePanel.addEventListener('click', () => {
    sidePanel.classList.add('collapsed');
    btnToggleChat.classList.remove('active');
  });

  tabChatBtn.addEventListener('click', () => {
    tabChatBtn.classList.add('active');
    tabUsersBtn.classList.remove('active');
    chatTabContent.classList.remove('hidden');
    usersTabContent.classList.add('hidden');
  });

  tabUsersBtn.addEventListener('click', () => {
    tabUsersBtn.classList.add('active');
    tabChatBtn.classList.remove('active');
    usersTabContent.classList.remove('hidden');
    chatTabContent.classList.add('hidden');
    updateParticipantsList();
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderName: myUsername,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    appendChatMessage(msg, true);
    if (sendChatAction) {
      sendChatAction(msg);
    }
    chatInput.value = '';
  });

  function appendChatMessage(msg, isMine = false) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMine ? 'mine' : 'other'}`;

    bubble.innerHTML = `
      <div class="bubble-meta">
        <span class="bubble-sender">${isMine ? 'You' : msg.senderName}</span>
        <span class="bubble-time">${msg.timestamp}</span>
      </div>
      <div class="bubble-text">${escapeHtml(msg.text)}</div>
    `;

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function updateParticipantsList() {
    participantsList.innerHTML = `
      <div class="user-item">
        <div class="user-item-left">
          <div class="user-avatar-mini">${myUsername.substring(0, 2).toUpperCase()}</div>
          <span class="user-item-name">${myUsername} (You)</span>
        </div>
      </div>
    `;

    for (const [peerId, peer] of remotePeers.entries()) {
      const item = document.createElement('div');
      item.className = 'user-item';
      item.innerHTML = `
        <div class="user-item-left">
          <div class="user-avatar-mini">${peer.username.substring(0, 2).toUpperCase()}</div>
          <span class="user-item-name">${peer.username}</span>
        </div>
      `;
      participantsList.appendChild(item);
    }
  }

  // 9. Copy Room Link with 1-Click
  btnCopyLink.addEventListener('click', async () => {
    const fullUrl = `${window.location.origin}${window.location.pathname}#room=${currentRoomId}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast('P2P Room link copied to clipboard!', 'success');
      btnCopyLink.querySelector('.btn-label').textContent = 'Copied!';
      setTimeout(() => {
        btnCopyLink.querySelector('.btn-label').textContent = 'Share Link';
      }, 2500);
    } catch (e) {
      prompt('Copy this room link to share:', fullUrl);
    }
  });

  // 10. Settings Modal
  btnSettings.addEventListener('click', async () => {
    settingsModal.classList.remove('hidden');
    await populateMediaDevices();
  });

  btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
  btnCancelSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
  btnSaveSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    showToast('Preferences applied', 'success');
  });

  async function populateMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      selectAudioInput.innerHTML = '';
      selectVideoInput.innerHTML = '';
      selectAudioOutput.innerHTML = '';

      devices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `${device.kind} (${selectAudioInput.length + 1})`;

        if (device.kind === 'audioinput') selectAudioInput.appendChild(option);
        else if (device.kind === 'videoinput') selectVideoInput.appendChild(option);
        else if (device.kind === 'audiooutput') selectAudioOutput.appendChild(option);
      });
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  }

  // 11. Leave Call
  btnLeaveCall.addEventListener('click', () => {
    if (confirm('Leave this room?')) {
      if (p2pRoom) p2pRoom.leave();
      window.location.reload();
    }
  });

  // 12. Hotkeys
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key.toLowerCase() === 'm') btnToggleMic.click();
    else if (e.key.toLowerCase() === 'v') btnToggleCam.click();
    else if (e.key.toLowerCase() === 's') btnToggleScreen.click();
    else if (e.key.toLowerCase() === 'c') btnToggleChat.click();
  });

  // Toast System
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
