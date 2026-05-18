// packages/client/src/App.tsx
import React, { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { PublicGameState } from '@song-merchant/shared';

type AppPhase = 'lobby' | 'game';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('lobby');
  const [playerId, setPlayerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');

  const handleServerMessage = useCallback(
    (msg: any) => {
      switch (msg.type) {
        case 'ROOM_CREATED':
          setPlayerId(msg.playerId);
          setRoomCode(msg.roomCode);
          break;
        case 'ROOM_JOINED':
          setPlayerId(msg.playerId);
          setRoomCode(msg.roomCode);
          break;
        case 'STATE_UPDATE':
          if (phase === 'lobby') {
            setPhase('game');
          }
          break;
      }
    },
    [phase]
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
      />
    );
  }

  return (
    <GamePage
      sendMessage={sendMessage}
      gameState={gameState}
      playerId={playerId}
      roomCode={roomCode}
    />
  );
};

export default App;
