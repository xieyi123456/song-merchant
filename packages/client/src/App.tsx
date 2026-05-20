// packages/client/src/App.tsx
import React, { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { PublicGameState, MenuCard } from '@song-merchant/shared';
import { LogEntry } from './components/GameLog';

type AppPhase = 'lobby' | 'game';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('lobby');
  const [playerId, setPlayerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');

  const [joinedPlayers, setJoinedPlayers] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [prepareCards, setPrepareCards] = useState<MenuCard[]>([]);
  const [lastTurnResult, setLastTurnResult] = useState<any>(null);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
    };
    setLogs((prev) => [...prev, newEntry]);
  }, []);

  const handleServerMessage = useCallback(
    (msg: any) => {
      switch (msg.type) {
        case 'ROOM_CREATED':
          setPlayerId(msg.playerId);
          setRoomCode(msg.roomCode);
          if (msg.players) {
            setJoinedPlayers(msg.players);
          }
          if (msg.maxPlayers) {
            setMaxPlayers(msg.maxPlayers);
          }
          break;
        case 'ROOM_JOINED':
          setPlayerId(msg.playerId);
          setRoomCode(msg.roomCode);
          if (msg.players) {
            setJoinedPlayers(msg.players);
          }
          break;
        case 'PLAYER_JOINED':
          setJoinedPlayers((prev) => [...prev, msg.playerName]);
          break;
        case 'PLAYER_LEFT':
          setJoinedPlayers((prev) => prev.filter((n) => n !== msg.playerName));
          break;
        case 'ERROR':
          setError(msg.message || '未知错误');
          setTimeout(() => setError(''), 3000);
          break;
        case 'STATE_UPDATE':
          if (phase === 'lobby') {
            setPhase('game');
          }
          break;
        case 'GAME_LOG':
          addLog({
            playerName: msg.playerName,
            playerId: msg.playerName,
            message: msg.message,
            type: msg.logType || 'action',
          });
          break;
        case 'EVENT_TRIGGERED':
          addLog({
            playerName: '事件',
            playerId: 'event',
            message: `${msg.triggeredBy} 触发了【${msg.eventName}】：${msg.description}（影响：${msg.scope}）`,
            type: 'event',
          });
          break;
        case 'PREPARE_REVEAL':
          setPrepareCards(msg.cards || []);
          break;
        case 'TURN_RESULT':
          setLastTurnResult(msg);
          break;
      }
    },
    [phase, addLog]
  );

  const { sendMessage, connected, gameState } = useWebSocket(
    `ws://${window.location.hostname}:3001`,
    handleServerMessage
  );

  if (!connected) {
    return (
      <div className="connecting-screen">
        <p>正在连接服务器...</p>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <LobbyPage
        sendMessage={sendMessage}
        roomCode={roomCode}
        playerId={playerId}
        joinedPlayers={joinedPlayers}
        maxPlayers={maxPlayers}
        onMaxPlayersChange={setMaxPlayers}
        error={error}
      />
    );
  }

  return (
    <GamePage
      sendMessage={sendMessage}
      gameState={gameState}
      playerId={playerId}
      roomCode={roomCode}
      logs={logs}
      prepareCards={prepareCards}
      lastTurnResult={lastTurnResult}
      onTurnResultDone={() => setLastTurnResult(null)}
    />
  );
};

export default App;
