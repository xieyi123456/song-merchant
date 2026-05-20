import {
  CardGrade,
  ShopType,
  PlayerActionPhase,
  RoundPhase,
  MenuCard,
  ShopCard,
  GuestCard,
  PublicCard,
  EventCard,
  GameState,
  ActiveEffect,
  Player,
  PublicArea,
  PublicGameState,
  PublicPlayer,
  StreetSlot,
  TurnResult,
  isGuestCard,
  ShopSkillType,
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
  SKIP_GUEST_FEE,
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
  const players: Player[] = playerInfos.map((info, index) => {
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
      money: STARTING_MONEY[index] ?? STARTING_MONEY[STARTING_MONEY.length - 1],
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
    activeEffects: [],
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

/** 投掷骰子（1-6） */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** 检查客人是否匹配所有店铺（皇帝） */
function isAllShopsGuest(guest: GuestCard): boolean {
  return (guest as any).allShops === true;
}

/** 计算店铺匹配+联动+技能 */
export function calculateShopBonus(
  player: Player,
  guest: GuestCard,
  shopIncomeReduction: number = 0,
  autoMaxDice: boolean = false,
): { bonus: number; synergy: number; skillIncome: number; skillDetail: string } {
  let bonus = 0;
  let synergyTotal = 0;
  let skillIncome = 0;
  const skillDetails: string[] = [];

  const builtShops = player.streetSlots.filter(
    (s): s is { state: 'built'; shopCard: ShopCard } => s.state === 'built',
  );

  const allShops = isAllShopsGuest(guest);

  const matchedShops = allShops
    ? builtShops
    : builtShops.filter((slot) =>
        guest.shopPreferences.some((pref) => pref.shopType === slot.shopCard.type),
      );

  for (const slot of matchedShops) {
    const shop = slot.shopCard;
    // 基础收入，受门可罗雀影响（最低为0）
    const reducedIncome = Math.max(0, shop.bonusIncome - shopIncomeReduction);
    bonus += reducedIncome;

    for (const syn of shop.synergy) {
      const hasPartner = builtShops.some(
        (s) => s.shopCard.type === syn.withShopType,
      );
      if (hasPartner) {
        synergyTotal += syn.bonus;
      }
    }

    // 技能结算（只有匹配到的店铺才触发技能）
    if (shop.skill) {
      const diceValue = autoMaxDice ? 6 : rollDice();
      switch (shop.skill.type) {
        case 'dice_check': {
          if (diceValue >= (shop.skill.diceThreshold ?? 4)) {
            const gain = shop.skill.diceBonus ?? 3;
            skillIncome += gain;
            skillDetails.push(`${shop.name}【${shop.skill.name}】掷${diceValue}≥${shop.skill.diceThreshold}，+${gain}两`);
          } else {
            skillDetails.push(`${shop.name}【${shop.skill.name}】掷${diceValue}<${shop.skill.diceThreshold}，未触发`);
          }
          break;
        }
        case 'dice_income': {
          skillIncome += diceValue;
          skillDetails.push(`${shop.name}【${shop.skill.name}】掷${diceValue}，+${diceValue}两`);
          break;
        }
        case 'per_shop_income': {
          const perShop = shop.skill.bonusPerShop ?? 1;
          const totalPerShop = builtShops.length * perShop;
          skillIncome += totalPerShop;
          skillDetails.push(`${shop.name}【${shop.skill.name}】${builtShops.length}家店×${perShop}两，+${totalPerShop}两`);
          break;
        }
      }
    }
  }

  return { bonus, synergy: synergyTotal, skillIncome, skillDetail: skillDetails.join('；') };
}

/** 经营：选客人/事件 */
export function selectGuest(
  state: GameState,
  playerIndex: number,
  cardIndex: number,
): { state: GameState; result: TurnResult; eventCard?: EventCard } {
  const newState = deepClone(state);
  const player = newState.players[playerIndex];
  const card = newState.publicArea.publicCards[cardIndex];

  if (!card) {
    return {
      state: newState,
      result: { dishIncome: 0, shopBonus: 0, synergyBonus: 0, flippedCards: [] },
    };
  }

  // 事件牌处理
  if (!isGuestCard(card)) {
    const eventCard = card as EventCard;
    applyEventEffect(newState, eventCard, playerIndex);
    newState.publicArea.publicCards.splice(cardIndex, 1);
    if (newState.publicArea.guestEventDeck.length > 0) {
      newState.publicArea.publicCards.splice(cardIndex, 0, newState.publicArea.guestEventDeck.shift()!);
    }
    newState.playerPhase = PlayerActionPhase.DONE;
    newState.phaseStartTime = Date.now();
    return {
      state: newState,
      result: { dishIncome: 0, shopBonus: 0, synergyBonus: 0, flippedCards: [] },
      eventCard,
    };
  }

  const guest: GuestCard = card;

  // 休养生息事件：跳过经营，获得免费菜牌
  const skipEffect = newState.activeEffects.find(
    (ef) => ef.effect.type === 'skip_and_free_card',
  );
  if (skipEffect) {
    // 给一张随机菜牌
    const allGrades = [CardGrade.ONE, CardGrade.TWO, CardGrade.THREE, CardGrade.FOUR];
    const randomGrade = allGrades[Math.floor(Math.random() * allGrades.length)];
    const supply = newState.publicArea.menuSupply[randomGrade];
    if (supply && supply.length > 0) {
      const freeCard = supply.shift()!;
      player.discard.push(freeCard);
    }
    // 移除效果
    newState.activeEffects = newState.activeEffects.filter(
      (ef) => ef.effect.type !== 'skip_and_free_card',
    );
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

  // 计算翻牌数（考虑 draw_extra 效果）
  let drawCount = guest.dishCount;
  for (const ef of newState.activeEffects) {
    if (ef.effect.type === 'draw_extra') {
      drawCount = Math.max(1, drawCount + ef.effect.value);
    }
  }

  // 翻牌
  const flipResult = flipCards(player.library, player.discard, drawCount);

  // 支付跳过费（选第 N 个客人需付 N 两）
  const skipFee = cardIndex * SKIP_GUEST_FEE;
  if (skipFee > 0) {
    player.money -= skipFee;
  }
  player.library = flipResult.newLibrary;
  player.discard = flipResult.newDiscard;

  // 计算菜品收入
  let dishIncome = flipResult.flipped.reduce((sum, c) => sum + c.income, 0);

  // 应用菜品收入加成（无尖不商）
  for (const ef of newState.activeEffects) {
    if (ef.effect.type === 'dish_income_boost') {
      dishIncome += flipResult.flipped.length * ef.effect.value;
    }
  }

  // 应用收入修正效果
  for (const ef of newState.activeEffects) {
    if (ef.effect.type === 'income_modifier') {
      const scopeTargets = getEffectTargets(newState, ef.effect.scope, playerIndex);
      if (scopeTargets.includes(playerIndex)) {
        if (ef.effect.value < 0 && ef.effect.value > -1) {
          dishIncome = Math.floor(dishIncome * (1 + ef.effect.value));
        } else {
          dishIncome += ef.effect.value;
        }
      }
    }
  }

  // 翻出的牌进入弃牌堆
  player.discard.push(...flipResult.flipped);

  // 检查是否有门可罗雀效果（店铺基础收入减少）
  let shopIncomeReduction = 0;
  for (const ef of newState.activeEffects) {
    if (ef.effect.type === 'shop_income_reduce') {
      shopIncomeReduction += ef.effect.value;
    }
  }

  // 检查是否有高朋满座效果（骰子视为最大值）
  const autoMaxDice = newState.activeEffects.some(
    (ef) => ef.effect.type === 'auto_max_dice',
  );

  // 计算店铺收入（含技能）
  const { bonus: shopBonus, synergy: synergyBonus, skillIncome, skillDetail } = calculateShopBonus(
    player, guest, shopIncomeReduction, autoMaxDice,
  );

  // 总收入
  const totalIncome = dishIncome + shopBonus + synergyBonus + skillIncome;
  player.money += totalIncome;

  // 苛捐杂税：回合结束时每店铺缴纳1两
  for (const ef of newState.activeEffects) {
    if (ef.effect.type === 'tax_per_shop') {
      const builtCount = player.streetSlots.filter((s) => s.state === 'built').length;
      const tax = builtCount * ef.effect.value;
      player.money = Math.max(0, player.money - tax);
    }
  }

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
      gamblingModifier: skillIncome,
    },
  };
}

/** 应用事件牌效果 */
function applyEventEffect(state: GameState, eventCard: EventCard, triggeredByPlayerIndex: number): void {
  const { effect } = eventCard;
  const targets = getEffectTargets(state, effect.scope, triggeredByPlayerIndex);
  const isPersistent = effect.duration === 'persistent';

  switch (effect.type) {
    case 'give_money': {
      // 硕果累累：直接给钱
      for (const idx of targets) {
        state.players[idx].money += effect.value;
      }
      break;
    }
    case 'dice_money': {
      // 天降横财：投掷骰子得钱
      const diceValue = rollDice();
      state.players[triggeredByPlayerIndex].money += diceValue;
      break;
    }
    case 'swap_cards': {
      // 辞旧迎新：弃掉后厨菜品，从供应区抽取等量新牌
      for (const idx of targets) {
        const player = state.players[idx];
        const discardCount = player.discard.length;
        // 将弃牌堆的牌全部移除
        player.discard = [];
        // 从供应区抽取等量的新牌（从各品级均匀抽取）
        let remaining = discardCount;
        const grades = [CardGrade.FOUR, CardGrade.THREE, CardGrade.TWO, CardGrade.ONE];
        while (remaining > 0) {
          let drew = false;
          for (const grade of grades) {
            if (remaining <= 0) break;
            const supply = state.publicArea.menuSupply[grade];
            if (supply && supply.length > 0) {
              player.discard.push(supply.shift()!);
              remaining--;
              drew = true;
            }
          }
          if (!drew) break; // 供应区没牌了
        }
      }
      break;
    }
    case 'skip_and_free_card': {
      // 休养生息：存入 activeEffects，在选客人时处理
      state.activeEffects.push({
        eventCardId: eventCard.id,
        eventName: eventCard.name,
        effect: { ...effect },
        triggeredByPlayerId: state.players[triggeredByPlayerIndex].id,
        remainingRounds: 1,
      });
      break;
    }
    case 'auto_max_dice': {
      // 高朋满座：本回合骰子视为6
      state.activeEffects.push({
        eventCardId: eventCard.id,
        eventName: eventCard.name,
        effect: { ...effect },
        triggeredByPlayerId: state.players[triggeredByPlayerIndex].id,
        remainingRounds: 1,
      });
      break;
    }
    case 'shop_income_reduce':
    case 'tax_per_shop':
    case 'dish_income_boost': {
      // 持续效果：替换同类型的旧持续效果，存入 activeEffects
      if (isPersistent) {
        // 替换同类型的持续效果
        state.activeEffects = state.activeEffects.filter(
          (ef) => ef.effect.type !== effect.type,
        );
      }
      state.activeEffects.push({
        eventCardId: eventCard.id,
        eventName: eventCard.name,
        effect: { ...effect },
        triggeredByPlayerId: state.players[triggeredByPlayerIndex].id,
        remainingRounds: isPersistent ? 99 : 1,
      });
      break;
    }
    case 'income_modifier': {
      state.activeEffects.push({
        eventCardId: eventCard.id,
        eventName: eventCard.name,
        effect: { ...effect },
        triggeredByPlayerId: state.players[triggeredByPlayerIndex].id,
        remainingRounds: isPersistent ? 99 : 1,
      });
      if (effect.value > 0 && effect.value >= 1) {
        for (const idx of targets) {
          state.players[idx].money += effect.value;
        }
      } else if (effect.value < -1) {
        for (const idx of targets) {
          state.players[idx].money = Math.max(0, state.players[idx].money + effect.value);
        }
      }
      break;
    }
    case 'draw_extra': {
      state.activeEffects.push({
        eventCardId: eventCard.id,
        eventName: eventCard.name,
        effect: { ...effect },
        triggeredByPlayerId: state.players[triggeredByPlayerIndex].id,
        remainingRounds: isPersistent ? 99 : 1,
      });
      break;
    }
    case 'discount': {
      state.activeEffects.push({
        eventCardId: eventCard.id,
        eventName: eventCard.name,
        effect: { ...effect },
        triggeredByPlayerId: state.players[triggeredByPlayerIndex].id,
        remainingRounds: isPersistent ? 99 : 1,
      });
      break;
    }
    case 'skip_turn': {
      state.activeEffects.push({
        eventCardId: eventCard.id,
        eventName: eventCard.name,
        effect: { ...effect },
        triggeredByPlayerId: state.players[triggeredByPlayerIndex].id,
        remainingRounds: 1,
      });
      break;
    }
  }
}

/** 根据作用域获取目标玩家索引 */
function getEffectTargets(state: GameState, scope: string, currentPlayerIndex: number): number[] {
  switch (scope) {
    case 'self':
      return [currentPlayerIndex];
    case 'all':
      return state.players.map((_, i) => i);
    case 'next_player':
      return [(currentPlayerIndex + 1) % state.players.length];
    default:
      return [currentPlayerIndex];
  }
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
        // 轮末：清理过期效果
        newState.activeEffects = newState.activeEffects
          .map((ef) => ({ ...ef, remainingRounds: ef.remainingRounds - 1 }))
          .filter((ef) => ef.remainingRounds > 0);

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

        // 检查是否被跳过回合
        const skipEffect = newState.activeEffects.find(
          (ef) => ef.effect.type === 'skip_turn' &&
            getEffectTargets(newState, ef.effect.scope, newState.players.findIndex(
              (p) => p.id === ef.triggeredByPlayerId
            )).includes(nextPlayerIndex)
        );
        if (skipEffect) {
          // 跳过该玩家，直接进入 DONE
          newState.playerPhase = PlayerActionPhase.DONE;
          // 移除这个效果
          newState.activeEffects = newState.activeEffects.filter(
            (ef) => ef.eventCardId !== skipEffect.eventCardId
          );
        }
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

    activeEffects: state.activeEffects,
  };
}

// ========================================
// 内部工具
// ========================================

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
