// packages/client/src/components/GameLog.tsx
import React, { useEffect, useRef } from 'react';
import { PublicGameState } from '@song-merchant/shared';
import styles from './GameLog.module.css';

export interface LogEntry {
  id: string;
  timestamp: number;
  playerName: string;
  playerId: string;
  message: string;
  type: 'action' | 'result' | 'event' | 'system';
}

interface GameLogProps {
  gameState: PublicGameState;
  logs: LogEntry[];
}

const PLAYER_COLORS = ['#6ab0e0', '#e0a030', '#6ae060', '#e060a0'];

export const GameLog: React.FC<GameLogProps> = ({ gameState, logs }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getPlayerColor = (playerName: string): string => {
    const idx = gameState.players.findIndex((p) => p.name === playerName);
    if (idx === -1) {
      if (playerName === '系统') return '#888';
      if (playerName === '事件') return '#e06060';
      return '#888';
    }
    return PLAYER_COLORS[idx % PLAYER_COLORS.length];
  };

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>游戏日志</h3>
      <div className={styles.logList}>
        {logs.length === 0 ? (
          <div className={styles.emptyHint}>游戏开始后将显示操作记录</div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className={`${styles.logEntry} ${entry.type === 'event' ? styles.eventEntry : ''} ${entry.type === 'system' ? styles.systemEntry : ''}`}
            >
              <span className={styles.logTime}>{formatTime(entry.timestamp)}</span>
              <span
                className={styles.logPlayer}
                style={{ color: getPlayerColor(entry.playerName) }}
              >
                {entry.playerName}
              </span>
              <span className={styles.logMessage}>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
