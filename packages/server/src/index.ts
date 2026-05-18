// packages/server/src/index.ts
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './room-manager';
import { handleMessage } from './message-handler';

const PORT = 3001;

const server = createServer();
const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();

wss.on('connection', (ws: WebSocket) => {
  console.log('[Server] 新客户端连接');

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message, roomManager);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: '消息格式错误' }));
    }
  });

  ws.on('close', () => {
    console.log('[Server] 客户端断开连接');
    roomManager.handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('[Server] WebSocket 错误:', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`[Server] 大宋百商图服务器启动，端口: ${PORT}`);
});
