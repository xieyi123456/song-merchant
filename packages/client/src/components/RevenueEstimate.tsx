// packages/client/src/components/RevenueEstimate.tsx
import React from 'react';
import {
  PublicGameState,
  PlayerActionPhase,
  PublicPlayer,
  GuestCard,
  ShopCard,
} from '@song-merchant/shared';
import styles from './RevenueEstimate.module.css';

interface RevenueEstimateProps {
  gameState: PublicGameState;
  isMyTurn: boolean;
}

/** 在客户端计算店铺匹配和联动加成 */
function estimateShopBonus(
  player: PublicPlayer,
  guest: GuestCard,
): { matchBonus: number; synergyBonus: number } {
  const builtShops = player.streetSlots
    .filter((slot): slot is { state: 'built'; shopCard: ShopCard } => slot.state === 'built')
    .map((slot) => slot.shopCard);

  let matchBonus = 0;
  let synergyBonus = 0;

  const matchedShops = builtShops.filter((shop) =>
    guest.shopPreferences.some((pref) => pref.shopType === shop.type),
  );

  for (const shop of matchedShops) {
    matchBonus += shop.bonusIncome;

    for (const syn of shop.synergy) {
      const hasPartner = builtShops.some((s) => s.type === syn.withShopType);
      if (hasPartner) {
        synergyBonus += syn.bonus;
      }
    }
  }

  return { matchBonus, synergyBonus };
}

export const RevenueEstimate: React.FC<RevenueEstimateProps> = ({
  gameState,
  isMyTurn,
}) => {
  // 仅在经营阶段且是自己回合时显示
  if (
    gameState.playerPhase !== PlayerActionPhase.OPERATION ||
    !isMyTurn
  ) {
    return null;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) return null;

  // 找出公共牌中的客人牌，逐一展示预估收益
  const guests = gameState.publicArea.publicCards.filter(
    (card): card is GuestCard => !('effect' in card),
  );

  if (guests.length === 0) {
    return null;
  }

  return (
    <div className={styles.bar}>
      <span className={styles.label}>收益预估:</span>
      {guests.map((guest) => {
        const { matchBonus, synergyBonus } = estimateShopBonus(currentPlayer, guest);
        return (
          <div key={guest.id} className={styles.guestRow}>
            <span className={styles.guestName}>{guest.name}</span>
            <span className={styles.plus}>+</span>
            <span className={styles.value}>匹配 {matchBonus}</span>
            <span className={styles.plus}>+</span>
            <span className={styles.value}>联动 {synergyBonus}</span>
            <span className={styles.equals}>=</span>
            <span className={styles.total}>? + {matchBonus + synergyBonus} 两</span>
          </div>
        );
      })}
    </div>
  );
};
