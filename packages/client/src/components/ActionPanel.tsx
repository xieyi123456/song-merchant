// packages/client/src/components/ActionPanel.tsx
import React, { useState } from 'react';
import {
  PublicGameState,
  PlayerActionPhase,
  CardGrade,
} from '@song-merchant/shared';
import styles from './ActionPanel.module.css';

interface ActionPanelProps {
  gameState: PublicGameState;
  isMyTurn: boolean;
  sendMessage: (msg: any) => void;
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

export const ActionPanel: React.FC<ActionPanelProps> = ({
  gameState,
  isMyTurn,
  sendMessage,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<CardGrade | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  if (!isMyTurn) {
    return (
      <div className={styles.container}>
        <div className={styles.waitingHint}>
          <span className={styles.waitingIcon}>⏳</span>
          <span>等待 {gameState.players[gameState.currentPlayerIndex]?.name} 操作</span>
        </div>
      </div>
    );
  }

  const handleBuyMenu = () => {
    if (selectedGrade !== null) {
      sendMessage({ type: 'BUY_MENU', grade: selectedGrade });
      setSelectedGrade(null);
    }
  };

  const handleBuyShop = () => {
    if (selectedShopId) {
      sendMessage({ type: 'BUY_SHOP', shopCardId: selectedShopId });
      setSelectedShopId(null);
    }
  };

  const handleSkipPurchase = () => {
    sendMessage({ type: 'SKIP_PURCHASE' });
  };

  const handleSkipRemove = () => {
    sendMessage({ type: 'SKIP_REMOVE' });
  };

  const handleSelectGuest = (cardIndex: number) => {
    sendMessage({ type: 'SELECT_GUEST', cardIndex });
  };

  switch (gameState.playerPhase) {
    case PlayerActionPhase.PURCHASE:
      return (
        <div className={styles.container}>
          <h3 className={styles.title}>购买阶段</h3>

          <div className={styles.subSection}>
            <div className={styles.subTitle}>买菜单牌（选品级）</div>
            <div className={styles.gradeButtons}>
              {([CardGrade.ONE, CardGrade.TWO, CardGrade.THREE, CardGrade.FOUR] as CardGrade[]).map(
                (grade) => {
                  const supply = gameState.publicArea.menuSupply[grade] || [];
                  const disabled = supply.length === 0;
                  return (
                    <button
                      key={grade}
                      className={`${styles.gradeButton} ${selectedGrade === grade ? styles.gradeButtonActive : ''}`}
                      onClick={() => !disabled && setSelectedGrade(grade)}
                      disabled={disabled}
                    >
                      {gradeLabel(grade)} ({supply.length})
                    </button>
                  );
                }
              )}
            </div>
            <button
              className={styles.actionButton}
              onClick={handleBuyMenu}
              disabled={selectedGrade === null}
            >
              确认购买菜单
            </button>
          </div>

          <div className={styles.divider}>或</div>

          <div className={styles.subSection}>
            <div className={styles.subTitle}>买店铺牌（选店铺）</div>
            <div className={styles.shopButtons}>
              {gameState.publicArea.shopDisplay.map((shop) => (
                <button
                  key={shop.id}
                  className={`${styles.shopButton} ${selectedShopId === shop.id ? styles.shopButtonActive : ''}`}
                  onClick={() => setSelectedShopId(shop.id)}
                >
                  {shop.emoji} {shop.name} ({shop.buildCost}两)
                </button>
              ))}
            </div>
            <button
              className={styles.actionButton}
              onClick={handleBuyShop}
              disabled={selectedShopId === null}
            >
              确认购买店铺
            </button>
          </div>

          <button className={styles.skipButton} onClick={handleSkipPurchase}>
            跳过购买
          </button>
        </div>
      );

    case PlayerActionPhase.PREPARATION:
      return (
        <div className={styles.container}>
          <h3 className={styles.title}>备菜阶段</h3>
          <p className={styles.hint}>
            花费 3 两银钱永久移出一张菜单牌（精简牌库），或跳过
          </p>
          <p className={styles.hint}>请查看 PREPARE_REVEAL 消息中展示的全部牌，选择要剔除的牌</p>
          <button className={styles.skipButton} onClick={handleSkipRemove}>
            跳过备菜
          </button>
        </div>
      );

    case PlayerActionPhase.OPERATION:
      return (
        <div className={styles.container}>
          <h3 className={styles.title}>经营阶段</h3>
          <div className={styles.subTitle}>选择一位客人招待</div>
          <div className={styles.guestButtons}>
            {gameState.publicArea.publicCards.map((card, idx) => {
              if ('effect' in card) {
                // 事件牌
                return (
                  <button
                    key={card.id}
                    className={styles.eventButton}
                    onClick={() => handleSelectGuest(idx)}
                  >
                    {card.name} (事件)
                  </button>
                );
              }
              // 客人牌
              return (
                <button
                  key={card.id}
                  className={styles.guestSelectButton}
                  onClick={() => handleSelectGuest(idx)}
                >
                  <span className={styles.guestSelectName}>{card.name}</span>
                  <span className={styles.guestSelectDish}>{card.dishCount} 道</span>
                </button>
              );
            })}
          </div>
        </div>
      );

    default:
      return (
        <div className={styles.container}>
          <div className={styles.waitingHint}>等待中...</div>
        </div>
      );
  }
};
