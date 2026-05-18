// packages/server/src/message-handler.ts
import { WebSocket } from 'ws';
import { RoomManager, Room } from './room-manager';
import { GameSession } from './game-session';

export function handleMessage(
  ws: WebSocket,
  message: { type: string; [key: string]: any },
  roomManager: RoomManager
): void {
  switch (message.type) {
    case 'CREATE_ROOM': {
      const { playerName, maxPlayers } = message;
      if (!playerName || !maxPlayers) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '缺少参数' }));
        return;
      }
      const result = roomManager.createRoom(playerName, maxPlayers, ws);
      ws.send(
        JSON.stringify({
          type: 'ROOM_CREATED',
          roomCode: result.roomCode,
          playerId: result.playerId,
        })
      );
      break;
    }

    case 'JOIN_ROOM': {
      const { roomCode, playerName } = message;
      if (!roomCode || !playerName) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '缺少参数' }));
        return;
      }
      const result = roomManager.joinRoom(roomCode, playerName, ws);
      if (typeof result === 'string') {
        ws.send(JSON.stringify({ type: 'ERROR', message: result }));
      } else {
        ws.send(
          JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode,
            playerId: result.playerId,
            players: result.players,
          })
        );
        // 通知房间内其他玩家
        const room = roomManager.getRoom(roomCode);
        if (room) {
          room.players.forEach((p) => {
            if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(
                JSON.stringify({
                  type: 'PLAYER_JOINED',
                  playerName,
                })
              );
            }
          });
        }
      }
      break;
    }

    case 'START_GAME': {
      // 需要通过 ws 找到玩家所在的房间
      const room = findRoomByWs(ws, roomManager);
      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '你不在任何房间中' }));
        return;
      }
      if (room.gameSession) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '游戏已开始' }));
        return;
      }

      room.gameSession = new GameSession(room.code, room.players);
      room.gameSession.start();
      break;
    }

    case 'BUY_MENU':
    case 'BUY_SHOP':
    case 'SKIP_PURCHASE':
    case 'REMOVE_CARD':
    case 'SKIP_REMOVE':
    case 'SELECT_GUEST': {
      const room2 = findRoomByWs(ws, roomManager);
      if (!room2 || !room2.gameSession) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '游戏未开始' }));
        return;
      }
      const playerId = findPlayerIdByWs(ws, room2);
      if (!playerId) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '找不到玩家信息' }));
        return;
      }
      room2.gameSession.handleAction(playerId, message);
      break;
    }

    case 'READY': {
      const room3 = findRoomByWs(ws, roomManager);
      if (!room3 || !room3.gameSession) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '游戏未开始' }));
        return;
      }
      // READY 消息目前不需要特殊处理，状态由操作自动推进
      break;
    }

    default:
      ws.send(
        JSON.stringify({ type: 'ERROR', message: `未知消息类型: ${message.type}` })
      );
  }
}

function findRoomByWs(
  ws: WebSocket,
  roomManager: RoomManager
): Room | undefined {
  for (const [, room] of roomManager.rooms) {
    if (room.players.some((p) => p.ws === ws)) {
      return room;
    }
  }
  return undefined;
}

function findPlayerIdByWs(
  ws: WebSocket,
  room: Room
): string | undefined {
  const player = room.players.find((p) => p.ws === ws);
  return player?.id;
}
