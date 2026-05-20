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

interface SynergyDetail {
  shop1: string;
  shop2: string;
  bonus: number;
}

function estimateShopBonus(
  player: PublicPlayer,
  guest: GuestCard,
): { matchBonus: number; synergyBonus: number; synergyDetails: SynergyDetail[] } {
  const builtShops = player.streetSlots
    .filter((slot): slot is { state: 'built'; shopCard: ShopCard } => slot.state === 'built')
    .map((slot) => slot.shopCard);

  let matchBonus = 0;
  let synergyBonus = 0;
  const synergyDetails: SynergyDetail[] = [];

  const matchedShops = builtShops.filter((shop) =>
    guest.shopPreferences.some((pref) => pref.shopType === shop.type),
  );

  for (const shop of matchedShops) {
    matchBonus += shop.bonusIncome;

    for (const syn of shop.synergy) {
      const partner = builtShops.find((s) => s.type === syn.withShopType);
      if (partner) {
        synergyBonus += syn.bonus;
        synergyDetails.push({
          shop1: `${shop.emoji}${shop.name}`,
          shop2: `${partner.emoji}${partner.name}`,
          bonus: syn.bonus,
        });
      }
    }
  }

  return { matchBonus, synergyBonus, synergyDetails };
}

export const RevenueEstimate: React.FC<RevenueEstimateProps> = ({
  gameState,
  isMyTurn,
}) => {
  if (
    gameState.playerPhase !== PlayerActionPhase.OPERATION ||
    !isMyTurn
  ) {
    return null;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) return null;

  const guests = gameState.publicArea.publicCards.filter(
    (card): card is GuestCard => !('effect' in card),
  );

  if (guests.length === 0) {
    return null;
  }

  // 生效中的事件效果
  const activeEffects = gameState.activeEffects || [];
  const drawExtraEffect = activeEffects.find((ef) => ef.effect.type === 'draw_extra');
  const incomeModEffects = activeEffects.filter((ef) => ef.effect.type === 'income_modifier');

  return (
    <div className={styles.bar}>
      <span className={styles.label}>收益预估:</span>
      {activeEffects.length > 0 && (
        <div className={styles.effectsHint}>
          {drawExtraEffect && <span>翻牌{drawExtraEffect.effect.value > 0 ? '+' : ''}{drawExtraEffect.effect.value} </span>}
          {incomeModEffects.map((ef, i) => (
            <span key={i}>收入修正{ef.effect.value > 0 ? '+' : ''}{ef.effect.value} </span>
          ))}
        </div>
      )}
      {guests.map((guest) => {
        const { matchBonus, synergyBonus, synergyDetails } = estimateShopBonus(currentPlayer, guest);
        return (
          <div key={guest.id} className={styles.guestRow}>
            <span className={styles.guestName}>{guest.name}({guest.dishCount}道)</span>
            <span className={styles.plus}>+</span>
            <span className={styles.value}>匹配 {matchBonus}</span>
            {synergyBonus > 0 && (
              <>
                <span className={styles.plus}>+</span>
                <span className={styles.value} title={synergyDetails.map((d) => `${d.shop1}+${d.shop2} 联动+${d.bonus}`).join('，')}>
                  联动 {synergyBonus}
                  <span className={styles.synergyHint}>
                    ({synergyDetails.map((d) => `${d.shop1}+${d.shop2}`).join('，')})
                  </span>
                </span>
              </>
            )}
            <span className={styles.equals}>=</span>
            <span className={styles.total}>? + {matchBonus + synergyBonus} 两</span>
          </div>
        );
      })}
    </div>
  );
};
