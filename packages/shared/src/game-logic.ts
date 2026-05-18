import {
  CardGrade,
  ShopType,
  PlayerActionPhase,
  RoundPhase,
  MenuCard,
  ShopCard,
  GuestCard,
  PublicCard,
  GameState,
  Player,
  PublicArea,
  PublicGameState,
  PublicPlayer,
  StreetSlot,
  TurnResult,
  isGuestCard,
} from './types.js';
import {
  INITIAL_MENU_PER_PLAYER,
  ALL_MENU_CARDS,
  ALL_SHOP_CARDS,
  ALL_GUEST_CARDS,
  ALL_EVENT_CARDS,
  SHOPS_DISPLAY_COUNT,
  PUBLIC_CARDS_COUNT,
  PHASE_TIME_LIMIT,
  REMOVE_COST,
  VICTORY_SHOPS,
  VICTORY_MONEY,
  STARTING_MONEY,
  STREET_SLOT_COUNT,
} from './constants.js';

// ========================================
// 工具函数
// ========================================

/** Fisher-Yates 洗牌算法 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 计算清理地基费用（第1个免费，第n个=n两） */
export function getClearingCost(builtCount: number): number {
  if (builtCount === 0) return 0;
  return builtCount + 1;
}

// ========================================
// 初始化游戏
// ========================================

