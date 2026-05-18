import {
  CardGrade,
  PlayerActionPhase,
  RoundPhase,
  GameState,
  ClientMessage,
  ShopCard,
  isGuestCard,
} from './types.js';
import {
  REMOVE_COST,
  SHOPS_DISPLAY_COUNT,
  VICTORY_SHOPS,
  VICTORY_MONEY,
} from './constants.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 校验玩家操作是否合法
 * @param state 当前游戏状态
 * @param playerIndex 操作的玩家索引
 * @param action 客户端消息（操作意图）
 * @returns 校验结果
 */
export function validateAction(
  state: GameState,
  playerIndex: number,
  action: ClientMessage,
): ValidationResult {
  // ---- 全局检查 ----

  if (state.isGameOver) {
    return { valid: false, error: '游戏已结束' };
  }

  if (state.currentPlayerIndex !== playerIndex) {
    return { valid: false, error: '不是你的回合' };
  }

  // ---- 根据操作类型校验 ----

  switch (action.type) {
    case 'BUY_MENU':
      return validateBuyMenu(state, playerIndex, action.grade);

    case 'BUY_SHOP':
      return validateBuyShop(state, playerIndex, action.shopCardId);

    case 'SKIP_PURCHASE':
      return validatePhase(state, PlayerActionPhase.PURCHASE);

    case 'REMOVE_CARD':
      return validateRemoveCard(state, playerIndex, action.cardId);

    case 'SKIP_REMOVE':
      return validatePhase(state, PlayerActionPhase.PREPARATION);

    case 'SELECT_GUEST':
      return validateSelectGuest(state, playerIndex, action.cardIndex);

    case 'READY':
      return { valid: true };

    default:
      return { valid: false, error: '未知操作类型' };
  }
}

// ========================================
// 阶段校验
// ========================================

function validatePhase(
  state: GameState,
  expectedPhase: PlayerActionPhase,
): ValidationResult {
  if (state.playerPhase !== expectedPhase) {
    return {
      valid: false,
      error: `当前阶段不正确，期望 ${expectedPhase}，实际 ${state.playerPhase}`,
    };
  }
  return { valid: true };
}

// ========================================
// 购买菜单牌校验
// ========================================

function validateBuyMenu(
  state: GameState,
  playerIndex: number,
  grade: CardGrade,
): ValidationResult {
  const phaseResult = validatePhase(state, PlayerActionPhase.PURCHASE);
  if (!phaseResult.valid) return phaseResult;

  const player = state.players[playerIndex];
  const supply = state.publicArea.menuSupply[grade];

  if (!supply || supply.length === 0) {
    return { valid: false, error: `供应区没有 ${grade} 品菜单牌` };
  }

  const card = supply[0];
  if (player.money < card.cost) {
    return { valid: false, error: `银钱不足，需要 ${card.cost} 两，当前 ${player.money} 两` };
  }

  return { valid: true };
}

// ========================================
// 购买店铺牌校验
// ========================================

function validateBuyShop(
  state: GameState,
  playerIndex: number,
  shopCardId: string,
): ValidationResult {
  const phaseResult = validatePhase(state, PlayerActionPhase.PURCHASE);
  if (!phaseResult.valid) return phaseResult;

  const player = state.players[playerIndex];

  const shopCard = state.publicArea.shopDisplay.find((s) => s.id === shopCardId);
  if (!shopCard) {
    return { valid: false, error: '店铺不存在于展示区' };
  }

  const emptySlots = player.streetSlots.filter((s) => s.state === 'empty');
  if (emptySlots.length === 0) {
    return { valid: false, error: '商业街已满，无法建造新店铺' };
  }

  const builtCount = player.streetSlots.filter((s) => s.state === 'built').length;
  const clearingCost = builtCount === 0 ? 0 : builtCount + 1;
  const totalCost = shopCard.buildCost + clearingCost;

  if (player.money < totalCost) {
    return {
      valid: false,
      error: `银钱不足，需要 ${totalCost} 两（建造 ${shopCard.buildCost} + 地基 ${clearingCost}），当前 ${player.money} 两`,
    };
  }

  return { valid: true };
}

// ========================================
// 备菜剔除校验
// ========================================

function validateRemoveCard(
  state: GameState,
  playerIndex: number,
  cardId: string,
): ValidationResult {
  const phaseResult = validatePhase(state, PlayerActionPhase.PREPARATION);
  if (!phaseResult.valid) return phaseResult;

  const player = state.players[playerIndex];

  if (player.money < REMOVE_COST) {
    return { valid: false, error: `银钱不足，备菜剔除需要 ${REMOVE_COST} 两，当前 ${player.money} 两` };
  }

  const inLibrary = player.library.some((c) => c.id === cardId);
  const inDiscard = player.discard.some((c) => c.id === cardId);

  if (!inLibrary && !inDiscard) {
    return { valid: false, error: '要剔除的牌不存在于牌库或弃牌堆中' };
  }

  return { valid: true };
}

// ========================================
// 经营阶段选客人校验
// ========================================

function validateSelectGuest(
  state: GameState,
  playerIndex: number,
  cardIndex: number,
): ValidationResult {
  const phaseResult = validatePhase(state, PlayerActionPhase.OPERATION);
  if (!phaseResult.valid) return phaseResult;

  if (cardIndex < 0 || cardIndex >= state.publicArea.publicCards.length) {
    return {
      valid: false,
      error: `客人牌索引不合法：${cardIndex}，有效范围 0-${state.publicArea.publicCards.length - 1}`,
    };
  }

  return { valid: true };
}
