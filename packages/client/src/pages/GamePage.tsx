// packages/client/src/pages/GamePage.tsx
import React from 'react';
import { PublicGameState } from '@song-merchant/shared';
import { StatusBar } from '../components/StatusBar';
import { PublicArea } from '../components/PublicArea';
import { ActionPanel } from '../components/ActionPanel';
import { RevenueEstimate } from '../components/RevenueEstimate';
import { PlayerStreet } from '../components/PlayerStreet';
import { GameLog } from '../components/GameLog';
import styles from './GamePage.module.css';

interface GamePageProps {
  sendMessage: (msg: any) => void;
  gameState: PublicGameState | null;
  playerId: string;
  roomCode: string;
}

export const GamePage: React.FC<GamePageProps> = ({
  sendMessage,
  gameState,
  playerId,
  roomCode,
}) => {
  if (!gameState) {
    return (
      <div className={styles.loading}>
        <p>正在加载游戏...</p>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;

  return (
    <div className={styles.container}>
      {/* 第 1 行 — 顶部状态栏 */}
      <StatusBar
        gameState={gameState}
        roomCode={roomCode}
      />

      {/* 第 2 行 — 公共区域 + 操作面板 */}
      <div className={styles.publicRow}>
        <PublicArea gameState={gameState} />
        <ActionPanel
          gameState={gameState}
          isMyTurn={isMyTurn}
          sendMessage={sendMessage}
        />
      </div>

      {/* 第 3 行 — 收益预估条（经营阶段显示） */}
      <RevenueEstimate gameState={gameState} isMyTurn={isMyTurn} />

      {/* 主体 — 所有玩家商业街 */}
      <div className={styles.streetsSection}>
        {gameState.players.map((player, idx) => (
          <PlayerStreet
            key={player.id}
            player={player}
            isCurrentPlayer={idx === gameState.currentPlayerIndex}
            isMe={player.id === playerId}
            phaseStartTime={gameState.phaseStartTime}
            phaseTimeLimit={gameState.phaseTimeLimit}
          />
        ))}
      </div>

      {/* 底部 — 游戏日志 */}
      <GameLog gameState={gameState} />
    </div>
  );
};
