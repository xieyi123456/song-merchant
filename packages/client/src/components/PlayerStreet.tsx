// packages/client/src/components/PlayerStreet.tsx
import React, { useState, useEffect } from 'react';
import { StreetSlot } from '@song-merchant/shared';
import styles from './PlayerStreet.module.css';

interface PlayerStreetPlayer {
  id: string;
  name: string;
  money: number;
  libraryCount: number;
  discard: any[];
  removed: any[];
  streetSlots: StreetSlot[];
}

interface PlayerStreetProps {
  player: PlayerStreetPlayer;
  isCurrentPlayer: boolean;
  isMe: boolean;
  phaseStartTime: number;
  phaseTimeLimit: number;
}

export const PlayerStreet: React.FC<PlayerStreetProps> = ({
  player,
  isCurrentPlayer,
  isMe,
  phaseStartTime,
  phaseTimeLimit,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isCurrentPlayer) return;

    const update = () => {
      const elapsed = Date.now() - phaseStartTime;
      const left = Math.max(0, Math.ceil((phaseTimeLimit - elapsed) / 1000));
      setSecondsLeft(left);
    };

    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [isCurrentPlayer, phaseStartTime, phaseTimeLimit]);

  const builtCount = player.streetSlots.filter(
    (s) => s.state === 'built'
  ).length;

  const clearedCount = player.streetSlots.filter(
    (s) => s.state === 'cleared'
  ).length;

  return (
    <div className={`${styles.wrapper} ${isMe ? styles.myWrapper : ''}`}>
      <div
        className={`${styles.container} ${isCurrentPlayer ? styles.activeRow : ''} ${isMe ? styles.myRow : ''}`}
      >
        {/* 玩家信息 */}
        <div className={styles.playerInfo}>
          <div className={styles.nameRow}>
            <span className={styles.playerName}>
              {player.name}
              {isMe && <span className={styles.meTag}>我</span>}
            </span>
            {isCurrentPlayer && (
              <span className={styles.timerBadge}>
                {secondsLeft}s
              </span>
            )}
          </div>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <span className={styles.statLabel}>银钱</span>
              <span className={styles.statValue}>{player.money}</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.statLabel}>店铺</span>
              <span className={styles.statValue}>{builtCount}/8</span>
            </span>
            <button
              className={`${styles.deckToggle} ${expanded ? styles.deckToggleActive : ''}`}
              onClick={() => setExpanded(!expanded)}
              title="展开查看雅阁/后厨"
            >
              <span className={styles.deckLabel}>雅阁 {player.libraryCount}</span>
              <span className={styles.deckSep}>|</span>
              <span className={styles.deckLabel}>后厨 {player.discard.length}</span>
              <span className={styles.deckArrow}>{expanded ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* 2x4 小地图 */}
        <div className={styles.grid}>
          {player.streetSlots.map((slot, idx) => (
            <div key={idx} className={styles.gridCell}>
              {slot.state === 'uncleared' ? (
                <div className={styles.unclearedCell}>
                  <span className={styles.cellIndex}>{idx + 1}</span>
                  <span className={styles.clearingCost}>
                    {(slot as { state: 'uncleared'; clearingCost: number }).clearingCost === 0
                      ? '免费'
                      : `${(slot as { state: 'uncleared'; clearingCost: number }).clearingCost}两`}
                  </span>
                </div>
              ) : slot.state === 'cleared' ? (
                <div className={styles.clearedCell}>
                  <span className={styles.cellIndex}>{idx + 1}</span>
                  <span className={styles.clearedLabel}>可建造</span>
                </div>
              ) : (
                <div className={styles.builtCell}>
                  <span className={styles.shopEmoji}>
                    {(slot as { state: 'built'; shopCard: any }).shopCard.emoji}
                  </span>
                  <span className={styles.shopName}>
                    {(slot as { state: 'built'; shopCard: any }).shopCard.name}
                  </span>
                  <span className={styles.shopBonus}>
                    +{(slot as { state: 'built'; shopCard: any }).shopCard.bonusIncome}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 雅阁/后厨展开面板 */}
      {expanded && (
        <div className={styles.deckPanel}>
          <div className={styles.deckSection}>
            <div className={styles.deckSectionTitle}>
              雅阁（牌库）· {player.libraryCount} 张
            </div>
            {player.libraryCount > 0 ? (
              <div className={styles.deckNote}>
                牌库内容保密，经营阶段会从中翻牌
              </div>
            ) : (
              <div className={styles.deckNote}>牌库已空</div>
            )}
          </div>
          <div className={styles.deckSection}>
            <div className={styles.deckSectionTitle}>
              后厨（弃牌堆）· {player.discard.length} 张
            </div>
            {player.discard.length > 0 ? (
              <div className={styles.cardGrid}>
                {player.discard.map((card: any) => (
                  <div key={card.id} className={styles.menuCard}>
                    <span className={styles.cardDish}>{card.dishName}</span>
                    <span className={styles.cardIncome}>+{card.income}两</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.deckNote}>弃牌堆为空</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
