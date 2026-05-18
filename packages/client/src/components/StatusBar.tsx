// packages/client/src/components/StatusBar.tsx
import React, { useState, useEffect } from 'react';
import { PublicGameState, PlayerActionPhase } from '@song-merchant/shared';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  gameState: PublicGameState;
  roomCode: string;
}

function getPhaseLabel(phase: PlayerActionPhase): string {
  switch (phase) {
    case PlayerActionPhase.PURCHASE:
      return '购买';
    case PlayerActionPhase.PREPARATION:
      return '备菜';
    case PlayerActionPhase.OPERATION:
      return '经营';
    case PlayerActionPhase.DONE:
      return '等待';
    default:
      return '';
  }
}

export const StatusBar: React.FC<StatusBarProps> = ({ gameState, roomCode }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(now - gameState.phaseStartTime);
    }, 200);
    return () => clearInterval(interval);
  }, [gameState.phaseStartTime]);

  const timeLeft = Math.max(0, gameState.phaseTimeLimit - elapsed);
  const secondsLeft = Math.ceil(timeLeft / 1000);
  const progress = Math.min(1, elapsed / gameState.phaseTimeLimit);

  // 颜色逻辑：>20s 绿色 → 10-20s 橙色 → <10s 红色
  let timerColor = '#4caf50';
  let timerClass = styles.timerNormal;
  if (secondsLeft <= 10) {
    timerColor = '#e06060';
    timerClass = styles.timerDanger;
  } else if (secondsLeft <= 20) {
    timerColor = '#e0a030';
    timerClass = styles.timerWarning;
  }

  // SVG 圆形进度环
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const phaseLabel = getPhaseLabel(gameState.playerPhase);

  return (
    <div className={styles.bar}>
      <div className={styles.section}>
        <span className={styles.gameName}>大宋百商图</span>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>轮次</span>
        <span className={styles.value}>{gameState.roundNumber}</span>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>当前</span>
        <span className={styles.playerName}>{currentPlayer?.name ?? '-'}</span>
        <span className={`${styles.phaseBadge} ${styles[`phase${gameState.playerPhase}`]}`}>
          {phaseLabel}
        </span>
      </div>

      <div className={`${styles.timerSection} ${timerClass}`}>
        <svg className={styles.timerSvg} viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="#333"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke={timerColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={styles.timerCircle}
          />
        </svg>
        <span className={styles.timerText} style={{ color: timerColor }}>
          {secondsLeft}s
        </span>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>房间</span>
        <span className={styles.roomCode}>{roomCode}</span>
      </div>
    </div>
  );
};