export function initializeGame(
  roomId: string,
  playerInfos: Array<{ id: string; name: string }>,
): GameState {
  // 创建玩家初始牌库
  const players: Player[] = playerInfos.map((info) => {
    const library: MenuCard[] = [];
    for (const config of INITIAL_MENU_PER_PLAYER) {
      for (let i = 0; i < config.count; i++) {
        const template = ALL_MENU_CARDS[config.grade][0];
        library.push({
          ...template,
          id: `${info.id}-menu-${config.grade}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        });
      }
    }
    return {
      id: info.id,
      name: info.name,
      money: STARTING_MONEY,
      library: shuffle(library),
      discard: [],
      removed: [],
      streetSlots: Array.from({ length: STREET_SLOT_COUNT }, () => ({ state: 'empty' as const })),
    };
  });

  // 准备供应区（移除已发给玩家的初始牌）
  const menuSupply: Record<CardGrade, MenuCard[]> = {
    [CardGrade.ONE]: [...ALL_MENU_CARDS[CardGrade.ONE]],
    [CardGrade.TWO]: [...ALL_MENU_CARDS[CardGrade.TWO]],
    [CardGrade.THREE]: [...ALL_MENU_CARDS[CardGrade.THREE]].slice(playerInfos.length * 2),
    [CardGrade.FOUR]: [...ALL_MENU_CARDS[CardGrade.FOUR]].slice(playerInfos.length * 6),
  };

  // 准备店铺牌堆
  const shuffledShopDeck = shuffle([...ALL_SHOP_CARDS]);
  const shopDisplay = shuffledShopDeck.splice(0, SHOPS_DISPLAY_COUNT);

  // 准备客人+事件牌堆
  const allGuestEventCards: PublicCard[] = [
    ...ALL_GUEST_CARDS,
    ...ALL_EVENT_CARDS,
  ];
  const shuffledGuestEventDeck = shuffle(allGuestEventCards);
  const publicCards = shuffledGuestEventDeck.splice(0, PUBLIC_CARDS_COUNT);

  const publicArea: PublicArea = {
    menuSupply,
    shopDisplay,
    shopDeck: shuffledShopDeck,
    publicCards,
    guestEventDeck: shuffledGuestEventDeck,
  };

  return {
    roomId,
    roundNumber: 1,
    roundPhase: RoundPhase.PLAYER_TURNS,
    currentPlayerIndex: 0,
    playerPhase: PlayerActionPhase.PURCHASE,
    players,
    publicArea,
    phaseStartTime: Date.now(),
    phaseTimeLimit: PHASE_TIME_LIMIT,
    winnerId: null,
    isGameOver: false,
    triggeringPlayerId: null,
  };
}

// ========================================
// 购买阶段
// ========================================

/** 买菜单牌 */
export function buyMenuCard(state: GameState, playerIndex: number, grade: CardGrade): GameState {
  const newState = deepClone(state);
  const player = newState.players[playerIndex];
  const supply = newState.publicArea.menuSupply[grade];

  if (supply.length === 0) {
    return newState;
  }

  const card = supply[0];
  if (player.money < card.cost) {
    return newState;
  }

  player.money -= card.cost;
  supply.splice(0, 1);
  player.discard.push({ ...card });

  newState.playerPhase = PlayerActionPhase.PREPARATION;
  newState.phaseStartTime = Date.now();

  return newState;
}

/** 买店铺牌 */
export function buyShopCard(state: GameState, playerIndex: number, shopCardId: string): GameState {
  const newState = deepClone(state);
  const player = newState.players[playerIndex];
  const displayIndex = newState.publicArea.shopDisplay.findIndex((s) => s.id === shopCardId);

  if (displayIndex === -1) {
    return newState;
  }

  const shopCard = newState.publicArea.shopDisplay[displayIndex];
  const builtCount = player.streetSlots.filter((s) => s.state === 'built').length;
  const clearingCost = getClearingCost(builtCount);
  const totalCost = shopCard.buildCost + clearingCost;

  if (player.money < totalCost) {
    return newState;
  }

  const emptySlotIndex = player.streetSlots.findIndex((s) => s.state === 'empty');
  if (emptySlotIndex === -1) {
    return newState;
  }

  player.money -= totalCost;
  player.streetSlots[emptySlotIndex] = { state: 'built', shopCard: { ...shopCard } };

  newState.publicArea.shopDisplay.splice(displayIndex, 1);
  if (newState.publicArea.shopDeck.length > 0) {
    newState.publicArea.shopDisplay.push(newState.publicArea.shopDeck.shift()!);
  }

  newState.playerPhase = PlayerActionPhase.PREPARATION;
  newState.phaseStartTime = Date.now();

  return newState;
}

/** 跳过购买 */
export function skipPurchase(state: GameState, playerIndex: number): GameState {
  const newState = deepClone(state);
  newState.playerPhase = PlayerActionPhase.PREPARATION;
  newState.phaseStartTime = Date.now();
  return newState;
}

// ========================================
// 备菜阶段
// ========================================

/** 备菜剔除 */
export function removeCard(state: GameState, playerIndex: number, cardId: string): GameState {
  const newState = deepClone(state);
  const player = newState.players[playerIndex];

  if (player.money < REMOVE_COST) {
    return newState;
  }

  const libraryIndex = player.library.findIndex((c) => c.id === cardId);
  if (libraryIndex !== -1) {
    const [removed] = player.library.splice(libraryIndex, 1);
    player.removed.push(removed);
    player.money -= REMOVE_COST;
  } else {
    const discardIndex = player.discard.findIndex((c) => c.id === cardId);
    if (discardIndex !== -1) {
      const [removed] = player.discard.splice(discardIndex, 1);
      player.removed.push(removed);
      player.money -= REMOVE_COST;
    }
  }

  newState.playerPhase = PlayerActionPhase.OPERATION;
  newState.phaseStartTime = Date.now();

  return newState;
}

/** 跳过备菜 */
export function skipRemove(state: GameState, playerIndex: number): GameState {
  const newState = deepClone(state);
  newState.playerPhase = PlayerActionPhase.OPERATION;
  newState.phaseStartTime = Date.now();
  return newState;
}

// ========================================
// 经营阶段
// ========================================

/** 翻牌（含自动洗牌） */
export function flipCards(
  library: MenuCard[],
  discard: MenuCard[],
  count: number,
): { flipped: MenuCard[]; newLibrary: MenuCard[]; newDiscard: MenuCard[] } {
  let currentLibrary = [...library];
  let currentDiscard = [...discard];
  const flipped: MenuCard[] = [];

  for (let i = 0; i < count; i++) {
    if (currentLibrary.length === 0) {
      if (currentDiscard.length === 0) {
        break;
      }
      currentLibrary = shuffle(currentDiscard);
      currentDiscard = [];
    }
    flipped.push(currentLibrary.shift()!);
  }

  return {
    flipped,
    newLibrary: currentLibrary,
    newDiscard: currentDiscard,
  };
}

/** 计算店铺匹配+联动 */
export function calculateShopBonus(
  player: Player,
  guest: GuestCard,
): { bonus: number; synergy: number } {
  let bonus = 0;
  let synergyTotal = 0;

  const builtShops = player.streetSlots.filter(
    (s): s is { state: 'built'; shopCard: ShopCard } => s.state === 'built',
  );

  const matchedShops = builtShops.filter((slot) =>
    guest.shopPreferences.some((pref) => pref.shopType === slot.shopCard.type),
  );

  for (const slot of matchedShops) {
    bonus += slot.shopCard.bonusIncome;

    for (const syn of slot.shopCard.synergy) {
      const hasPartner = builtShops.some(
        (s) => s.shopCard.type === syn.withShopType,
      );
      if (hasPartner) {
        synergyTotal += syn.bonus;
      }
    }
  }

  return { bonus, synergy: synergyTotal };
}

/** 经营：选客人 */
export function selectGuest(
  state: GameState,
  playerIndex: number,
  cardIndex: number,
): { state: GameState; result: TurnResult } {
  const newState = deepClone(state);
  const player = newState.players[playerIndex];
  const card = newState.publicArea.publicCards[cardIndex];

  if (!card) {
    return {
      state: newState,
      result: { dishIncome: 0, shopBonus: 0, synergyBonus: 0, flippedCards: [] },
    };
  }

  if (!isGuestCard(card)) {
    newState.publicArea.publicCards.splice(cardIndex, 1);
    if (newState.publicArea.guestEventDeck.length > 0) {
      newState.publicArea.publicCards.splice(cardIndex, 0, newState.publicArea.guestEventDeck.shift()!);
    }
    newState.playerPhase = PlayerActionPhase.DONE;
    newState.phaseStartTime = Date.now();
    return {
      state: newState,
      result: { dishIncome: 0, shopBonus: 0, synergyBonus: 0, flippedCards: [] },
    };
  }

  const guest: GuestCard = card;

  // 翻牌
  const flipResult = flipCards(player.library, player.discard, guest.dishCount);
  player.library = flipResult.newLibrary;
  player.discard = flipResult.newDiscard;

  // 计算菜品收入
  const dishIncome = flipResult.flipped.reduce((sum, c) => sum + c.income, 0);

  // 翻出的牌进入弃牌堆
  player.discard.push(...flipResult.flipped);

  // 计算店铺收入
  const { bonus: shopBonus, synergy: synergyBonus } = calculateShopBonus(player, guest);

  // 总收入
  player.money += dishIncome + shopBonus + synergyBonus;

  // 移除公共牌，补牌
  newState.publicArea.publicCards.splice(cardIndex, 1);
  if (newState.publicArea.guestEventDeck.length > 0) {
    newState.publicArea.publicCards.splice(cardIndex, 0, newState.publicArea.guestEventDeck.shift()!);
  }

  newState.playerPhase = PlayerActionPhase.DONE;
  newState.phaseStartTime = Date.now();

  return {
    state: newState,
    result: {
      dishIncome,
      shopBonus,
      synergyBonus,
      flippedCards: flipResult.flipped,
    },
  };
}

// ========================================
// 阶段推进
// ========================================

/** 推进到下一阶段/下一玩家/下一轮 */
export function advancePhase(state: GameState): GameState {
  const newState = deepClone(state);

  switch (newState.playerPhase) {
    case PlayerActionPhase.PURCHASE:
      newState.playerPhase = PlayerActionPhase.PREPARATION;
      newState.phaseStartTime = Date.now();
      break;

    case PlayerActionPhase.PREPARATION:
      newState.playerPhase = PlayerActionPhase.OPERATION;
      newState.phaseStartTime = Date.now();
      break;

    case PlayerActionPhase.OPERATION:
      newState.playerPhase = PlayerActionPhase.DONE;
      newState.phaseStartTime = Date.now();
      break;

    case PlayerActionPhase.DONE: {
      const nextPlayerIndex = newState.currentPlayerIndex + 1;
      if (nextPlayerIndex >= newState.players.length) {
        newState.roundPhase = RoundPhase.ROUND_END;

        const checkedState = checkVictory(newState);
        if (checkedState.isGameOver) {
          return checkedState;
        }

        return checkedState;
      } else {
        newState.currentPlayerIndex = nextPlayerIndex;
        newState.playerPhase = PlayerActionPhase.PURCHASE;
        newState.phaseStartTime = Date.now();
      }
      break;
    }
  }

  return newState;
}

// ========================================
// 胜利检查
// ========================================

/** 检查胜利条件 */
export function checkVictory(state: GameState): GameState {
  const newState = deepClone(state);

  for (const player of newState.players) {
    const builtCount = player.streetSlots.filter((s) => s.state === 'built').length;
    if (builtCount >= VICTORY_SHOPS && player.money >= VICTORY_MONEY) {
      if (!newState.triggeringPlayerId) {
        newState.triggeringPlayerId = player.id;
      }
    }
  }

  if (newState.triggeringPlayerId && newState.roundPhase === RoundPhase.ROUND_END) {
    const qualified = newState.players.filter((p) => {
      const builtCount = p.streetSlots.filter((s) => s.state === 'built').length;
      return builtCount >= VICTORY_SHOPS && p.money >= VICTORY_MONEY;
    });

    if (qualified.length > 0) {
      qualified.sort((a, b) => b.money - a.money);
      newState.winnerId = qualified[0].id;
      newState.isGameOver = true;
      newState.roundPhase = RoundPhase.GAME_OVER;
    }
  }

  return newState;
}

// ========================================
// 信息脱敏
// ========================================

/** 生成脱敏后的公开游戏状态 */
export function getPublicState(state: GameState, forPlayerId?: string): PublicGameState {
  return {
    roomId: state.roomId,
    roundNumber: state.roundNumber,
    roundPhase: state.roundPhase,
    currentPlayerIndex: state.currentPlayerIndex,
    playerPhase: state.playerPhase,

    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      money: player.money,
      libraryCount: player.library.length,
      discard: player.discard,
      removed: player.removed,
      streetSlots: player.streetSlots,
    })),

    publicArea: state.publicArea,

    phaseStartTime: state.phaseStartTime,
    phaseTimeLimit: state.phaseTimeLimit,

    winnerId: state.winnerId,
    isGameOver: state.isGameOver,
    triggeringPlayerId: state.triggeringPlayerId,
  };
}

// ========================================
// 内部工具
// ========================================

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
