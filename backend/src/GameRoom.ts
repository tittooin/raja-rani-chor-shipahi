export interface Player {
  id: string;
  name: string;
  points: number;
  active: boolean;
  isElite: boolean;
}

export type RoundState = "LOBBY" | "SHUFFLED" | "THE_CALL" | "INTERROGATION" | "ROUND_OVER";

export interface GiftTransaction {
  giftId: string;
  count: number;
  sentBy: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  name: string;
  coins: number;
  activePassUntil: string | null;
  subscriptionType: 'FREE' | 'WEEKLY_ELITE';
  subscriptionUntil: string | null;
  giftsReceived: GiftTransaction[];
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderId: string;
  text: string;
  fontStyle: string;     // 'royal' | 'shahi' | 'modern'
  color: string;         // Hex code or neon class
  formatOptions: {
    bold: boolean;
    italic: boolean;
    uppercase: boolean;
  };
  isSystem: boolean;
  timestamp: string;
}

export interface GameState {
  lobbyId: string;
  players: Player[];
  currentRoundState: RoundState;
  parchiAssignment: Record<string, string>;
  sipahiDecisionStatus: {
    sipahiId?: string;
    guessedChorId?: string;
    isCorrect?: boolean;
  };
  pointsLeaderboard: { name: string; points: number }[];
}

export const STORE_ITEMS = {
  taj: { name: "Shahi Taj", cost: 500, label: "👑" },
  talwar: { name: "Shahi Talwar", cost: 1000, label: "🗡️" },
  mithai: { name: "Shahi Mithai", cost: 100, label: "🍬" },
  dil: { name: "Dil", cost: 50, label: "💖" }
};

export class GameRoom implements DurableObject {
  private state: DurableObjectState;
  private storage: DurableObjectStorage;
  private lobbyId: string;
  
  // Connection maps
  private sockets = new Map<WebSocket, { id: string; name: string }>();
  
  // Game session states
  private players: Player[] = [];
  private currentRoundState: RoundState = "LOBBY";
  private parchiAssignment: Record<string, string> = {};
  private sipahiDecisionStatus: {
    sipahiId?: string;
    guessedChorId?: string;
    isCorrect?: boolean;
  } = {};

