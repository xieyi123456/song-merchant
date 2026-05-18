// packages/client/src/pages/GamePage.tsx
import React from 'react';
import { PublicGameState } from '@song-merchant/shared';
import { StatusBar } from '../components/StatusBar';
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

      {/* 第 2 行 — 公共区域（横向排列） */}
      <div className={styles.publicRow}>
        {/* PublicArea placeholder — Task 11 */}
        <div style={{ color: '#666', fontSize: 12 }}>公共区域</div>
        {/* ActionPanel placeholder — Task 12 */}
        <div style={{ color: '#666', fontSize: 12 }}>
          操作面板 {isMyTurn ? '(我的回合)' : '(等待中)'}
        </div>
      </div>

      {/* 第 3 行 — 收益预估条（经营阶段显示） */}
      {/* RevenueEstimate placeholder — Task 12 */}

      {/* 主体 — 所有玩家商业街 */}
      <div className={styles.streetsSection}>
        {gameState.players.map((player, idx) => (
          <div key={player.id} style={{ color: '#888', fontSize: 12, padding: 8, background: '#111', borderRadius: 4 }}>
            {player.name} — {player.money}两
            {idx === gameState.currentPlayerIndex ? ' (当前)' : ''}
            {player.id === playerId ? ' (我)' : ''}
          </div>
        ))}
      </div>

      {/* 底部 — 游戏日志 */}
      {/* GameLog placeholder — Task 11 */}
    </div>
  );
};
