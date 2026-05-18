// packages/client/src/hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { PublicGameState } from '@song-merchant/shared';

interface UseWebSocketReturn {
  sendMessage: (message: any) => void;
  lastMessage: any;
  connected: boolean;
  gameState: PublicGameState | null;
}

export function useWebSocket(
  url: string,
  onMessage?: (msg: any) => void
): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] 已连接');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setLastMessage(msg);

        if (msg.type === 'STATE_UPDATE' && msg.state) {
          setGameState(msg.state);
        }

        if (msg.type === 'GAME_OVER' && msg.finalState) {
          setGameState(msg.finalState);
        }

        if (onMessage) {
          onMessage(msg);
        }
      } catch (err) {
        console.error('[WS] 消息解析失败:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] 连接断开，3s 后重连');
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] 连接错误:', err);
    };
  }, [url, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] 未连接，消息未发送');
    }
  }, []);

  return { sendMessage, lastMessage, connected, gameState };
}
