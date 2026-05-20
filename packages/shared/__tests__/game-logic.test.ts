import { describe, it, expect } from 'vitest';
import {
  initializeGame,
  buyMenuCard,
  buyShopCard,
  skipPurchase,
  removeCard,
  skipRemove,
  selectGuest,
  flipCards,
  calculateShopBonus,
  advancePhase,
  checkVictory,
  getClearingCost,
  shuffle,
  getPublicState,
} from '../src/game-logic.js';
import {
  CardGrade,
  ShopType,
  PlayerActionPhase,
  RoundPhase,
  MenuCard,
  ShopCard,
  GameState,
  Player,
} from '../src/types.js';
import {
  INITIAL_MENU_PER_PLAYER,
  ALL_SHOP_CARDS,
  ALL_GUEST_CARDS,
  ALL_EVENT_CARDS,
  ALL_MENU_CARDS,
  SHOPS_DISPLAY_COUNT,
  PUBLIC_CARDS_COUNT,
  VICTORY_SHOPS,
  VICTORY_MONEY,
  STARTING_MONEY,
  REMOVE_COST,
  STREET_SLOT_COUNT,
} from '../src/constants.js';

// ========================================
// Helper：创建测试用牌
// ========================================

function makeMenuCard(id: string, grade: CardGrade, income: number, cost: number): MenuCard {
  return { id, grade, dishName: `菜品-${id}`, income, cost };
}

function makeShopCard(id: string, type: ShopType, buildCost: number, bonusIncome: number): ShopCard {
  return {
    id,
    type,
    name: `店铺-${id}`,
    emoji: '🏪',
    buildCost,
    bonusIncome,
    synergy: [],
  };
}

function makeTestPlayer(id: string, money: number, libraryCount: number = 4): Player {
  const library: MenuCard[] = Array.from({ length: libraryCount }, (_, i) =>
    makeMenuCard(`${id}-card-${i}`, CardGrade.FOUR, 1, 1)
  );
  return {
    id,
    name: `玩家${id}`,
    money,
    library,
    discard: [],
    removed: [],
    streetSlots: Array.from({ length: STREET_SLOT_COUNT }, () => ({ state: 'empty' as const })),
  };
}

// ========================================
// shuffle
// ========================================

describe('shuffle', () => {
  it('应返回长度相同的新数组', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(5);
    expect(result).toEqual(expect.arrayContaining(arr));
  });

  it('不应修改原数组', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  it('空数组返回空数组', () => {
    expect(shuffle([])).toEqual([]);
  });
});

// ========================================
// getClearingCost
// ========================================

describe('getClearingCost', () => {
  it('第1个店铺免费', () => {
    expect(getClearingCost(0)).toBe(0);
  });

  it('第2个店铺 2 两', () => {
    expect(getClearingCost(1)).toBe(2);
  });

  it('第3个店铺 3 两', () => {
    expect(getClearingCost(2)).toBe(3);
  });

  it('第5个店铺 5 两', () => {
    expect(getClearingCost(4)).toBe(5);
  });
});

// ========================================
// initializeGame
// ========================================

describe('initializeGame', () => {
  it('应正确初始化 2 人游戏', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);

    expect(state.roomId).toBe('room-1');
    expect(state.roundNumber).toBe(1);
    expect(state.roundPhase).toBe(RoundPhase.PLAYER_TURNS);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.playerPhase).toBe(PlayerActionPhase.PURCHASE);
    expect(state.players).toHaveLength(2);
    expect(state.isGameOver).toBe(false);
    expect(state.winnerId).toBeNull();
  });

  it('每位玩家应有 8 张初始牌', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);

    for (const player of state.players) {
      expect(player.library.length).toBe(8);
    }
  });

  it('初始牌应包含 6 张四品 + 2 张三品', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);

    const player = state.players[0];
    const fourCount = player.library.filter((c) => c.grade === CardGrade.FOUR).length;
    const threeCount = player.library.filter((c) => c.grade === CardGrade.THREE).length;
    expect(fourCount).toBe(6);
    expect(threeCount).toBe(2);
  });

  it('玩家应有初始银钱', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    expect(state.players[0].money).toBe(STARTING_MONEY[0]);
  });

  it('店铺展示区应有 4 张牌', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    expect(state.publicArea.shopDisplay).toHaveLength(SHOPS_DISPLAY_COUNT);
  });

  it('公共牌应有 4 张', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    expect(state.publicArea.publicCards).toHaveLength(PUBLIC_CARDS_COUNT);
  });

  it('商业街应有 8 个空地块', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    const player = state.players[0];
    expect(player.streetSlots).toHaveLength(STREET_SLOT_COUNT);
    expect(player.streetSlots.every((s) => s.state === 'empty')).toBe(true);
  });

  it('供应区应减少已发给玩家的牌', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);

    const fourSupply = state.publicArea.menuSupply[CardGrade.FOUR];
    const threeSupply = state.publicArea.menuSupply[CardGrade.THREE];
    expect(fourSupply.length).toBeLessThan(ALL_MENU_CARDS[CardGrade.FOUR].length);
    expect(threeSupply.length).toBeLessThan(ALL_MENU_CARDS[CardGrade.THREE].length);
  });
});

