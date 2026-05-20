// packages/client/src/components/ActionPanel.tsx
import React, { useState } from 'react';
import {
  PublicGameState,
  PlayerActionPhase,
  CardGrade,
  MenuCard,
} from '@song-merchant/shared';
import styles from './ActionPanel.module.css';

interface ActionPanelProps {
  gameState: PublicGameState;
  isMyTurn: boolean;
  sendMessage: (msg: any) => void;
  playerId: string;
  prepareCards: MenuCard[];
}

const GRADE_COST: Record<number, number> = { 4: 1, 3: 3, 2: 5, 1: 8 };

const REMOVE_COST = 3;

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
  playerId,
  prepareCards,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<CardGrade | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedRemoveCardId, setSelectedRemoveCardId] = useState<string | null>(null);

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

  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;
  const myMoney = me.money;

  const activeEffects = gameState.activeEffects || [];

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

  const handleRemoveCard = () => {
    if (selectedRemoveCardId) {
      sendMessage({ type: 'REMOVE_CARD', cardId: selectedRemoveCardId });
      setSelectedRemoveCardId(null);
    }
  };

  const handleSkipRemove = () => {
    sendMessage({ type: 'SKIP_REMOVE' });
  };

  const handleSelectGuest = (cardIndex: number) => {
    sendMessage({ type: 'SELECT_GUEST', cardIndex });
  };

  const getShopTotalCost = (shop: { buildCost: number }) => {
    const builtCount = me.streetSlots.filter((s) => s.state === 'built').length;
    const clearingCost = builtCount === 0 ? 0 : builtCount + 1;
    return shop.buildCost + clearingCost;
  };

  const effectsBanner = activeEffects.length > 0 && (
    <div className={styles.effectsBanner}>
      {activeEffects.map((ef, idx) => (
        <div key={idx} className={styles.effectItem}>
          【{ef.eventName}】{ef.effect.type === 'income_modifier' ? `收入修正 ${ef.effect.value > 0 ? '+' : ''}${ef.effect.value}` : ef.effect.type === 'draw_extra' ? `翻牌数 ${ef.effect.value > 0 ? '+' : ''}${ef.effect.value}` : ef.effect.type === 'discount' ? `购买折扣 -${ef.effect.value}两` : ef.effect.type === 'skip_turn' ? '跳过回合' : ''}（影响：{ef.effect.scope}）
        </div>
      ))}
    </div>
  );

  switch (gameState.playerPhase) {
    case PlayerActionPhase.PURCHASE:
      return (
        <div className={styles.container}>
          <h3 className={styles.title}>购买阶段</h3>
          <div className={styles.moneyInfo}>银子：{myMoney} 两</div>
          {effectsBanner}

          <div className={styles.subSection}>
            <div className={styles.subTitle}>买菜单牌（选品级）</div>
            <div className={styles.gradeButtons}>
              {([CardGrade.ONE, CardGrade.TWO, CardGrade.THREE, CardGrade.FOUR] as CardGrade[]).map(
                (grade) => {
                  const supply = gameState.publicArea.menuSupply[grade] || [];
                  const cost = GRADE_COST[grade] || 0;
                  const disabled = supply.length === 0 || myMoney < cost;
                  return (
                    <button
                      key={grade}
                      className={`${styles.gradeButton} ${selectedGrade === grade ? styles.gradeButtonActive : ''}`}
                      onClick={() => !disabled && setSelectedGrade(grade)}
                      disabled={disabled}
                      title={myMoney < cost ? `银子不足（需要 ${cost} 两）` : undefined}
                    >
                      {gradeLabel(grade)} ({supply.length}) {cost}两
                    </button>
                  );
                }
              )}
            </div>
            <button
              className={styles.actionButton}
              onClick={handleBuyMenu}
              disabled={selectedGrade === null || (selectedGrade !== null && myMoney < (GRADE_COST[selectedGrade] || 0))}
            >
              确认购买菜单
            </button>
          </div>

          <div className={styles.divider}>或</div>

          <div className={styles.subSection}>
            <div className={styles.subTitle}>买店铺牌（选店铺）</div>
            <div className={styles.shopButtons}>
              {gameState.publicArea.shopDisplay.map((shop) => {
                const totalCost = getShopTotalCost(shop);
                const cantAfford = myMoney < totalCost;
                return (
                  <button
                    key={shop.id}
                    className={`${styles.shopButton} ${selectedShopId === shop.id ? styles.shopButtonActive : ''} ${cantAfford ? styles.shopButtonDisabled : ''}`}
                    onClick={() => !cantAfford && setSelectedShopId(shop.id)}
                    disabled={cantAfford}
                    title={cantAfford ? `银子不足（需要 ${totalCost} 两，含地基费 ${totalCost - shop.buildCost} 两）` : `总费用 ${totalCost} 两（建造 ${shop.buildCost} + 地基 ${totalCost - shop.buildCost}）`}
                  >
                    {shop.emoji} {shop.name} ({totalCost}两)
                  </button>
                );
              })}
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

    case PlayerActionPhase.PREPARATION: {
      const canRemove = myMoney >= REMOVE_COST && prepareCards.length > 0;
      return (
        <div className={styles.container}>
          <h3 className={styles.title}>备菜阶段</h3>
          <div className={styles.moneyInfo}>银子：{myMoney} 两</div>
          {effectsBanner}
          <p className={styles.hint}>
            花费 {REMOVE_COST} 两永久移出一张菜单牌（精简牌库），或跳过
          </p>

          {canRemove ? (
            <>
              <div className={styles.subTitle}>选择要移出的牌：</div>
              <div className={styles.cardList}>
                {prepareCards.map((card) => (
                  <button
                    key={card.id}
                    className={`${styles.cardItem} ${selectedRemoveCardId === card.id ? styles.cardItemActive : ''}`}
                    onClick={() => setSelectedRemoveCardId(card.id)}
                  >
                    <span className={styles.cardDishName}>{card.dishName}</span>
                    <span className={styles.cardGradeTag}>{gradeLabel(card.grade)}</span>
                    <span className={styles.cardIncomeTag}>收入+{card.income}</span>
                  </button>
                ))}
              </div>
              <button
                className={styles.actionButton}
                onClick={handleRemoveCard}
                disabled={selectedRemoveCardId === null}
              >
                确认移出（花费 {REMOVE_COST} 两）
              </button>
            </>
          ) : (
            <p className={styles.hint}>
              {myMoney < REMOVE_COST ? `银子不足 ${REMOVE_COST} 两，无法移出` : '没有可移出的牌'}
            </p>
          )}

          <button className={styles.skipButton} onClick={handleSkipRemove}>
            跳过备菜
          </button>
        </div>
      );
    }

    case PlayerActionPhase.OPERATION:
      return (
        <div className={styles.container}>
          <h3 className={styles.title}>经营阶段</h3>
          <div className={styles.moneyInfo}>银子：{myMoney} 两</div>
          {effectsBanner}
          <div className={styles.subTitle}>选择客人（从左到右，跳过需付1两/位）</div>
          <div className={styles.guestButtons}>
            {gameState.publicArea.publicCards.map((card, idx) => {
              const skipFee = idx; // 第 N 个需付 N 两
              const canAfford = myMoney >= skipFee;
              if ('effect' in card) {
                return (
                  <button
                    key={card.id}
                    className={styles.eventButton}
                    onClick={() => handleSelectGuest(idx)}
                    disabled={!canAfford}
                  >
                    {card.name} (事件){skipFee > 0 ? ` -${skipFee}两` : ''}
                  </button>
                );
              }
              return (
                <button
                  key={card.id}
                  className={`${styles.guestSelectButton} ${!canAfford ? styles.shopButtonDisabled : ''}`}
                  onClick={() => canAfford && handleSelectGuest(idx)}
                  disabled={!canAfford}
                  title={skipFee > 0 ? `跳过费 ${skipFee} 两` : undefined}
                >
                  <span className={styles.guestSelectName}>{card.name}</span>
                  <span className={styles.guestSelectDish}>{card.dishCount} 道</span>
                  {skipFee > 0 && <span className={styles.skipFee}>-{skipFee}两</span>}
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
