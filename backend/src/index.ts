import { GameRoom } from "./GameRoom";
export { GameRoom };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

// Default export jo normal worker pipeline handle karega
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Dynamic room name parameter reads karega, defaults to global_lobby
    const roomId = url.searchParams.get("room") || "lobby_global";
    
    // Durable Object ID aur Stub generation
    const id = env.GAME_ROOM.idFromName(roomId);
    const obj = env.GAME_ROOM.get(id);
    
    // Connection request Durable Object ko forward karega
    return obj.fetch(request);
  }
};