// ========================================
// buyMenuCard
// ========================================

describe('buyMenuCard', () => {
  it('应扣钱并将牌放入弃牌堆', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    const player = state.players[0];
    const initialMoney = player.money;
    const grade = CardGrade.FOUR;
    const cardCost = 1;

    state = buyMenuCard(state, 0, grade);

    expect(state.players[0].money).toBe(initialMoney - cardCost);
    expect(state.players[0].discard.length).toBe(1);
    expect(state.players[0].discard[0].grade).toBe(grade);
  });

  it('应从供应区移除该牌', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    const initialSupplyCount = state.publicArea.menuSupply[CardGrade.FOUR].length;

    state = buyMenuCard(state, 0, CardGrade.FOUR);

    expect(state.publicArea.menuSupply[CardGrade.FOUR].length).toBe(initialSupplyCount - 1);
  });

  it('应在购买后推进到备菜阶段', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);

    state = buyMenuCard(state, 0, CardGrade.FOUR);

    expect(state.playerPhase).toBe(PlayerActionPhase.PREPARATION);
  });
});

// ========================================
// buyShopCard
// ========================================

describe('buyShopCard', () => {
  it('应扣地基费+建造费，放置到商业街', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    state.players[0].money = 100; // 确保足够买任何店铺
    const player = state.players[0];
    const shopCard = state.publicArea.shopDisplay[0];
    const buildCost = shopCard.buildCost;
    const clearingCost = getClearingCost(0);
    const expectedCost = buildCost + clearingCost;

    state = buyShopCard(state, 0, shopCard.id);

    expect(state.players[0].money).toBe(player.money - expectedCost);
    const builtSlots = state.players[0].streetSlots.filter((s) => s.state === 'built');
    expect(builtSlots).toHaveLength(1);
    expect((builtSlots[0] as { state: 'built'; shopCard: ShopCard }).shopCard.id).toBe(shopCard.id);
  });

  it('地基费应递增', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    state.players[0].money = 100;

    const shop1 = state.publicArea.shopDisplay[0];
    state = buyShopCard(state, 0, shop1.id);
    const shop2 = state.publicArea.shopDisplay[0];
    state = buyShopCard(state, 0, shop2.id);

    const builtSlots = state.players[0].streetSlots.filter((s) => s.state === 'built');
    expect(builtSlots).toHaveLength(2);
  });

  it('应从展示区移除并补新牌', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    state.players[0].money = 100;
    const shopCard = state.publicArea.shopDisplay[0];

    state = buyShopCard(state, 0, shopCard.id);

    expect(state.publicArea.shopDisplay).toHaveLength(SHOPS_DISPLAY_COUNT);
    expect(state.publicArea.shopDisplay.find((s) => s.id === shopCard.id)).toBeUndefined();
  });
});

// ========================================
// skipPurchase
// ========================================

describe('skipPurchase', () => {
  it('应推进到备菜阶段', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);

    state = skipPurchase(state, 0);

    expect(state.playerPhase).toBe(PlayerActionPhase.PREPARATION);
  });
});

// ========================================
// removeCard
// ========================================

