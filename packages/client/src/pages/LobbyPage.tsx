// packages/client/src/pages/LobbyPage.tsx
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import styles from './LobbyPage.module.css';

interface LobbyPageProps {
  sendMessage: (msg: any) => void;
  roomCode: string;
  playerId: string;
}

type LobbyPhase = 'select' | 'waiting';

export const LobbyPage: React.FC<LobbyPageProps> = ({
  sendMessage,
  roomCode,
  playerId,
}) => {
  const [phase, setPhase] = useState<LobbyPhase>('select');
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinedPlayers, setJoinedPlayers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [localRoomCode, setLocalRoomCode] = useState('');

  // 当 roomCode 由外部设置时，进入等待阶段
  useEffect(() => {
    if (roomCode) {
      setPhase('waiting');
      setLocalRoomCode(roomCode);
    }
  }, [roomCode]);

  // 监听其他玩家加入
  const [wsMessage, setWsMessage] = useState<any>(null);

  const handleCreate = () => {
    if (!playerName.trim()) {
      setError('请输入昵称');
      return;
    }
    setError('');
    setJoinedPlayers([playerName]);
    sendMessage({
      type: 'CREATE_ROOM',
      playerName: playerName.trim(),
      maxPlayers,
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      setError('请输入昵称');
      return;
    }
    if (!joinRoomCode.trim()) {
      setError('请输入房间号');
      return;
    }
    setError('');
    sendMessage({
      type: 'JOIN_ROOM',
      roomCode: joinRoomCode.trim(),
      playerName: playerName.trim(),
    });
  };

  const handleStartGame = () => {
    sendMessage({ type: 'START_GAME' });
  };

  if (phase === 'waiting') {
    return (
      <div className={styles.container}>
        <div className={styles.waitingCard}>
          <h2 className={styles.title}>等待玩家加入</h2>
          <div className={styles.roomCodeDisplay}>
            <span className={styles.roomCodeLabel}>房间号</span>
            <span className={styles.roomCodeValue}>{localRoomCode}</span>
          </div>
          <div className={styles.playerList}>
            <h3 className={styles.sectionTitle}>已加入玩家</h3>
            {joinedPlayers.map((name, idx) => (
              <div key={idx} className={styles.playerItem}>
                <span className={styles.playerIndex}>{idx + 1}</span>
                <span className={styles.playerName}>{name}</span>
              </div>
            ))}
          </div>
          <button
            className={styles.startButton}
            onClick={handleStartGame}
            disabled={joinedPlayers.length < 2}
          >
            {joinedPlayers.length < 2
              ? `等待更多玩家 (${joinedPlayers.length}/${maxPlayers})`
              : '开始游戏'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.gameTitle}>大宋百商图</h1>
      <p className={styles.gameSubtitle}>线上版 · 2-4人对战</p>

      <div className={styles.cardsRow}>
        {/* 创建房间 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>创建房间</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>昵称</label>
            <input
              className={styles.input}
              type="text"
              placeholder="输入你的昵称"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={12}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>人数上限</label>
            <div className={styles.playerCountButtons}>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`${styles.countButton} ${maxPlayers === n ? styles.countButtonActive : ''}`}
                  onClick={() => setMaxPlayers(n)}
                >
                  {n}人
                </button>
              ))}
            </div>
          </div>
          <button className={styles.primaryButton} onClick={handleCreate}>
            创建房间
          </button>
        </div>

        {/* 加入房间 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>加入房间</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>昵称</label>
            <input
              className={styles.input}
              type="text"
              placeholder="输入你的昵称"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={12}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>房间号</label>
            <input
              className={styles.input}
              type="text"
              placeholder="输入 4 位房间号"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value)}
              maxLength={4}
            />
          </div>
          <button className={styles.primaryButton} onClick={handleJoin}>
            加入房间
          </button>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};
