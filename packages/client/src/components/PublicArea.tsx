// packages/client/src/components/PublicArea.tsx
import React from 'react';
import {
  PublicGameState,
  CardGrade,
  ShopCard,
  ShopType,
  GuestCard,
} from '@song-merchant/shared';
import styles from './PublicArea.module.css';

const SHOP_INFO: Record<string, { emoji: string; name: string }> = {
  [ShopType.DRINKS]: { emoji: '🥤', name: '饮子铺' },
  [ShopType.PORCELAIN]: { emoji: '🏺', name: '瓷器铺' },
  [ShopType.WINEHOUSE]: { emoji: '🍶', name: '酒肆' },
  [ShopType.BOOKSHOP]: { emoji: '📚', name: '书坊' },
  [ShopType.SILK]: { emoji: '🧵', name: '绸缎庄' },
  [ShopType.JEWELRY]: { emoji: '💍', name: '首饰铺' },
  [ShopType.FORTUNE]: { emoji: '🔮', name: '卦肆' },
  [ShopType.GAMBLING]: { emoji: '🎲', name: '官扑铺' },
  [ShopType.CUJU]: { emoji: '⚽', name: '蹴鞠场' },
  [ShopType.THEATER]: { emoji: '🎭', name: '勾栏瓦肆' },
};

interface PublicAreaProps {
  gameState: PublicGameState;
}

function gradeLabel(grade: CardGrade): string {
  switch (grade) {
    case CardGrade.ONE: return '一品';
    case CardGrade.TWO: return '二品';
    case CardGrade.THREE: return '三品';
    case CardGrade.FOUR: return '四品';
    default: return '';
  }
}

function gradeColor(grade: CardGrade): string {
  switch (grade) {
    case CardGrade.ONE: return '#d4a030';
    case CardGrade.TWO: return '#a08040';
    case CardGrade.THREE: return '#707070';
    case CardGrade.FOUR: return '#505050';
    default: return '#888';
  }
}

export const PublicArea: React.FC<PublicAreaProps> = ({ gameState }) => {
  const { publicArea } = gameState;

  return (
    <div className={styles.container}>
      {/* 菜单供应区 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>菜单供应</h3>
        <div className={styles.menuSupply}>
          {([CardGrade.ONE, CardGrade.TWO, CardGrade.THREE, CardGrade.FOUR] as CardGrade[]).map(
            (grade) => {
              const supply = publicArea.menuSupply[grade] || [];
              return (
                <div key={grade} className={styles.menuGrade}>
                  <div
                    className={styles.gradeBadge}
                    style={{ backgroundColor: gradeColor(grade) }}
                  >
                    {gradeLabel(grade)}
                  </div>
                  <div className={styles.menuInfo}>
                    <span className={styles.menuCost}>
                      {grade > 0 ? `${grade * 2} 两` : '-'}
                    </span>
                    <span className={styles.menuStock}>
                      剩余 {supply.length}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* 店铺牌 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>店铺牌</h3>
        <div className={styles.shopDisplay}>
          {publicArea.shopDisplay.map((shop) => (
            <ShopCardItem key={shop.id} shop={shop} />
          ))}
        </div>
      </div>

      {/* 客人牌 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>客人牌</h3>
        <div className={styles.publicCards}>
          {publicArea.publicCards.map((card, idx) => (
            <GuestCardItem key={card.id} card={card as GuestCard} />
          ))}
        </div>
      </div>
    </div>
  );
};

const ShopCardItem: React.FC<{ shop: ShopCard }> = ({ shop }) => {
  return (
    <div className={styles.shopCard}>
      <div className={styles.shopEmoji}>{shop.emoji}</div>
      <div className={styles.shopName}>{shop.name}</div>
      <div className={styles.shopBuildCost}>建造 {shop.buildCost} 两</div>
      <div className={styles.shopBonus}>收益 +{shop.bonusIncome} 两</div>
      {shop.synergy && shop.synergy.length > 0 && (
        <div className={styles.shopSynergy}>
          {shop.synergy.map((s, i) => {
            const partner = SHOP_INFO[s.withShopType];
            return (
              <span key={i} className={styles.synergyTag}>
                {partner ? `${partner.emoji}${partner.name}` : ''} 联动+{s.bonus}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

const GuestCardItem: React.FC<{ card: GuestCard }> = ({ card }) => {
  const isAllShops = (card as any).allShops === true;
  return (
    <div className={styles.guestCard}>
      <div className={styles.guestName}>{card.name}</div>
      <div className={styles.guestTitle}>{card.title}</div>
      <div className={styles.guestDishCount}>点菜 {card.dishCount} 道</div>
      <div className={styles.guestPrefs}>
        {isAllShops ? (
          <span className={styles.prefTag}>所有店铺</span>
        ) : (
          card.shopPreferences.map((pref, i) => (
            <span key={i} className={styles.prefTag}>
              {pref.label}
            </span>
          ))
        )}
      </div>
    </div>
  );
};