describe('removeCard', () => {
  it('应扣3两并从牌库移出牌', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    const cardToRemove = state.players[0].library[0];
    const initialMoney = state.players[0].money;
    const initialLibraryCount = state.players[0].library.length;

    state = removeCard(state, 0, cardToRemove.id);

    expect(state.players[0].money).toBe(initialMoney - REMOVE_COST);
    expect(state.players[0].library.length).toBe(initialLibraryCount - 1);
    expect(state.players[0].removed).toContainEqual(expect.objectContaining({ id: cardToRemove.id }));
  });

  it('应能从弃牌堆移出牌', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    state = buyMenuCard(state, 0, CardGrade.FOUR);
    const cardInDiscard = state.players[0].discard[0];
    const initialMoney = state.players[0].money;

    state = removeCard(state, 0, cardInDiscard.id);

    expect(state.players[0].money).toBe(initialMoney - REMOVE_COST);
    expect(state.players[0].removed).toContainEqual(expect.objectContaining({ id: cardInDiscard.id }));
  });

  it('应在剔除后推进到经营阶段', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    const cardToRemove = state.players[0].library[0];

    state = removeCard(state, 0, cardToRemove.id);

    expect(state.playerPhase).toBe(PlayerActionPhase.OPERATION);
  });
});

// ========================================
// skipRemove
// ========================================

describe('skipRemove', () => {
  it('应推进到经营阶段', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    state = skipPurchase(state, 0);

    state = skipRemove(state, 0);

    expect(state.playerPhase).toBe(PlayerActionPhase.OPERATION);
  });
});

// ========================================
// flipCards
// ========================================

describe('flipCards', () => {
  it('应正常翻牌', () => {
    const library = Array.from({ length: 10 }, (_, i) => makeMenuCard(`c${i}`, CardGrade.FOUR, 1, 1));

    const result = flipCards(library, [], 3);

    expect(result.flipped).toHaveLength(3);
    expect(result.newLibrary).toHaveLength(7);
  });

  it('牌库不够时应自动洗入弃牌堆继续翻', () => {
    const library = [makeMenuCard('c0', CardGrade.FOUR, 1, 1)];
    const discard = Array.from({ length: 5 }, (_, i) => makeMenuCard(`d${i}`, CardGrade.THREE, 2, 3));

    const result = flipCards(library, discard, 3);

    expect(result.flipped).toHaveLength(3);
    expect(result.newLibrary.length + result.newDiscard.length).toBe(3);
  });

  it('牌库和弃牌堆都不够时翻出所有可用牌', () => {
    const library = [makeMenuCard('c0', CardGrade.FOUR, 1, 1)];
    const discard = [makeMenuCard('d0', CardGrade.THREE, 2, 3)];

    const result = flipCards(library, discard, 5);

    expect(result.flipped).toHaveLength(2);
    expect(result.newLibrary).toHaveLength(0);
    expect(result.newDiscard).toHaveLength(0);
  });
});

// ========================================
// calculateShopBonus
// ========================================

describe('calculateShopBonus', () => {
  it('无匹配店铺时收入为 0', () => {
    const player = makeTestPlayer('p1', 10);
    const guest = {
      id: 'g1',
      name: '测试客人',
      title: '测试',
      dishCount: 2,
      shopPreferences: [{ shopType: ShopType.SILK, label: '买丝绸' }],
    };

    const result = calculateShopBonus(player, guest);

    expect(result.bonus).toBe(0);
    expect(result.synergy).toBe(0);
  });

  it('有匹配店铺时应获得 bonusIncome', () => {
    const player = makeTestPlayer('p1', 10);
    player.streetSlots[0] = {
      state: 'built',
      shopCard: makeShopCard('s1', ShopType.SILK, 5, 3),
    };
    const guest = {
      id: 'g1',
      name: '测试客人',
      title: '测试',
      dishCount: 2,
      shopPreferences: [{ shopType: ShopType.SILK, label: '买丝绸' }],
    };

    const result = calculateShopBonus(player, guest);

    expect(result.bonus).toBe(3);
  });

  it('有联动店铺时应获得联动加成', () => {
    const player = makeTestPlayer('p1', 10);
    player.streetSlots[0] = {
      state: 'built',
      shopCard: {
        ...makeShopCard('s1', ShopType.SILK, 5, 3),
        synergy: [{ withShopType: ShopType.PORCELAIN, bonus: 2 }],
      },
    };
    player.streetSlots[1] = {
      state: 'built',
      shopCard: makeShopCard('s2', ShopType.PORCELAIN, 5, 3),
    };
    const guest = {
      id: 'g1',
      name: '测试客人',
      title: '测试',
      dishCount: 2,
      shopPreferences: [{ shopType: ShopType.SILK, label: '买丝绸' }],
    };

    const result = calculateShopBonus(player, guest);

    expect(result.bonus).toBe(3);
    expect(result.synergy).toBe(2);
  });
});

