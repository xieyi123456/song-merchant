// packages/client/src/components/PublicArea.tsx
import React from 'react';
import {
  PublicGameState,
  CardGrade,
  ShopCard,
  GuestCard,
  EventCard,
} from '@song-merchant/shared';
import styles from './PublicArea.module.css';

interface PublicAreaProps {
  gameState: PublicGameState;
}

function isEventCard(card: GuestCard | EventCard): card is EventCard {
  return 'effect' in card;
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

      {/* 公共牌 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>公共牌</h3>
        <div className={styles.publicCards}>
          {publicArea.publicCards.map((card, idx) =>
            isEventCard(card) ? (
              <EventCardItem key={card.id} card={card} />
            ) : (
              <GuestCardItem key={card.id} card={card} />
            )
          )}
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
          {shop.synergy.map((s, i) => (
            <span key={i} className={styles.synergyTag}>
              联动 +{s.bonus}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const GuestCardItem: React.FC<{ card: GuestCard }> = ({ card }) => {
  return (
    <div className={styles.guestCard}>
      <div className={styles.guestName}>{card.name}</div>
      <div className={styles.guestTitle}>{card.title}</div>
      <div className={styles.guestDishCount}>点菜 {card.dishCount} 道</div>
      <div className={styles.guestPrefs}>
        {card.shopPreferences.map((pref, i) => (
          <span key={i} className={styles.prefTag}>
            {pref.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const EventCardItem: React.FC<{ card: EventCard }> = ({ card }) => {
  return (
    <div className={styles.eventCard}>
      <div className={styles.eventName}>{card.name}</div>
      <div className={styles.eventDesc}>{card.description}</div>
    </div>
  );
};
