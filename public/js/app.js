/**
 * NGROUPSTREAM - PURE VOICE CALL & 60 FPS SCREEN SHARING
 * Zero Video Call (Camera removed completely).
 * Features:
 *  - Crystal-clear Audio Only (Noise Suppression & Echo Cancellation)
 *  - 60 FPS Ultra-Smooth Screen Sharing with Tab Audio
 *  - Discord-grade Voice Avatars with Speaking Animations
 *  - Real-time P2P Data Chat
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Header Elements
  const roomNameDisplay = document.getElementById('roomNameDisplay');
  const participantCount = document.getElementById('participantCount');
  const latencyDisplay = document.getElementById('latencyDisplay');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const btnSettings = document.getElementById('btnSettings');

  // Stage & Screen Share
  const stageContainer = document.getElementById('stageContainer');
  const screenStage = document.getElementById('screenStage');
  const screenVideo = document.getElementById('screenVideo');
  const screenPresenterName = document.getElementById('screenPresenterName');
  const btnPipScreen = document.getElementById('btnPipScreen');
  const btnFullscreenScreen = document.getElementById('btnFullscreenScreen');
  const participantsGrid = document.getElementById('participantsGrid');

  // Local Voice Tile
  const localTile = document.getElementById('localTile');
  const localAvatarCircle = document.getElementById('localAvatarCircle');
  const localUserName = document.getElementById('localUserName');
  const localSpeakingHalo = document.getElementById('localSpeakingHalo');
  const localMicStatus = document.getElementById('localMicStatus');

  // Dock Buttons (Voice + Screen Share only)
  const btnToggleMic = document.getElementById('btnToggleMic');
  const btnToggleScreen = document.getElementById('btnToggleScreen');
  const btnToggleChat = document.getElementById('btnToggleChat');
  const btnLeaveCall = document.getElementById('btnLeaveCall');
  const iconMic = document.getElementById('iconMic');
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
  const selectAudioOutput = document.getElementById('selectAudioOutput');
  const selectScreenPreset = document.getElementById('selectScreenPreset');
  const checkNoiseSuppression = document.getElementById('checkNoiseSuppression');
  const checkEchoCancellation = document.getElementById('checkEchoCancellation');

  // Lobby Modal (Voice Profile)
  const lobbyModal = document.getElementById('lobbyModal');
  const lobbyMicLevel = document.getElementById('lobbyMicLevel');
  const btnPreviewMic = document.getElementById('btnPreviewMic');
  const inputUsername = document.getElementById('inputUsername');
  const inputRoomId = document.getElementById('inputRoomId');
  const btnEnterRoom = document.getElementById('btnEnterRoom');

  // State
  let currentRoomId = 'general';
  let myUsername = 'You';
  let isMuted = false;
  let isScreenSharing = false;
  let unreadChatCount = 0;
  let previewStream = null;

  // Media Streams (Audio only for voice!)
  let localVoiceStream = null;
  let localScreenStream = null;

  // PeerRoom
  let peerRoom = null;
  const remotePeers = new Map(); // peerId -> { username, tileEl, audioEl, isMuted }
  let activeScreenPresenterId = null;

  // Web Audio Analysers
  let audioContext = null;
  let localAnalyser = null;

  // 1. Resolve Room ID
  function resolveRoomId() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('room=')) {
      return hash.replace('room=', '').toLowerCase();
    }
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'room' && pathParts[1]) {
      return pathParts[1].toLowerCase();
    }
    return 'room-' + Math.random().toString(36).substring(2, 7);
  }

  currentRoomId = resolveRoomId();
  roomNameDisplay.textContent = currentRoomId;
  inputRoomId.value = currentRoomId;

  // Stored name
  const savedName = localStorage.getItem('ngroup_username');
  if (savedName) {
    inputUsername.value = savedName;
  } else {
    inputUsername.value = 'User-' + Math.floor(1000 + Math.random() * 9000);
  }

  // 2. Microphone Test in Lobby (No Camera Requested!)
  try {
    previewStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false
    });
    setupLobbyMicMeter(previewStream);
  } catch (e) {
    console.log('Microphone preview unavailable:', e.message);
  }

  let lobbyMuted = false;
  btnPreviewMic.addEventListener('click', () => {
    lobbyMuted = !lobbyMuted;
    if (previewStream && previewStream.getAudioTracks()[0]) {
      previewStream.getAudioTracks()[0].enabled = !lobbyMuted;
    }
    btnPreviewMic.classList.toggle('muted', lobbyMuted);
    btnPreviewMic.innerHTML = `<i data-lucide="${lobbyMuted ? 'mic-off' : 'mic'}"></i>`;
    lucide.createIcons();
  });

  function setupLobbyMicMeter(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const anl = ctx.createAnalyser();
      anl.fftSize = 128;
      src.connect(anl);
      const data = new Uint8Array(anl.frequencyBinCount);

      const updateMeter = () => {
        if (!lobbyModal.classList.contains('hidden')) {
          anl.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const pct = Math.min(100, Math.round((avg / 128) * 100));
          if (lobbyMicLevel) lobbyMicLevel.style.width = `${pct}%`;
          requestAnimationFrame(updateMeter);
        } else {
          ctx.close().catch(() => {});
        }
      };
      updateMeter();
    } catch (e) {
      console.warn('Lobby mic meter failed:', e);
    }
  }

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

    window.location.hash = `room=${currentRoomId}`;

    if (previewStream) {
      previewStream.getTracks().forEach(t => t.stop());
    }

    lobbyModal.classList.add('hidden');
    await startVoiceSession();
  });

  // 4. Start Voice Call Session
  async function startVoiceSession() {
    localUserName.textContent = `${myUsername} (You)`;
    localAvatarCircle.textContent = myUsername.substring(0, 2).toUpperCase();

    // Acquire ONLY Microphone Audio (Never Camera!)
    try {
      localVoiceStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: checkEchoCancellation.checked,
          noiseSuppression: checkNoiseSuppression.checked
        },
        video: false
      });
      setupLocalAudioVisualizer(localVoiceStream);
    } catch (err) {
      console.warn('Microphone access denied:', err);
      showToast('Microphone access denied. You can still listen and chat.', 'error');
    }

    if (lobbyMuted) toggleMic(true);

    // Initialize P2P Room with Audio Stream
    peerRoom = new PeerRoom(currentRoomId, myUsername, localVoiceStream);

    peerRoom.onStatusChange = (status) => {
      latencyDisplay.textContent = status;
    };

    // Remote peer joined
    peerRoom.onPeerJoined = (peerId, username) => {
      addRemoteVoiceTile(peerId, username);
      updateParticipantsCount();
      showToast(`${username} connected to voice!`, 'success');

      peerRoom.broadcast({
        type: 'meta',
        isMuted
      });
    };

    // Remote peer left
    peerRoom.onPeerLeft = (peerId, username) => {
      removeRemoteVoiceTile(peerId);
      updateParticipantsCount();
      showToast(`${username} left the room`, 'info');

      if (activeScreenPresenterId === peerId) {
        stopScreenStage();
      }
    };

    // Remote voice audio stream arrives
    peerRoom.onRemoteStream = (peerId, stream, username) => {
      let peer = remotePeers.get(peerId);
      if (!peer) {
        addRemoteVoiceTile(peerId, username || 'Participant');
        peer = remotePeers.get(peerId);
      }

      if (peer && peer.audioEl) {
        peer.audioEl.srcObject = stream;
        setupRemoteAudioVisualizer(stream, peerId);
      }
    };

    // Remote screen sharing arrives
    peerRoom.onRemoteScreenStream = (peerId, stream, username) => {
      activeScreenPresenterId = peerId;
      screenVideo.srcObject = stream;
      screenPresenterName.textContent = `${username || 'Participant'}'s Screen`;
      screenStage.classList.remove('hidden');
      updateGridLayout();
      showToast(`${username || 'Participant'} started screen sharing (60 FPS)`, 'info');
    };

    // Remote screen sharing stopped
    peerRoom.onRemoteScreenStopped = (peerId) => {
      if (activeScreenPresenterId === peerId) {
        stopScreenStage();
        showToast('Screen share ended', 'info');
      }
    };

    // Incoming P2P Chat
    peerRoom.onChatMessage = (msg) => {
      appendChatMessage(msg);
      if (sidePanel.classList.contains('collapsed')) {
        unreadChatCount++;
        chatUnreadBadge.textContent = unreadChatCount;
        chatUnreadBadge.classList.remove('hidden');
      }
    };

    // Incoming Peer Meta (Mute / Speaking)
    peerRoom.onPeerMeta = (peerId, meta) => {
      let peer = remotePeers.get(peerId);
      if (!peer) return;

      if (typeof meta.isMuted !== 'undefined') {
        peer.isMuted = meta.isMuted;
        const micIcon = peer.tileEl.querySelector('.remote-mic-status');
        if (micIcon) {
          micIcon.classList.toggle('muted', meta.isMuted);
          micIcon.innerHTML = `<i data-lucide="${meta.isMuted ? 'mic-off' : 'mic'}"></i>`;
          lucide.createIcons();
        }
      }

      if (typeof meta.isSpeaking !== 'undefined') {
        const halo = peer.tileEl.querySelector('.speaking-halo');
        if (halo) halo.classList.toggle('active', meta.isSpeaking);
        peer.tileEl.classList.toggle('speaking', meta.isSpeaking);
      }
    };

    await peerRoom.init();
    showToast(`Voice room connected: ${currentRoomId}`, 'success');
  }

  // 5. Voice Participant Tile Management
  function addRemoteVoiceTile(peerId, username) {
    if (remotePeers.has(peerId)) return;

    const tile = document.createElement('div');
    tile.className = 'participant-tile';
    tile.id = `tile-${peerId}`;

    const initials = username ? username.substring(0, 2).toUpperCase() : 'P';

    tile.innerHTML = `
      <div class="voice-avatar-container">
        <div class="avatar-circle">${initials}</div>
        <div class="voice-wave-ring"></div>
        <audio id="audio-${peerId}" autoplay playsinline></audio>
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
        </div>
      </div>
    `;

    participantsGrid.appendChild(tile);
    lucide.createIcons();

    const audioEl = tile.querySelector('audio');
    remotePeers.set(peerId, {
      username,
      tileEl: tile,
      audioEl,
      isMuted: false
    });

    updateGridLayout();
    updateParticipantsList();
  }

  function removeRemoteVoiceTile(peerId) {
    const peer = remotePeers.get(peerId);
    if (peer && peer.tileEl) {
      peer.tileEl.remove();
    }
    remotePeers.delete(peerId);
    updateGridLayout();
    updateParticipantsList();
  }

  function updateParticipantsCount() {
    participantCount.textContent = `${remotePeers.size + 1} In Voice`;
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

  function toggleMic(forceState) {
    if (typeof forceState === 'boolean') {
      isMuted = forceState;
    } else {
      isMuted = !isMuted;
    }

    if (localVoiceStream) {
      const track = localVoiceStream.getAudioTracks()[0];
      if (track) track.enabled = !isMuted;
    }

    btnToggleMic.classList.toggle('muted', isMuted);
    iconMic.setAttribute('data-lucide', isMuted ? 'mic-off' : 'mic');
    localMicStatus.classList.toggle('muted', isMuted);
    localMicStatus.innerHTML = `<i data-lucide="${isMuted ? 'mic-off' : 'mic'}"></i>`;
    lucide.createIcons();

    if (peerRoom) {
      peerRoom.broadcast({ type: 'meta', isMuted });
    }
    showToast(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  }

  // 60 FPS Screen Share
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

      // Show on our local theater stage
      screenVideo.srcObject = localScreenStream;
      screenPresenterName.textContent = `${myUsername} (Your Screen)`;
      screenStage.classList.remove('hidden');
      updateGridLayout();

      // Broadcast screen share to peers
      if (peerRoom) {
        peerRoom.startScreenShare(localScreenStream);
      }

      showToast('Screen sharing started (60 FPS)', 'success');

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
    if (peerRoom) {
      peerRoom.stopScreenShare();
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

  // Fullscreen & PiP
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

  // 7. Speaking Visualizer
  function setupLocalAudioVisualizer(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      localAnalyser = audioContext.createAnalyser();
      localAnalyser.fftSize = 256;
      source.connect(localAnalyser);

      const bufferLength = localAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let wasSpeaking = false;

      setInterval(() => {
        if (!localAnalyser || isMuted) {
          if (wasSpeaking) {
            wasSpeaking = false;
            localSpeakingHalo.classList.remove('active');
            localTile.classList.remove('speaking');
            micGlowRing.classList.remove('active');
            if (peerRoom) peerRoom.broadcast({ type: 'meta', isSpeaking: false });
          }
          return;
        }

        localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        const isSpeaking = avg > 18;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          localSpeakingHalo.classList.toggle('active', isSpeaking);
          localTile.classList.toggle('speaking', isSpeaking);
          micGlowRing.classList.toggle('active', isSpeaking);
          if (peerRoom) peerRoom.broadcast({ type: 'meta', isSpeaking });
        }
      }, 100);
    } catch (e) {
      console.warn('Local speaking detector failed:', e);
    }
  }

  function setupRemoteAudioVisualizer(stream, peerId) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const anl = ctx.createAnalyser();
      anl.fftSize = 256;
      source.connect(anl);

      const dataArray = new Uint8Array(anl.frequencyBinCount);
      let wasSpeaking = false;

      setInterval(() => {
        const peer = remotePeers.get(peerId);
        if (!peer || !peer.tileEl) return;

        anl.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const isSpeaking = avg > 18;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          const halo = peer.tileEl.querySelector('.speaking-halo');
          if (halo) halo.classList.toggle('active', isSpeaking);
          peer.tileEl.classList.toggle('speaking', isSpeaking);
        }
      }, 100);
    } catch (e) {
      console.warn('Remote speaking detector failed:', e);
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
    if (peerRoom) {
      peerRoom.broadcast({ type: 'chat', ...msg });
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
      showToast('Voice room link copied to clipboard!', 'success');
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
      selectAudioOutput.innerHTML = '';

      devices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `${device.kind} (${selectAudioInput.length + 1})`;

        if (device.kind === 'audioinput') selectAudioInput.appendChild(option);
        else if (device.kind === 'audiooutput') selectAudioOutput.appendChild(option);
      });
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  }

  // 11. Leave Call
  btnLeaveCall.addEventListener('click', () => {
    if (confirm('Leave this room?')) {
      if (peerRoom) peerRoom.leave();
      window.location.reload();
    }
  });

  // 12. Hotkeys (M = Mic, S = Screen, C = Chat)
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key.toLowerCase() === 'm') btnToggleMic.click();
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
