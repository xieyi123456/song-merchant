// packages/client/src/components/GameLog.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  gameState: PublicGameState | null;
}

// 玩家颜色映射
const PLAYER_COLORS = ['#6ab0e0', '#e0a030', '#6ae060', '#e060a0'];

export const GameLog: React.FC<GameLogProps> = ({ gameState }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [prevRound, setPrevRound] = useState<number>(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 当 gameState 变化时生成日志
  useEffect(() => {
    if (!gameState) return;

    // 新一轮开始
    if (gameState.roundNumber !== prevRound && gameState.roundNumber > 0) {
      addLog({
        playerName: '系统',
        playerId: 'system',
        message: `=== 第 ${gameState.roundNumber} 轮开始 ===`,
        type: 'system',
      });
      setPrevRound(gameState.roundNumber);
    }
  }, [gameState?.roundNumber]);

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  // 外部可调用 addLog（预留给 TURN_RESULT 等消息处理）
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getPlayerColor = (playerId: string): string => {
    if (!gameState) return '#888';
    const idx = gameState.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return '#888';
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
                style={{ color: getPlayerColor(entry.playerId) }}
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

// 导出 addLog 辅助函数，供外部消息处理使用
export function createLogEntry(
  playerName: string,
  playerId: string,
  message: string,
  type: LogEntry['type'] = 'action'
): Omit<LogEntry, 'id' | 'timestamp'> {
  return { playerName, playerId, message, type };
}