  // Phase 4: Persistent Chat History (maximum last 50 messages)
  private chatHistory: ChatMessage[] = [];

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.storage = state.storage;
    this.lobbyId = state.id.toString();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/gift-store") {
      return new Response(JSON.stringify(STORE_ITEMS), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response(JSON.stringify({
      lobbyId: this.lobbyId,
      playersCount: this.players.length,
      status: "Durable Room Active"
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  private async handleSession(ws: WebSocket) {
    (ws as any).accept?.(); 
    
    ws.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        await this.handleMessage(ws, data);
      } catch (err) {
        console.error("WebSocket message handling failed: ", err);
        ws.send(JSON.stringify({ type: "error", message: "Payload execution failure!" }));
      }
    });

    ws.addEventListener("close", () => {
      this.handleDisconnect(ws);
    });

    ws.addEventListener("error", () => {
      this.handleDisconnect(ws);
    });
  }

  private async handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case "join": {
        let playerId = data.playerId;
        const name = data.name ? data.name.trim() : "Gumnam Raja";

        if (!playerId) {
          playerId = crypto.randomUUID();
        }

        let profile = await this.storage.get<UserProfile>(`profile:${playerId}`);
        if (!profile) {
          profile = {
            id: playerId,
            name: name,
            coins: 500,
            activePassUntil: null,
            subscriptionType: 'FREE',
            subscriptionUntil: null,
            giftsReceived: []
          };
          await this.storage.put(`profile:${playerId}`, profile);
        } else {
          profile.name = name;
          await this.storage.put(`profile:${playerId}`, profile);
        }

        this.sockets.set(ws, { id: playerId, name: name });

        // Access privilege validation gatekeeper
        const hasAccess = this.checkAccessPrivilege(profile);
        if (!hasAccess) {
          ws.send(JSON.stringify({
            type: "paywall",
            profile: profile,
            myId: playerId
          }));
          return;
        }

        const existingPlayer = this.players.find(p => p.id === playerId);
        if (!existingPlayer) {
          if (this.players.length >= 4) {
            ws.send(JSON.stringify({ type: "error", message: "Darbar ful ho chuka hai!" }));
            ws.close();
            return;
          }
          this.players.push({
            id: playerId,
            name: name,
            points: 0,
            active: true,
            isElite: profile.subscriptionType === 'WEEKLY_ELITE'
          });
        } else {
          existingPlayer.active = true;
          existingPlayer.name = name;
          existingPlayer.isElite = profile.subscriptionType === 'WEEKLY_ELITE';
        }

        this.broadcastState();
        break;
      }

      case "start": {
        if (this.players.length < 4) {
          ws.send(JSON.stringify({ type: "error", message: "Khel shuru karne ke liye 4 players shamil hone chahiye!" }));
          return;
        }
        this.shuffleChits();
        this.broadcastState();
        break;
      }

      case "call_sipahi": {
        const session = this.sockets.get(ws);
        if (!session) return;

        const pRole = this.parchiAssignment[session.id];
        if (pRole !== "Raja" || this.currentRoundState !== "SHUFFLED") {
          ws.send(JSON.stringify({ type: "error", message: "Sirf Raja hi Sipahi ko aadesh de sakta hai!" }));
          return;
        }

        const sipahiPlayer = this.players.find(p => this.parchiAssignment[p.id] === "Sipahi");
        if (sipahiPlayer) {
          this.sipahiDecisionStatus = {
            sipahiId: sipahiPlayer.id
          };
        }

        this.currentRoundState = "THE_CALL";
        this.broadcastState();
        break;
      }

      case "guess_chor": {
        const session = this.sockets.get(ws);
        if (!session) return;

        if (this.currentRoundState !== "THE_CALL" || session.id !== this.sipahiDecisionStatus.sipahiId) {
          ws.send(JSON.stringify({ type: "error", message: "Sirf aadeshit Sipahi hi Chor ka andaza laga sakta hai!" }));
          return;
        }

        const targetId = data.targetPlayerId;
        const targetRole = this.parchiAssignment[targetId];

        if (!targetRole || targetId === session.id || targetId === this.players.find(p => this.parchiAssignment[p.id] === "Raja")?.id) {
          ws.send(JSON.stringify({ type: "error", message: "Amanviya target!" }));
          return;
        }

        const isCorrect = (targetRole === "Chor");
        this.sipahiDecisionStatus.guessedChorId = targetId;
        this.sipahiDecisionStatus.isCorrect = isCorrect;

        this.players.forEach(p => {
          const role = this.parchiAssignment[p.id];
          if (role === "Raja") { p.points += 1000; }
          else if (role === "Rani") { p.points += 800; }
          else if (role === "Sipahi") { p.points += isCorrect ? 700 : 0; }
          else if (role === "Chor") { p.points += isCorrect ? 0 : 500; }
        });

        this.currentRoundState = "ROUND_OVER";
        this.broadcastState();
        break;
      }

      case "next_round": {
        if (this.currentRoundState !== "ROUND_OVER") {
          ws.send(JSON.stringify({ type: "error", message: "Pehle round to complete hone dein!" }));
          return;
        }
        this.shuffleChits();
        this.broadcastState();
        break;
      }

      case "simulate_purchase": {
        const session = this.sockets.get(ws);
        if (!session) return;
        
        const purchaseType = data.purchaseType;
        const profile = await this.storage.get<UserProfile>(`profile:${session.id}`);
        
        if (profile) {
          const now = new Date();
          if (purchaseType === 'DAILY_PASS') {
            const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            profile.activePassUntil = expiry.toISOString();
            profile.coins += 100;
          } else if (purchaseType === 'WEEKLY_ELITE') {
            const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            profile.subscriptionType = 'WEEKLY_ELITE';
            profile.subscriptionUntil = expiry.toISOString();
            profile.coins += 500;
          }
          
          await this.storage.put(`profile:${session.id}`, profile);

          const existingPlayer = this.players.find(p => p.id === session.id);
          if (!existingPlayer && this.players.length < 4) {
            this.players.push({
              id: session.id,
              name: session.name,
              points: 0,
              active: true,
              isElite: profile.subscriptionType === 'WEEKLY_ELITE'
            });
          } else if (existingPlayer) {
            existingPlayer.active = true;
            existingPlayer.isElite = profile.subscriptionType === 'WEEKLY_ELITE';
          }
          
          ws.send(JSON.stringify({
            type: "purchase_success",
            profile: profile
          }));

          this.broadcastState();
        }
        break;
      }

      case "send_gift": {
        const session = this.sockets.get(ws);
        if (!session) return;

        const toPlayerId = data.toPlayerId;
        const giftId = data.giftId;

        const giftItem = STORE_ITEMS[giftId as keyof typeof STORE_ITEMS];
        if (!giftItem) {
          ws.send(JSON.stringify({ type: "error", message: "Amanviya gift product!" }));
          return;
        }

        try {
          let errorMsg: string | null = null;
          let senderProfile: UserProfile | undefined;
          let receiverProfile: UserProfile | undefined;

          await this.storage.transaction(async (txn) => {
            senderProfile = await txn.get<UserProfile>(`profile:${session.id}`);
            receiverProfile = await txn.get<UserProfile>(`profile:${toPlayerId}`);

            if (!senderProfile || !receiverProfile) {
              errorMsg = "Profile database lookup failed!";
              return;
            }

            if (senderProfile.coins < giftItem.cost) {
              errorMsg = `Tijori khali! Gift ke liye ${giftItem.cost} coins chahiye par aapke paas sirf ${senderProfile.coins} hain.`;
              return;
            }

            senderProfile.coins -= giftItem.cost;
            receiverProfile.giftsReceived.push({
              giftId: giftId,
              count: 1,
              sentBy: senderProfile.name,
              timestamp: new Date().toISOString()
            });

            await txn.put(`profile:${session.id}`, senderProfile);
            await txn.put(`profile:${toPlayerId}`, receiverProfile);
          });

          if (errorMsg) {
            ws.send(JSON.stringify({ type: "error", message: errorMsg }));
            return;
          }

          // Flying gift screen overlay triggers
          this.broadcastGiftAlert(senderProfile!.name, receiverProfile!.name, giftItem.label, giftItem.name);

          // Phase 4: Auto inject gift log inside chat history as standard system message!
          const systemMsg: ChatMessage = {
            id: crypto.randomUUID(),
            senderName: "SHAHI_DARBAR",
            senderId: "system",
            text: `🎁 **${senderProfile!.name}** ne **${receiverProfile!.name}** ko **${giftItem.label} ${giftItem.name}** uphar me diya!`,
            fontStyle: 'shahi',
            color: '#eab308', // Shahi gold highlight
            formatOptions: { bold: true, italic: true, uppercase: false },
            isSystem: true,
            timestamp: new Date().toISOString()
          };
          this.chatHistory.push(systemMsg);
          if (this.chatHistory.length > 50) this.chatHistory.shift();

          this.broadcastChatMessage(systemMsg);
          this.broadcastState();

        } catch (e) {
          console.error("Gifting transaction crashed: ", e);
          ws.send(JSON.stringify({ type: "error", message: "Transaction failed." }));
        }
        break;
      }

      case "admin_override": {
        const session = this.sockets.get(ws);
        if (!session) return;

        const targetId = data.targetPlayerId;
        const targetProfile = await this.storage.get<UserProfile>(`profile:${targetId}`);

        if (targetProfile) {
          if (data.coins !== undefined) { targetProfile.coins = Number(data.coins); }
          if (data.setElite !== undefined) {
            if (data.setElite) {
              targetProfile.subscriptionType = 'WEEKLY_ELITE';
              targetProfile.subscriptionUntil = new Date(Date.now() + 7*24*60*60*1000).toISOString();
            } else {
              targetProfile.subscriptionType = 'FREE';
              targetProfile.subscriptionUntil = null;
            }
          }
          if (data.bypassAccess !== undefined && data.bypassAccess) {
            targetProfile.activePassUntil = new Date(Date.now() + 24*60*60*1000).toISOString();
          }

          await this.storage.put(`profile:${targetId}`, targetProfile);

          const p = this.players.find(pl => pl.id === targetId);
          if (p) {
            p.isElite = targetProfile.subscriptionType === 'WEEKLY_ELITE';
          }

          this.broadcastState();
          ws.send(JSON.stringify({ type: "admin_override_success" }));
        }
        break;
      }

      // Phase 4: Messaging Chat send handles
      case "send_chat": {
        const session = this.sockets.get(ws);
        if (!session) return;

        const newMsg: ChatMessage = {
          id: crypto.randomUUID(),
          senderName: session.name,
          senderId: session.id,
          text: data.text,
          fontStyle: data.fontStyle || 'modern',
          color: data.color || '#f8fafc',
          formatOptions: data.formatOptions || { bold: false, italic: false, uppercase: false },
          isSystem: false,
          timestamp: new Date().toISOString()
        };

        this.chatHistory.push(newMsg);
        if (this.chatHistory.length > 50) this.chatHistory.shift();

        this.broadcastChatMessage(newMsg);
        break;
      }

      // Phase 4: WebRTC Signaling Mesh broker redirector
      case "webrtc_signal": {
        const session = this.sockets.get(ws);
        if (!session) return;

        const targetId = data.targetId;
        const signal = data.signal;

        // Find the websocket connection associated with targetId
        for (const [targetWs, meta] of this.sockets.entries()) {
          if (meta.id === targetId) {
            try {
              targetWs.send(JSON.stringify({
                type: "webrtc_signal",
                fromId: session.id,
                signal: signal
              }));
            } catch (e) {
              console.error("Signaling bypass delivery failure: ", e);
            }
            break;
          }
        }
        break;
      }
    }
  }

  private checkAccessPrivilege(profile: UserProfile): boolean {
    if (profile.subscriptionType === 'WEEKLY_ELITE' && profile.subscriptionUntil) {
      if (new Date(profile.subscriptionUntil) > new Date()) { return true; }
    }
    if (profile.activePassUntil) {
      if (new Date(profile.activePassUntil) > new Date()) { return true; }
    }
    return false;
  }

  private shuffleChits() {
    const roles = ["Raja", "Rani", "Chor", "Sipahi"];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    this.parchiAssignment = {};
    this.players.forEach((player, idx) => {
      this.parchiAssignment[player.id] = roles[idx];
    });

    this.sipahiDecisionStatus = {};
    this.currentRoundState = "SHUFFLED";
  }

  private handleDisconnect(ws: WebSocket) {
    const session = this.sockets.get(ws);
    if (!session) return;

    this.sockets.delete(ws);
    
    const player = this.players.find(p => p.id === session.id);
    if (player) {
      player.active = false;
    }

    const activeCount = this.players.filter(p => p.active).length;
    if (activeCount === 0) {
      this.players = [];
      this.currentRoundState = "LOBBY";
      this.parchiAssignment = {};
      this.sipahiDecisionStatus = {};
      this.chatHistory = [];
    } else {
      this.broadcastState();
    }
  }

  private async broadcastGiftAlert(fromName: string, toName: string, icon: string, name: string) {
    for (const ws of this.sockets.keys()) {
      try {
        ws.send(JSON.stringify({
          type: "gift_announcement",
          message: `🎁 ${fromName} ne ${toName} ko ${icon} **${name}** uphar me diya!`,
          giftVisual: { fromName, toName, icon }
        }));
      } catch (err) {
        console.error("Alert broadcast issue: ", err);
      }
    }
  }

  private broadcastChatMessage(msg: ChatMessage) {
    for (const ws of this.sockets.keys()) {
      try {
        ws.send(JSON.stringify({
          type: "chat_receive",
          message: msg
        }));
      } catch (err) {
        console.error("Chat sync broadcast issue: ", err);
      }
    }
  }

  private async broadcastState() {
    const leaderboard = [...this.players]
      .sort((a, b) => b.points - a.points)
      .map(p => ({ name: p.name, points: p.points }));

    for (const [ws, session] of this.sockets.entries()) {
      try {
        const clientPlayerId = session.id;
        const myRole = this.parchiAssignment[clientPlayerId] || null;

        const filteredParchi: Record<string, string> = {};
        if (this.currentRoundState === "ROUND_OVER") {
          Object.assign(filteredParchi, this.parchiAssignment);
        } else if (this.currentRoundState === "SHUFFLED") {
          if (myRole) {
            filteredParchi[clientPlayerId] = myRole;
          }
        } else if (this.currentRoundState === "THE_CALL") {
          this.players.forEach(p => {
            const role = this.parchiAssignment[p.id];
            if (p.id === clientPlayerId || role === "Raja" || role === "Sipahi") {
              filteredParchi[p.id] = role;
            }
          });
        }

        const profile = await this.storage.get<UserProfile>(`profile:${clientPlayerId}`);

        const statePayload: GameState = {
          lobbyId: this.lobbyId,
          players: this.players,
          currentRoundState: this.currentRoundState,
          parchiAssignment: filteredParchi,
          sipahiDecisionStatus: this.sipahiDecisionStatus,
          pointsLeaderboard: leaderboard
        };

        ws.send(JSON.stringify({
          type: "state",
          state: statePayload,
          myId: clientPlayerId,
          myRole: myRole,
          profile: profile,
          // Phase 4: Push the persistent chat history to clients on state request
          chatHistory: this.chatHistory
        }));
      } catch (err) {
        console.error("State sync broadcast crash: ", err);
      }
    }
  }
}
