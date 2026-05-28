import { reactive } from 'vue';

// Dynamic state variables share block
export const gameState = reactive({
  connected: false,
  lobbyId: '',
  players: [],
  currentRoundState: 'LOBBY',
  parchiAssignment: {},
  sipahiDecisionStatus: {},
  pointsLeaderboard: [],
  myId: '',
  myRole: null,
  error: null,
  
  // Phase 2: Monetization specific states
  profile: null,
  isPaywalled: false,
  announcements: [],
  
  // Phase 4: Gup-Shup Chat Box & WebRTC Voice Room
  chatHistory: [],
  voiceConnected: false,
  voiceMuted: false,
  activeSpeakers: {} // Track speaking volumes
});

let socket = null;

// WebRTC Peer-to-Peer Full-Mesh Audio Variables
let localStream = null;
let peerConnections = {}; // Map of targetPlayerId -> RTCPeerConnection
let audioContext = null;
let analyser = null;
let javascriptNode = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const GameEngine = {
  connect(playerName, roomId = 'royal-court', serverIp = '') {
    gameState.error = null;
    gameState.isPaywalled = false;
    
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws';
    
    // Resolve dynamic host: custom server IP support added for mobile APK local testing!
    let host = serverIp ? serverIp.trim() : '';
    if (!host) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        host = 'localhost:8787';
      } else if (window.location.hostname.endsWith('.pages.dev')) {
        host = 'raja-rani-chor-sipahi-backend.moremagical4.workers.dev';
      } else {
        host = window.location.host;
      }
    }
    
    // Remove ws:// or wss:// from host prefix if the user typed it by mistake
    host = host.replace(/^(ws|wss):\/\//, '');
      
    const wsUrl = `${wsProto}://${host}/ws?room=${roomId}`;
    const existingPlayerId = localStorage.getItem('rr_player_id') || null;
    
    try {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        gameState.connected = true;
        this.send({
          type: 'join',
          name: playerName,
          playerId: existingPlayerId
        });
      };
      
      socket.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'state') {
          gameState.lobbyId = msg.state.lobbyId;
          gameState.players = msg.state.players;
          gameState.currentRoundState = msg.state.currentRoundState;
          gameState.parchiAssignment = msg.state.parchiAssignment;
          gameState.sipahiDecisionStatus = msg.state.sipahiDecisionStatus;
          gameState.pointsLeaderboard = msg.state.pointsLeaderboard;
          gameState.myId = msg.myId;
          gameState.myRole = msg.myRole;
          gameState.isPaywalled = false;
          
          if (msg.chatHistory) {
            gameState.chatHistory = msg.chatHistory;
          }
          
          if (msg.profile) {
            gameState.profile = msg.profile;
            localStorage.setItem('rr_player_id', msg.profile.id);
          }
        } 
        else if (msg.type === 'paywall') {
          gameState.isPaywalled = true;
          gameState.profile = msg.profile;
          gameState.myId = msg.myId;
          localStorage.setItem('rr_player_id', msg.myId);
        }
        else if (msg.type === 'purchase_success') {
          gameState.profile = msg.profile;
          gameState.isPaywalled = false;
          this.triggerAnnouncement(`💸 Safalta! Aapne ₹${msg.profile.subscriptionType === 'WEEKLY_ELITE' ? '59' : '29'} ka pass activate kar liya hai!`);
        }
        else if (msg.type === 'gift_announcement') {
          this.triggerAnnouncement(msg.message, msg.giftVisual);
        }
        else if (msg.type === 'chat_receive') {
          gameState.chatHistory.push(msg.message);
          if (gameState.chatHistory.length > 50) gameState.chatHistory.shift();
        }
        else if (msg.type === 'webrtc_signal') {
          await this.handleWebrtcSignal(msg.fromId, msg.signal);
        }
        else if (msg.type === 'admin_override_success') {
          this.triggerAnnouncement(`⚡ Admin Override Applied Successfully!`);
        }
        else if (msg.type === 'error') {
          gameState.error = msg.message;
        }
      };
      
      socket.onclose = () => {
        gameState.connected = false;
        this.leaveVoice();
      };
      
      socket.onerror = (err) => {
        console.error('Socket engine error: ', err);
        gameState.error = 'Failed to initialize connection engine.';
        gameState.connected = false;
        this.leaveVoice();
      };
      
    } catch (e) {
      console.error('Socket initialization crash: ', e);
      gameState.error = 'Failed to initialize connection engine.';
    }
  },
  
  send(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      gameState.error = 'WebSocket connection offline, please refresh!';
    }
  },

  startGame() { this.send({ type: 'start' }); },
  callSipahi() { this.send({ type: 'call_sipahi' }); },
  guessChor(targetPlayerId) { this.send({ type: 'guess_chor', targetPlayerId }); },
  nextRound() { this.send({ type: 'next_round' }); },
  simulatePurchase(purchaseType) { this.send({ type: 'simulate_purchase', purchaseType }); },
  sendGift(toPlayerId, giftId) { this.send({ type: 'send_gift', toPlayerId, giftId }); },
  adminOverride(targetPlayerId, options) { this.send({ type: 'admin_override', targetPlayerId, ...options }); },

  sendChatMessage(text, fontStyle = 'modern', color = '#f8fafc', formatOptions = { bold: false, italic: false, uppercase: false }) {
    this.send({
      type: 'send_chat',
      text,
      fontStyle,
      color,
      formatOptions
    });
  },

  async joinVoice() {
    if (gameState.voiceConnected) return;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      gameState.voiceConnected = true;
      gameState.voiceMuted = false;
      this.setupAudioAnalysis(localStream);

      gameState.players.forEach(player => {
        if (player.id !== gameState.myId && player.active) {
          this.initiatePeerConnection(player.id, true);
        }
      });

      this.triggerAnnouncement("🎤 Shahi Voice Room me shamil ho chuke hain!");
    } catch (e) {
      console.error("Microphone capture failed: ", e);
      gameState.error = "Mic permission nahi mili! Kripya settings check karein.";
      gameState.voiceConnected = false;
    }
  },

  async initiatePeerConnection(targetId, isOffer) {
    if (peerConnections[targetId]) return;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections[targetId] = pc;

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'webrtc_signal',
          targetId: targetId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let audioEl = document.getElementById(`audio-voice-${targetId}`);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `audio-voice-${targetId}`;
        audioEl.autoplay = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = remoteStream;
    };

    if (isOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.send({
        type: 'webrtc_signal',
        targetId: targetId,
        signal: { type: 'offer', sdp: offer }
      });
    }
  },

  async handleWebrtcSignal(fromId, signal) {
    if (!gameState.voiceConnected) return;

    try {
      if (signal.type === 'offer') {
        await this.initiatePeerConnection(fromId, false);
        const pc = peerConnections[fromId];
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.send({
          type: 'webrtc_signal',
          targetId: fromId,
          signal: { type: 'answer', sdp: answer }
        });
      } 
      else if (signal.type === 'answer') {
        const pc = peerConnections[fromId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      } 
      else if (signal.type === 'candidate') {
        const pc = peerConnections[fromId];
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (err) {
      console.error("Signal parsing/negotiation failure: ", err);
    }
  },

  toggleMute() {
    if (!localStream) return;
    
    gameState.voiceMuted = !gameState.voiceMuted;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !gameState.voiceMuted;
    });

    if (gameState.voiceMuted) {
      gameState.activeSpeakers[gameState.myId] = 0;
    }
  },

  leaveVoice() {
    if (!gameState.voiceConnected) return;

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    if (javascriptNode) { javascriptNode.disconnect(); javascriptNode = null; }
    if (analyser) { analyser.disconnect(); analyser = null; }
    if (audioContext) { audioContext.close(); audioContext = null; }

    Object.keys(peerConnections).forEach(targetId => {
      peerConnections[targetId].close();
      const el = document.getElementById(`audio-voice-${targetId}`);
      if (el) el.remove();
    });
    peerConnections = {};

    gameState.voiceConnected = false;
    gameState.voiceMuted = false;
    gameState.activeSpeakers = {};
    
    this.triggerAnnouncement("🔇 Voice Room se bahar ho chuke hain.");
  },

  setupAudioAnalysis(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      
      javascriptNode = audioContext.createScriptProcessor(256, 1, 1);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        if (gameState.voiceMuted) {
          gameState.activeSpeakers[gameState.myId] = 0;
          return;
        }

        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }
        const average = values / length;
        
        gameState.activeSpeakers[gameState.myId] = Math.round(average);
        
        gameState.players.forEach(p => {
          if (p.id !== gameState.myId && p.active && !peerConnections[p.id]) {
            if (Math.random() > 0.8) {
              gameState.activeSpeakers[p.id] = Math.round(Math.random() * 60 + 10);
            } else {
              gameState.activeSpeakers[p.id] = Math.max(0, (gameState.activeSpeakers[p.id] || 0) - 8);
            }
          }
        });
      };
    } catch (e) {
      console.error("Audio Context initialization error: ", e);
    }
  },
  
  disconnect() {
    this.leaveVoice();
    if (socket) {
      socket.close();
      socket = null;
    }
    gameState.connected = false;
    gameState.players = [];
    gameState.currentRoundState = 'LOBBY';
    gameState.parchiAssignment = {};
    gameState.myRole = null;
    gameState.profile = null;
    gameState.isPaywalled = false;
    gameState.chatHistory = [];
  },

  triggerAnnouncement(text, visual = null) {
    const id = crypto.randomUUID();
    gameState.announcements.push({ id, text, visual });
    setTimeout(() => {
      gameState.announcements = gameState.announcements.filter(a => a.id !== id);
    }, 4500);
  }
};
