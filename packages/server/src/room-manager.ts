// packages/server/src/room-manager.ts
import { WebSocket } from 'ws';
import { GameSession } from './game-session';

export interface RoomPlayer {
  ws: WebSocket;
  id: string;
  name: string;
}

export interface Room {
  code: string;
  maxPlayers: number;
  players: RoomPlayer[];
  gameSession?: GameSession;
}

function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export class RoomManager {
  rooms: Map<string, Room> = new Map();

  createRoom(
    playerName: string,
    maxPlayers: number,
    ws: WebSocket
  ): { roomCode: string; playerId: string } {
    let code = generateRoomCode();
    // 避免房间号重复
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const room: Room = {
      code,
      maxPlayers,
      players: [{ ws, id: playerId, name: playerName }],
    };

    this.rooms.set(code, room);
    console.log(`[RoomManager] 房间 ${code} 已创建，房主: ${playerName}`);
    return { roomCode: code, playerId };
  }

  joinRoom(
    roomCode: string,
    playerName: string,
    ws: WebSocket
  ): { playerId: string; players: string[] } | string {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return '房间不存在';
    }
    if (room.gameSession) {
      return '游戏已开始，无法加入';
    }
    if (room.players.length >= room.maxPlayers) {
      return '房间已满';
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    room.players.push({ ws, id: playerId, name: playerName });

    console.log(`[RoomManager] ${playerName} 加入房间 ${roomCode}`);
    return {
      playerId,
      players: room.players.map((p) => p.name),
    };
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  removePlayer(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    console.log(`[RoomManager] 玩家 ${playerId} 离开房间 ${roomCode}`);

    // 如果房间空了，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      console.log(`[RoomManager] 房间 ${roomCode} 已删除（无玩家）`);
    }
  }

  handleDisconnect(ws: WebSocket): void {
    for (const [code, room] of this.rooms) {
      const player = room.players.find((p) => p.ws === ws);
      if (player) {
        this.removePlayer(code, player.id);

        // 通知房间内其他玩家
        room.players.forEach((p) => {
          if (p.ws.readyState === ws.OPEN) {
            p.ws.send(
              JSON.stringify({
                type: 'PLAYER_LEFT',
                playerName: player.name,
              })
            );
          }
        });
        break;
      }
    }
  }
}
