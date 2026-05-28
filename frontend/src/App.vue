<template>
  <div class="game-container">
    
    <!-- Phase 2: FLYING ANNOUNCEMENTS CONTAINER -->
    <div class="announcements-container">
      <div 
        v-for="alert in gameState.announcements" 
        :key="alert.id" 
        class="gift-alert-toast"
      >
        <div class="toast-content">
          <span>{{ alert.text }}</span>
        </div>
      </div>
    </div>

    <!-- Header: Beautiful title with coins HUD -->
    <header class="game-header">
      <div class="header-logo">
        <span class="logo-emoji">👑</span>
        <h1 class="logo-text">Raja Rani Chor Sipahi</h1>
      </div>
      
      <div class="profile-hud" v-if="gameState.connected">
        <div v-if="gameState.profile" class="coins-badge">
          <span>🪙</span> 
          <span>{{ gameState.profile.coins }} Coins</span>
        </div>

        <div v-if="gameState.profile?.subscriptionType === 'WEEKLY_ELITE'" class="badge badge-elite font-outfit">
          👑 ELITE
        </div>
        
        <button @click="toggleAdmin" class="admin-badge-btn font-outfit">
          ⚡ Admin Tools
        </button>

        <div class="lobby-badge glass-panel">
          <span class="badge-dot"></span>
          Room: <strong>{{ roomId }}</strong>
        </div>
      </div>
    </header>

    <!-- Error Toast banner -->
    <div v-if="gameState.error" class="error-banner glass-panel">
      <span class="error-emoji">⚠️</span>
      <p>{{ gameState.error }}</p>
      <button @click="clearError" class="close-error-btn">&times;</button>
    </div>

    <!-- Phase 2: PAYWALL OVERLAY INTERACTION (image_3.png mockup) -->
    <div v-if="gameState.isPaywalled" class="paywall-overlay">
      <div class="paywall-modal glass-panel">
        <span class="paywall-crown">👑</span>
        <h2 class="section-title">Shahi Darbar Locked</h2>
        <p class="section-subtitle">Aapka shahi aagman sunishchit karne ke liye ticket ya subscription lein.</p>
        
        <div class="paywall-cards">
          <!-- Daily Pass Card -->
          <div class="paywall-card daily glass-panel">
            <div>
              <h3 class="p-card-title">Daily Access Pass</h3>
              <p class="p-card-price">₹29</p>
              <ul class="p-card-features">
                <li>24 hours unlimited access</li>
                <li>🪙 Gift: +100 Coins</li>
                <li>Multi-lobby standard access</li>
              </ul>
            </div>
            <button @click="buyPass('DAILY_PASS')" class="btn-primary w-full">
              Kharidein (Simulate) 🎟️
            </button>
          </div>

          <!-- Weekly Elite Subscription Card -->
          <div class="paywall-card weekly-elite glass-panel">
            <div>
              <h3 class="p-card-title">Weekly Elite</h3>
              <p class="p-card-price">₹59</p>
              <ul class="p-card-features">
                <li>7 days unlimited play</li>
                <li>👑 Exclusive Elite badge</li>
                <li>🪙 Gift: +500 Coins</li>
                <li>Daily leaderboard entry</li>
              </ul>
            </div>
            <button @click="buyPass('WEEKLY_ELITE')" class="btn-primary btn-elite w-full">
              Elite Banein (Simulate) 👑
            </button>
          </div>
        </div>

        <button @click="quitGame" class="btn-secondary">
          Bahar Niklein 🚪
        </button>
      </div>
    </div>

    <!-- MAIN GAME LAYOUT -->
    <main class="main-layout" v-else>
      
      <!-- Phase 1: LOBBY VIEW -->
      <section v-if="gameState.currentRoundState === 'LOBBY'" class="lobby-section glass-panel">
        <div v-if="!gameState.connected" class="join-form">
          <h2 class="section-title">Khel Me Shamil Hon</h2>
          <p class="section-subtitle">Apna naam aur Room ID daal kar darbar me pravesh karein.</p>
          
          <div class="input-group">
            <label for="pname">Aapka Naam</label>
            <input 
              id="pname" 
              v-model="playerName" 
              type="text" 
              placeholder="Jaise: Samrat Ashoka" 
              class="glass-input"
              @keyup.enter="connectToLobby"
            />
          </div>

          <div class="input-group">
            <label for="roomid">Room ID</label>
            <input 
              id="roomid" 
              v-model="roomId" 
              type="text" 
              placeholder="Jaise: royal-court" 
              class="glass-input"
              @keyup.enter="connectToLobby"
            />
          </div>

          <!-- Phase 4: Dynamic Server IP address config inputs for native APK real phone testings -->
          <div class="input-group">
            <label for="serverip">Server IP/URL (Mobile testing ke liye)</label>
            <input 
              id="serverip" 
              v-model="serverIp" 
              type="text" 
              placeholder="Jaise: 192.168.1.22:8787" 
              class="glass-input"
              @keyup.enter="connectToLobby"
            />
            <span class="text-xs text-secondary mt-1">Real phone par testing ke liye apne computer ki local IP daalein (Jaise: <strong>192.168.1.22:8787</strong>). Browser ke liye khali chodein.</span>
          </div>

          <button @click="connectToLobby" class="btn-primary w-full mt-4">
            Darbar Me Shamil Hon ⚔️
          </button>
        </div>

        <div v-else class="lobby-waiting">
          <h2 class="section-title">Shahi Kaksh (Lobby)</h2>
          <p class="section-subtitle">Dusre rajghrane ke khiladiyo ka aagman ho raha hai...</p>
          
          <div class="players-grid">
            <div 
              v-for="i in 4" 
              :key="i" 
              class="player-slot glass-panel"
              :class="{ 'filled': gameState.players[i-1], 'active': gameState.players[i-1]?.active }"
            >
              <div v-if="gameState.players[i-1]" class="player-slot-content">
                <div class="avatar-circle">
                  {{ gameState.players[i-1].name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-slot-info">
                  <div class="flex items-center gap-1">
                    <span class="player-slot-name">{{ gameState.players[i-1].name }}</span>
                    <span v-if="gameState.players[i-1].isElite" title="Elite Member">👑</span>
                  </div>
                  <div>
                    <span v-if="gameState.players[i-1].id === gameState.myId" class="badge badge-warning">Aap</span>
                    <span v-else-if="!gameState.players[i-1].active" class="badge badge-danger">Disconnected</span>
                    <span v-else class="badge badge-success">Online</span>
                  </div>
                </div>
              </div>
              <div v-else class="player-slot-empty">
                <span class="empty-plus">+</span>
                <span>Khiladi ka intezar...</span>
              </div>
            </div>
          </div>

          <div class="action-bar text-center">
            <div v-if="gameState.players.length < 4" class="waiting-counter">
              Khel shuru karne ke liye <strong>{{ 4 - gameState.players.length }}</strong> aur khiladi chahiye.
            </div>
            <button 
              v-else 
              @click="startGame" 
              class="btn-primary pulse-target"
            >
              Khel Shuru Karein! 🎴
            </button>
          </div>
        </div>
      </section>

      <!-- Phase 2: ACTIVE GAME BOARD -->
      <section v-else class="board-section">
        <div class="board-grid grid-2">
          
          <!-- LEFT CARD BOARD COLUMN -->
          <div class="cards-panel glass-panel">
            <div class="panel-header-badge">
              <span class="badge" :class="statusBadgeClass">{{ roundStatusText }}</span>
            </div>

            <!-- Game Chits Display (Visual Reference: image_0.png, image_1.png) -->
            <div class="chits-container">
              <div 
                v-for="player in gameState.players" 
                :key="player.id" 
                class="chit-wrapper"
              >
                <!-- Player tag below card -->
                <div class="chit-player-tag" :class="{ 'is-me': player.id === gameState.myId }">
                  <span class="p-dot" :class="{ 'online': player.active }"></span>
                  <span class="p-name">{{ player.name }}</span>
                  <span v-if="player.isElite">👑</span>
                  
                  <!-- Phase 4: WebRTC Speaking waveforms next to player tag -->
                  <div 
                    v-if="gameState.voiceConnected" 
                    class="voice-waveform" 
                    :class="{ 'speaking': isSpeaking(player.id) }"
                    title="Audio Level Wave"
                  >
                    <span class="waveform-bar"></span>
                    <span class="waveform-bar"></span>
                    <span class="waveform-bar"></span>
                    <span class="waveform-bar"></span>
                  </div>

                  <span v-if="player.id === gameState.myId" class="me-indicator">(Aap)</span>
                </div>

                <!-- Interactive Card with double-sided flip structure -->
                <div 
                  class="chit-card" 
                  :class="{ 
                    'flipped': shouldRevealCard(player.id) || flippedChits[player.id],
                    'selectable': isSelectableTarget(player.id)
                  }"
                  @click="onCardClick(player.id)"
                >
                  <div class="chit-inner">
                    <!-- Front Cover -->
                    <div class="chit-front">
                      <span class="front-title">Parchi</span>
                    </div>

                    <!-- Revealed Role backside (image_0.png details) -->
                    <div class="chit-back" :class="getRoleClass(player.id)">
                      <div class="role-icon">{{ getRoleIcon(player.id) }}</div>
                      <div class="role-title">{{ getRoleHindi(player.id) }}</div>
                      <div class="role-pts">{{ getRolePointsText(player.id) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contextual CTA Buttons depending on state -->
            <div class="board-actions">
              <!-- SHUFFLED STATE actions -->
              <div v-if="gameState.currentRoundState === 'SHUFFLED'" class="action-prompt">
                <div v-if="gameState.myRole === 'Raja'" class="interaction-card glass-panel text-center">
                  <p class="prompt-instruction">👑 Aap <strong>Raja</strong> hain! Parchi dekhne ke baad, darbar me Sipahi ko aadesh dein.</p>
                  <button @click="callSipahi" class="btn-primary mt-4">
                    Sipahi Ka Aawahan Karein! ⚔️
                  </button>
                </div>
                <div v-else class="interaction-card glass-panel text-center">
                  <p class="prompt-instruction">✨ Apni parchi ko touch karke flip karein aur hidden role dekhein. Raja ke aadesh ka intezar hai...</p>
                </div>
              </div>

              <!-- THE CALL (Interrogation) actions -->
              <div v-if="gameState.currentRoundState === 'THE_CALL'" class="action-prompt">
                <div v-if="gameState.myRole === 'Sipahi'" class="interaction-card glass-panel text-center pulse-target">
                  <p class="prompt-instruction">🔍 <strong>Sipahi Ji!</strong> Rani aur Chor me se <strong>Chor</strong> ko pehchaniye.</p>
                  <p class="prompt-sub">Niche bachi hui do cards me se kisi ek par click karke shaq jahir karein!</p>
                </div>
                <div v-else class="interaction-card glass-panel text-center">
                  <p class="prompt-instruction">🕵️ Sipahi <strong>{{ sipahiName }}</strong> Chor ka andaza laga rahe hain. Kripya shanti banaye rakhein...</p>
                </div>
              </div>

              <!-- ROUND OVER actions -->
              <div v-if="gameState.currentRoundState === 'ROUND_OVER'" class="action-prompt">
                <div class="result-card glass-panel text-center" :class="resultGlowClass">
                  <h3 class="result-title">{{ resultTitleText }}</h3>
                  <p class="result-desc">{{ resultDescriptionText }}</p>
                  
                  <button @click="nextRound" class="btn-primary mt-4">
                    Agla Darbar (Round) 🔄
                  </button>
                </div>
              </div>
            </div>

            <!-- ========================================================
                 PHASE 4: SHAHI WEBRTC VOICE CHAT ROOM CONTROL BAR
                 ======================================================== -->
            <div class="shahi-audio-bar glass-panel w-full">
              <div class="audio-bar-left">
                <span 
                  class="voice-status-indicator" 
                  :class="{ 'active': gameState.voiceConnected }"
                ></span>
                <span v-if="!gameState.voiceConnected">🎤 Shahi Voice Room Offline</span>
                <span v-else-if="gameState.voiceMuted">🔇 Mic Muted</span>
                <span v-else>🔊 Shahi Voice Room: Live!</span>
              </div>

              <div class="audio-controls-group">
                <button 
                  v-if="gameState.voiceConnected" 
                  @click="toggleVoiceMute" 
                  class="btn-mic-toggle"
                  :class="{ 'muted': gameState.voiceMuted }"
                  :title="gameState.voiceMuted ? 'Unmute Mic' : 'Mute Mic'"
                >
                  <span v-if="gameState.voiceMuted">🔇</span>
                  <span v-else>🎤</span>
                </button>
                <button 
                  v-if="!gameState.voiceConnected" 
                  @click="joinAudioRoom" 
                  class="btn-primary py-1 px-3 text-xs"
                >
                  Join Voice 🎤
                </button>
                <button 
                  v-else 
                  @click="leaveAudioRoom" 
                  class="btn-secondary py-1 px-3 text-xs"
                >
                  Leave 🚪
                </button>
              </div>
            </div>

            <!-- ========================================================
                 PHASE 4: RICH GUP-SHUP CHAT BOX WITH FONTS AND COLORS
                 ======================================================== -->
            <div class="shahi-chat-box glass-panel w-full mt-6">
              <div class="chat-room-header">
                <span>💬 Darbar Gup-Shup (Chat Room)</span>
                <span class="text-xs text-secondary">{{ gameState.chatHistory.length }} Sandesh</span>
              </div>

              <!-- Message History Scroller -->
              <div class="chat-history-scroller" id="chatScroller">
                <div 
                  v-for="msg in gameState.chatHistory" 
                  :key="msg.id" 
                  class="message-bubble"
                  :class="{ 'is-me': msg.senderId === gameState.myId, 'is-system': msg.isSystem }"
                >
                  <div class="msg-header" v-if="!msg.isSystem">
                    <span class="msg-sender">{{ msg.senderName }}</span>
                    <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                  </div>
                  <div 
                    class="msg-text" 
                    :class="getMsgClasses(msg)"
                    :style="getMsgStyles(msg)"
                  >
                    {{ msg.text }}
                  </div>
                </div>
              </div>

              <!-- Rich Text Toolbar and inputs -->
              <div class="chat-editor-toolbox">
                <div class="toolbox-top">
                  <!-- Font families custom selectors -->
                  <select v-model="selectedFontStyle" class="select-shahi-font" title="Font Style Selector">
                    <option value="modern">Modern Clean</option>
                    <option value="royal">Royal Cursive</option>
                    <option value="shahi">Shahi Gothic</option>
                  </select>

                  <!-- Bold, Italic format buttons -->
                  <div class="toolbox-format-btns">
                    <button 
                      @click="toggleFormat('bold')" 
                      class="btn-format" 
                      :class="{ 'active': formatOptions.bold }"
                      title="Bold"
                    >B</button>
                    <button 
                      @click="toggleFormat('italic')" 
                      class="btn-format" 
                      :class="{ 'active': formatOptions.italic }"
                      title="Italic"
                    >I</button>
                    <button 
                      @click="toggleFormat('uppercase')" 
                      class="btn-format" 
                      :class="{ 'active': formatOptions.uppercase }"
                      title="CAPITAL LETTERS"
                    >A</button>
                  </div>

                  <!-- Text Colors picker rings -->
                  <div class="color-circles-picker">
                    <span 
                      v-for="color in textColors" 
                      :key="color.hex" 
                      class="color-circle" 
                      :class="[color.class, { 'active': selectedColor === color.hex }]"
                      @click="selectedColor = color.hex"
                      :title="color.name"
                    ></span>
                  </div>

                  <!-- Emoji popup trigger button -->
                  <button @click="toggleEmojiPanel" class="btn-emoji-trigger" title="Emojis Drawer">😊</button>
                </div>

                <div class="toolbox-bottom">
                  <!-- Emojis Drawer popup -->
                  <div v-if="isEmojiOpen" class="shahi-emojis-drawer glass-panel">
                    <button 
                      v-for="emoji in quickEmojis" 
                      :key="emoji" 
                      class="emoji-select-btn"
                      @click="appendEmoji(emoji)"
                    >
                      {{ emoji }}
                    </button>
                  </div>

                  <div class="chat-input-row">
                    <input 
                      v-model="chatText" 
                      type="text" 
                      placeholder="Darbar me sandesh likhein..." 
                      class="glass-input py-1 px-3"
                      :class="getInputFontClass"
                      :style="{ color: selectedColor }"
                      @keyup.enter="sendChatMessage"
                    />
                    <button @click="sendChatMessage" class="btn-chat-send">Send</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- RIGHT PANEL: LEADERBOARD, STORE & RULES -->
          <div class="stats-panel glass-panel">
            <h2 class="panel-title">🏆 Shahi Leaderboard</h2>
            <p class="panel-subtitle">Sahi guesses par points update hote hain.</p>
            
            <div class="leaderboard-list">
              <div 
                v-for="(row, index) in gameState.pointsLeaderboard" 
                :key="index" 
                class="leaderboard-row"
              >
                <div class="row-left">
                  <span class="leaderboard-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
                  <span class="leaderboard-name">{{ row.name }}</span>
                </div>
                <span class="leaderboard-score">{{ row.points }} pts</span>
              </div>
            </div>

            <!-- Phase 2: SOCIAL GIFTING STORE SECTION -->
            <div class="gifting-store-section glass-panel mt-6">
              <div class="store-header">
                <span class="store-title">🎁 Shahi Bazaar (Store)</span>
                <span v-if="selectedGiftId" class="badge badge-warning">Item Selected</span>
              </div>
              
              <!-- Gift Targets Highlight Alert -->
              <div v-if="selectedGiftId" class="target-highlight-alert mb-2">
                Niche board se kisiko uphar dene ke liye unke naam ya card par click karein!
              </div>

              <div class="store-grid">
                <button 
                  v-for="(item, key) in storeItems" 
                  :key="key" 
                  class="store-item-btn"
                  :class="{ 'pulse-target': selectedGiftId === key }"
                  @click="selectStoreItem(key)"
                >
                  <span class="store-item-emoji">{{ item.label }}</span>
                  <span class="store-item-name">{{ item.name }}</span>
                  <span class="store-item-cost">🪙 {{ item.cost }}</span>
                </button>
              </div>
            </div>

            <!-- Game Rules guide -->
            <div class="rules-box glass-panel mt-6">
              <h4>📖 Shahi Niyamavali</h4>
              <ul>
                <li>👑 <strong>Raja:</strong> Bilkul surakshit (1000 Pts)</li>
                <li>👸 <strong>Rani:</strong> Bilkul surakshit (800 Pts)</li>
                <li>🕵️ <strong>Sipahi:</strong> Chor ko pakadna hoga! (Jeet: 700 Pts | Haar: 0 Pts)</li>
                <li>👺 <strong>Chor:</strong> Sipahi se bachna hoga! (Sipahi hara toh: 500 Pts | Sipahi jeeta toh: 0 Pts)</li>
              </ul>
            </div>

            <!-- Quit Button -->
            <button @click="quitGame" class="btn-secondary w-full mt-6">
              Darbar Se Bahar Niklein 🚪
            </button>
          </div>

        </div>
      </section>

    </main>

    <!-- Phase 2: ADMINISTRATIVE OVERLAY DASHBOARD SLIDER -->
    <div v-if="isAdminOpen" class="admin-panel-overlay" @click.self="toggleAdmin">
      <div class="admin-side-sheet glass-panel">
        <div class="admin-sheet-header">
          <span class="admin-sheet-title">⚡ Administrative Control Panel</span>
          <button @click="toggleAdmin" class="admin-close-btn">&times;</button>
        </div>

        <p class="section-subtitle">Real-time parameters override tool standard integration testing ke liye.</p>

        <div v-if="gameState.players.length === 0" class="text-center text-secondary py-4">
          Lobby me koi players active nahi hain!
        </div>

        <div v-else class="admin-players-list">
          <div 
            v-for="player in gameState.players" 
            :key="player.id" 
            class="admin-control-card mb-4"
          >
            <h5>👤 {{ player.name }} <span v-if="player.isElite">👑</span></h5>
            
            <div class="admin-actions-grid">
              <div class="flex flex-col gap-1">
                <label class="text-xs text-secondary">Coins Modification</label>
                <div class="flex gap-2">
                  <button @click="adminCreditCoins(player.id, 500)" class="btn-secondary py-1 px-3 text-xs">+500 🪙</button>
                  <button @click="adminCreditCoins(player.id, 1000)" class="btn-secondary py-1 px-3 text-xs">+1000 🪙</button>
                  <button @click="adminSetCoins(player.id, 0)" class="btn-secondary py-1 px-3 text-xs">Reset 0</button>
                </div>
              </div>

              <div class="flex gap-2 mt-2">
                <button 
                  @click="adminSetSubscription(player.id, !player.isElite)" 
                  class="btn-primary py-1 px-3 text-xs w-full"
                  :class="{ 'btn-elite': !player.isElite }"
                >
                  {{ player.isElite ? 'Revoke Elite' : 'Grant Elite Subscription 👑' }}
                </button>
                <button 
                  @click="adminBypassAccess(player.id)" 
                  class="btn-secondary py-1 px-3 text-xs w-full"
                >
                  Give 24h Play Ticket 🎟️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, reactive, nextTick, watch } from 'vue';
import { gameState, GameEngine } from './utils/GameEngine';

export default {
  name: 'App',
  setup() {
    const playerName = ref('');
    const roomId = ref('royal-court');
    
    // Phase 4: Dynamic Server IP configurations
    const serverIp = ref(localStorage.getItem('rr_server_ip') || '');
    
    // Cards manual flip states
    const flippedChits = ref({});

    // Phase 2 states
    const selectedGiftId = ref(null);
    const isAdminOpen = ref(false);

    // Phase 4 states (Rich Chat Box)
    const chatText = ref('');
    const selectedFontStyle = ref('modern');
    const selectedColor = ref('#f8fafc');
    const isEmojiOpen = ref(false);
    
    const formatOptions = reactive({
      bold: false,
      italic: false,
      uppercase: false
    });

    const textColors = [
      { name: 'White', hex: '#f8fafc', class: 'c-white' },
      { name: 'Gold', hex: '#facc15', class: 'c-gold' },
      { name: 'Blue', hex: '#38bdf8', class: 'c-blue' },
      { name: 'Teal', hex: '#2dd4bf', class: 'c-teal' },
      { name: 'Pink', hex: '#f472b6', class: 'c-pink' },
      { name: 'Rose', hex: '#fb7185', class: 'c-rose' }
    ];

    const quickEmojis = ['😊', '😂', '👑', '👺', '🕵️', '👸', '😮', '🔥', '👏', '💔', '🍬', '🗡️'];

    const storeItems = {
      taj: { name: "Shahi Taj", cost: 500, label: "👑" },
      talwar: { name: "Shahi Talwar", cost: 1000, label: "🗡️" },
      mithai: { name: "Shahi Mithai", cost: 100, label: "🍬" },
      dil: { name: "Dil", cost: 50, label: "💖" }
    };

    // Auto scroll chat list to bottom
    watch(() => gameState.chatHistory.length, async () => {
      await nextTick();
      const scroller = document.getElementById('chatScroller');
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    });

    // Input handlers
    const connectToLobby = () => {
      if (!playerName.value.trim()) {
        gameState.error = 'Kripya apna shahi naam darj karein!';
        return;
      }
      
      // Local storage me server IP persistence save
      localStorage.setItem('rr_server_ip', serverIp.value);
      
      GameEngine.connect(playerName.value, roomId.value, serverIp.value);
    };

    const startGame = () => {
      GameEngine.startGame();
      flippedChits.value = {};
    };

    const callSipahi = () => {
      GameEngine.callSipahi();
    };

    const nextRound = () => {
      GameEngine.nextRound();
      flippedChits.value = {};
    };

    const quitGame = () => {
      GameEngine.disconnect();
      flippedChits.value = {};
      selectedGiftId.value = null;
    };

    const clearError = () => {
      gameState.error = null;
    };

    // Buy simulated package passes
    const buyPass = (purchaseType) => {
      GameEngine.simulatePurchase(purchaseType);
    };

    // Gifting selection logic
    const selectStoreItem = (giftId) => {
      if (selectedGiftId.value === giftId) {
        selectedGiftId.value = null;
      } else {
        selectedGiftId.value = giftId;
        GameEngine.triggerAnnouncement("👉 Uphar dene ke liye kisi player ki card par click karein!");
      }
    };

    // Admin dashboard visibility
    const toggleAdmin = () => {
      isAdminOpen.value = !isAdminOpen.value;
    };

    // Admin Controls triggers
    const adminCreditCoins = (playerId, amount) => {
      const currentCoins = gameState.profile && gameState.profile.id === playerId 
        ? gameState.profile.coins 
        : 500;
      GameEngine.adminOverride(playerId, { coins: currentCoins + amount });
    };

    const adminSetCoins = (playerId, amount) => {
      GameEngine.adminOverride(playerId, { coins: amount });
    };

    const adminSetSubscription = (playerId, isElite) => {
      GameEngine.adminOverride(playerId, { setElite: isElite });
    };

    const adminBypassAccess = (playerId) => {
      GameEngine.adminOverride(playerId, { bypassAccess: true });
    };

    // Phase 4: Gup-Shup Chat methods
    const sendChatMessage = () => {
      if (!chatText.value.trim()) return;

      GameEngine.sendChatMessage(
        chatText.value,
        selectedFontStyle.value,
        selectedColor.value,
        { ...formatOptions }
      );

      chatText.value = '';
      isEmojiOpen.value = false;
    };

    const toggleEmojiPanel = () => {
      isEmojiOpen.value = !isEmojiOpen.value;
    };

    const appendEmoji = (emoji) => {
      chatText.value += emoji;
      isEmojiOpen.value = false;
    };

    const toggleFormat = (type) => {
      formatOptions[type] = !formatOptions[type];
    };

    const getMsgClasses = (msg) => {
      const classes = [];
      classes.push(`font-${msg.fontStyle}`);
      if (msg.formatOptions?.bold) classes.push('font-bold');
      if (msg.formatOptions?.italic) classes.push('font-italic');
      if (msg.formatOptions?.uppercase) classes.push('font-uppercase');
      return classes;
    };

    const getMsgStyles = (msg) => {
      return {
        color: msg.color
      };
    };

    const formatTime = (isoString) => {
      try {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return '';
      }
    };

    // Phase 4: WebRTC Voice chat operations
    const joinAudioRoom = () => {
      GameEngine.joinVoice();
    };

    const leaveAudioRoom = () => {
      GameEngine.leaveVoice();
    };

    const toggleVoiceMute = () => {
      GameEngine.toggleMute();
    };

    const isSpeaking = (playerId) => {
      const volume = gameState.activeSpeakers[playerId] || 0;
      return volume > 6;
    };

    // Card click routing logic
    const onCardClick = (targetId) => {
      if (selectedGiftId.value) {
        if (targetId === gameState.myId) {
          gameState.error = "Aap apne aap ko shahi uphar nahi bhej sakte!";
          selectedGiftId.value = null;
          return;
        }
        GameEngine.sendGift(targetId, selectedGiftId.value);
        selectedGiftId.value = null;
        return;
      }

      if (gameState.currentRoundState === 'SHUFFLED') {
        if (targetId === gameState.myId) {
          flippedChits.value[targetId] = !flippedChits.value[targetId];
        }
      }
      else if (gameState.currentRoundState === 'THE_CALL' && gameState.myRole === 'Sipahi') {
        const role = gameState.parchiAssignment[targetId];
        if (!role) {
          GameEngine.guessChor(targetId);
        }
      }
    };

    const shouldRevealCard = (playerId) => {
      if (gameState.currentRoundState === 'ROUND_OVER') return true;
      const role = gameState.parchiAssignment[playerId];
      if (gameState.currentRoundState === 'THE_CALL') {
        return role === 'Raja' || role === 'Sipahi';
      }
      return false;
    };

    const isSelectableTarget = (playerId) => {
      if (selectedGiftId.value) {
        return playerId !== gameState.myId;
      }
      if (gameState.currentRoundState !== 'THE_CALL' || gameState.myRole !== 'Sipahi') return false;
      const role = gameState.parchiAssignment[playerId];
      return !role && playerId !== gameState.myId;
    };

    const sipahiName = computed(() => {
      const sipahiId = gameState.sipahiDecisionStatus?.sipahiId;
      const player = gameState.players.find(p => p.id === sipahiId);
      return player ? player.name : 'Sipahi';
    });

    const roundStatusText = computed(() => {
      switch (gameState.currentRoundState) {
        case 'SHUFFLED': return 'Parchiyan Bat Gayi Hain 🎭';
        case 'THE_CALL': return 'Darbar Saja: Sipahi Pukara Gaya! ⚔️';
        case 'ROUND_OVER': return 'Darbar Samapt (Natija) 🎉';
        default: return 'Lobby';
      }
    });

    const statusBadgeClass = computed(() => {
      switch (gameState.currentRoundState) {
        case 'SHUFFLED': return 'badge-info';
        case 'THE_CALL': return 'badge-warning pulse-target';
        case 'ROUND_OVER': return 'badge-success';
        default: return 'badge-info';
      }
    });

    const getRoleHindi = (playerId) => {
      const role = gameState.parchiAssignment[playerId];
      if (!role) return 'Hidden';
      switch (role) {
        case 'Raja': return 'Raja 👑';
        case 'Rani': return 'Rani 👸';
        case 'Sipahi': return 'Sipahi 🕵️';
        case 'Chor': return 'Chor 👺';
        default: return 'Unrevealed';
      }
    };

    const getRoleClass = (playerId) => {
      const role = gameState.parchiAssignment[playerId];
      if (!role) return '';
      return 'role-' + role.toLowerCase();
    };

    const getRoleIcon = (playerId) => {
      const role = gameState.parchiAssignment[playerId];
      if (!role) return '❓';
      switch (role) {
        case 'Raja': return '👑';
        case 'Rani': return '👸';
        case 'Sipahi': return '🕵️';
        case 'Chor': return '👺';
        default: return '❓';
      }
    };

    const getRolePointsText = (playerId) => {
      const role = gameState.parchiAssignment[playerId];
      if (!role) return '???';
      switch (role) {
        case 'Raja': return '1000 Pts';
        case 'Rani': return '800 Pts';
        case 'Sipahi': return '700 Pts';
        case 'Chor': return '500 Pts';
        default: return '0 Pts';
      }
    };

    const resultTitleText = computed(() => {
      const status = gameState.sipahiDecisionStatus;
      return status?.isCorrect ? 'Chor Pakda Gaya! 🚨' : 'Chor Bach Nikla! 💨';
    });

    const resultDescriptionText = computed(() => {
      const status = gameState.sipahiDecisionStatus;
      const sipahi = gameState.players.find(p => p.id === status.sipahiId)?.name || 'Sipahi';
      const guessed = gameState.players.find(p => p.id === status.guessedChorId)?.name || 'Player';
      const actualChor = gameState.players.find(p => gameState.parchiAssignment[p.id] === 'Chor')?.name || 'Chor';

      if (status?.isCorrect) {
        return `Bahut Badiya! Sipahi ${sipahi} ne sahi andaza lagaya. ${guessed} hi darasal CHOR tha. Sipahi ko milte hain 700 points!`;
      } else {
        return `Oho! Sipahi ${sipahi} ne galat guess kiya. Unhone ${guessed} par shaq kiya, par asli Chor ${actualChor} tha! Chor ko milte hain 500 points!`;
      }
    });

    const resultGlowClass = computed(() => {
      return gameState.sipahiDecisionStatus?.isCorrect ? 'result-correct' : 'result-wrong';
    });

    const getInputFontClass = computed(() => {
      return `font-${selectedFontStyle.value}`;
    });

    return {
      playerName,
      roomId,
      serverIp,
      gameState,
      flippedChits,
      selectedGiftId,
      isAdminOpen,
      chatText,
      selectedFontStyle,
      selectedColor,
      isEmojiOpen,
      formatOptions,
      textColors,
      quickEmojis,
      storeItems,
      connectToLobby,
      startGame,
      callSipahi,
      nextRound,
      quitGame,
      clearError,
      buyPass,
      selectStoreItem,
      toggleAdmin,
      adminCreditCoins,
      adminSetCoins,
      adminSetSubscription,
      adminBypassAccess,
      sendChatMessage,
      toggleEmojiPanel,
      appendEmoji,
      toggleFormat,
      getMsgClasses,
      getMsgStyles,
      formatTime,
      joinAudioRoom,
      leaveAudioRoom,
      toggleVoiceMute,
      isSpeaking,
      onCardClick,
      shouldRevealCard,
      isSelectableTarget,
      sipahiName,
      roundStatusText,
      statusBadgeClass,
      getRoleHindi,
      getRoleClass,
      getRoleIcon,
      getRolePointsText,
      resultTitleText,
      resultDescriptionText,
      resultGlowClass,
      getInputFontClass
    };
  }
};
</script>

<style scoped>
/* App core structure */
.game-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 1rem;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-emoji {
  font-size: 2.2rem;
}

.logo-text {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(90deg, #a78bfa 0%, #f472b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
}

.lobby-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 10px #2dd4bf;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  padding: 0.85rem 1.25rem;
  border-radius: 14px;
  color: #fca5a5;
  font-size: 0.95rem;
}

.close-error-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.main-layout {
  width: 100%;
}

.lobby-section {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2.5rem;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 0.35rem;
  text-align: center;
}

.section-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  text-align: center;
  margin-bottom: 2rem;
}

.input-group {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.w-full {
  width: 100%;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.player-slot {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.player-slot-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.player-slot-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-slot-name {
  font-size: 1.05rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.player-slot-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: rgba(255, 255, 255, 0.15);
  font-size: 0.85rem;
}

.empty-plus {
  font-size: 1.5rem;
}

.action-bar {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 1.5rem;
}

.waiting-counter {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.cards-panel {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.panel-header-badge {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
}

.chits-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.5rem 3rem;
  margin: 3rem 0;
  justify-items: center;
  width: 100%;
  max-width: 500px;
}

.chit-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.chit-player-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.85rem;
  border: 1px solid rgba(255,255,255,0.03);
  max-width: 155px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chit-player-tag.is-me {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
}

.me-indicator {
  font-size: 0.75rem;
  opacity: 0.7;
}

.p-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.p-dot.online {
  background: #2dd4bf;
  box-shadow: 0 0 5px #2dd4bf;
}

.p-name {
  font-weight: 600;
}

.chit-card.selectable {
  animation: pulseTarget 1.5s infinite alternate ease-in-out;
}

@keyframes pulseTarget {
  0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.2)); }
  100% { transform: scale(1.03); filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.5)); }
}