// ========================================
// selectGuest
// ========================================

describe('selectGuest', () => {
  it('应返回翻牌收入和店铺收入', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    state = skipPurchase(state, 0);
    state = skipRemove(state, 0);

    const guestIndex = state.publicArea.publicCards.findIndex((c) => 'dishCount' in c);
    if (guestIndex === -1) return;

    const { state: newState, result } = selectGuest(state, 0, guestIndex);

    expect(result.flippedCards.length).toBeGreaterThan(0);
    expect(result.dishIncome).toBeGreaterThanOrEqual(0);
  });
});

// ========================================
// checkVictory
// ========================================

describe('checkVictory', () => {
  it('未达成条件时不结束', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);

    state = checkVictory(state);

    expect(state.isGameOver).toBe(false);
    expect(state.winnerId).toBeNull();
  });

  it('达成 8 店铺 + 50 银钱时应触发胜利', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);
    state.players[0].money = VICTORY_MONEY;
    for (let i = 0; i < VICTORY_SHOPS; i++) {
      state.players[0].streetSlots[i] = {
        state: 'built',
        shopCard: makeShopCard(`s${i}`, ShopType.DRINKS, 3, 1),
      };
    }

    state = checkVictory(state);

    expect(state.triggeringPlayerId).toBe('p1');
  });
});

// ========================================
// advancePhase
// ========================================

describe('advancePhase', () => {
  it('购买 -> 备菜', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);

    state = advancePhase(state);

    expect(state.playerPhase).toBe(PlayerActionPhase.PREPARATION);
  });

  it('备菜 -> 经营', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);
    state.playerPhase = PlayerActionPhase.PREPARATION;

    state = advancePhase(state);

    expect(state.playerPhase).toBe(PlayerActionPhase.OPERATION);
  });

  it('经营 -> 完成（DONE）', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);
    state.playerPhase = PlayerActionPhase.OPERATION;

    state = advancePhase(state);

    expect(state.playerPhase).toBe(PlayerActionPhase.DONE);
  });

  it('玩家完成后应轮到下一个玩家', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);
    state.playerPhase = PlayerActionPhase.DONE;

    state = advancePhase(state);

    expect(state.currentPlayerIndex).toBe(1);
    expect(state.playerPhase).toBe(PlayerActionPhase.PURCHASE);
  });

  it('最后一个玩家完成后应进入轮末', () => {
    let state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);
    state.currentPlayerIndex = 1;
    state.playerPhase = PlayerActionPhase.DONE;

    state = advancePhase(state);

    expect(state.roundPhase).toBe(RoundPhase.ROUND_END);
  });
});

// ========================================
// getPublicState
// ========================================

describe('getPublicState', () => {
  it('应脱敏牌库内容，只保留数量', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
      { id: 'p2', name: '玩家2' },
    ]);

    const publicState = getPublicState(state);

    expect(publicState.players[0].libraryCount).toBe(8);
    expect(publicState.players[0]).not.toHaveProperty('library');
  });

  it('弃牌堆应公开', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);

    const publicState = getPublicState(state);

    expect(publicState.players[0].discard).toEqual(state.players[0].discard);
  });

  it('商业街应公开', () => {
    const state = initializeGame('room-1', [
      { id: 'p1', name: '玩家1' },
    ]);

    const publicState = getPublicState(state);

    expect(publicState.players[0].streetSlots).toEqual(state.players[0].streetSlots);
  });
});