.chit-card.selectable:hover {
  transform: translateY(-5px) scale(1.05);
}

.chit-front {
  font-weight: 800;
  font-size: 1.4rem;
}

.front-title {
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.role-icon {
  font-size: 3.5rem;
  margin-bottom: 0.75rem;
}

.role-pts {
  font-size: 0.85rem;
  font-weight: 700;
  margin-top: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
}

.board-actions {
  width: 100%;
}

.interaction-card {
  padding: 1.5rem;
  border-radius: 16px;
}

.prompt-instruction {
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.5;
}

.prompt-sub {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.result-card {
  padding: 2rem;
  border-radius: 20px;
}

.result-card.result-correct {
  border-color: rgba(45, 212, 191, 0.3);
  background: linear-gradient(180deg, rgba(45, 212, 191, 0.02) 0%, rgba(45, 212, 191, 0.08) 100%);
  box-shadow: 0 0 30px rgba(45, 212, 191, 0.1);
}

.result-card.result-wrong {
  border-color: rgba(251, 113, 133, 0.3);
  background: linear-gradient(180deg, rgba(251, 113, 133, 0.02) 0%, rgba(251, 113, 133, 0.08) 100%);
  box-shadow: 0 0 30px rgba(251, 113, 133, 0.1);
}

.result-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.result-card.result-correct .result-title { color: var(--color-sipahi); }
.result-card.result-wrong .result-title { color: var(--color-chor); }

.result-desc {
  font-size: 1rem;
  line-height: 1.5;
  color: #e2e8f0;
}

.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.text-center { text-align: center; }

.stats-panel {
  padding: 2rem;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}

.panel-subtitle {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.leaderboard-name {
  font-weight: 600;
  font-size: 1rem;
}

.leaderboard-score {
  font-weight: 800;
  font-size: 1.05rem;
  color: #a78bfa;
}

.rules-box {
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.01);
  border-radius: 16px;
}

.rules-box h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.rules-box ul {
  list-style: none;
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: var(--text-secondary);
}

.rules-box strong {
  color: var(--text-primary);
}

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.text-xs { font-size: 0.75rem; }
.text-secondary { color: var(--text-secondary); }
</style>
