import { describe, it, expect } from 'vitest';
import { validateAction } from '../src/validation.js';
import {
  CardGrade,
  ShopType,
  PlayerActionPhase,
  RoundPhase,
  MenuCard,
  ShopCard,
  GuestCard,
  GameState,
  Player,
  PublicArea,
  StreetSlot,
} from '../src/types.js';
import {
  STARTING_MONEY,
  REMOVE_COST,
  STREET_SLOT_COUNT,
} from '../src/constants.js';
import { initializeGame } from '../src/game-logic.js';

// ========================================
// Helper
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

function makeTestState(overrides?: Partial<GameState>): GameState {
  const state = initializeGame('test-room', [
    { id: 'p1', name: '玩家1' },
    { id: 'p2', name: '玩家2' },
  ]);
  return { ...state, ...overrides };
}

// ========================================
// validateAction
// ========================================

describe('validateAction', () => {
  // ------------------------------------
  // 轮次检查
  // ------------------------------------
  it('不是当前玩家时应拒绝操作', () => {
    const state = makeTestState();

    const result = validateAction(state, 1, { type: 'BUY_MENU', grade: CardGrade.FOUR });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('不是你的回合');
  });

  it('游戏已结束时应拒绝操作', () => {
    const state = makeTestState({ isGameOver: true });

    const result = validateAction(state, 0, { type: 'BUY_MENU', grade: CardGrade.FOUR });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('游戏已结束');
  });

  // ------------------------------------
  // 购买阶段 - 买菜单牌
  // ------------------------------------
  describe('BUY_MENU', () => {
    it('购买阶段应允许买菜单牌', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });

      const result = validateAction(state, 0, { type: 'BUY_MENU', grade: CardGrade.FOUR });

      expect(result.valid).toBe(true);
    });

    it('非购买阶段应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PREPARATION,
      });

      const result = validateAction(state, 0, { type: 'BUY_MENU', grade: CardGrade.FOUR });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('阶段');
    });

    it('银钱不足时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });
      state.players[0].money = 0;

      const result = validateAction(state, 0, { type: 'BUY_MENU', grade: CardGrade.FOUR });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('银钱不足');
    });

    it('供应区无该品级牌时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });
      state.publicArea.menuSupply[CardGrade.ONE] = [];

      const result = validateAction(state, 0, { type: 'BUY_MENU', grade: CardGrade.ONE });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('供应区没有');
    });
  });

  // ------------------------------------
  // 购买阶段 - 买店铺牌
  // ------------------------------------
  describe('BUY_SHOP', () => {
    it('购买阶段应允许买店铺牌', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });
      // 确保玩家有足够的钱
      state.players[0].money = 100;
      const shopCardId = state.publicArea.shopDisplay[0].id;

      const result = validateAction(state, 0, { type: 'BUY_SHOP', shopCardId });

      expect(result.valid).toBe(true);
    });

    it('店铺不存在时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });

      const result = validateAction(state, 0, { type: 'BUY_SHOP', shopCardId: 'nonexistent' });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('店铺不存在');
    });

    it('银钱不足（含地基费）时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });
      state.players[0].money = 0;

      const shopCardId = state.publicArea.shopDisplay[0].id;

      const result = validateAction(state, 0, { type: 'BUY_SHOP', shopCardId });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('银钱不足');
    });

    it('商业街已满时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });
      state.players[0].money = 100;
      state.players[0].streetSlots = state.players[0].streetSlots.map(() => ({
        state: 'built' as const,
        shopCard: makeShopCard('s-fill', ShopType.DRINKS, 3, 1),
      }));

      const shopCardId = state.publicArea.shopDisplay[0].id;

      const result = validateAction(state, 0, { type: 'BUY_SHOP', shopCardId });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('商业街已满');
    });
  });

  // ------------------------------------
  // 跳过购买
  // ------------------------------------
  describe('SKIP_PURCHASE', () => {
    it('购买阶段应允许跳过', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });

      const result = validateAction(state, 0, { type: 'SKIP_PURCHASE' });

      expect(result.valid).toBe(true);
    });

    it('非购买阶段应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PREPARATION,
      });

      const result = validateAction(state, 0, { type: 'SKIP_PURCHASE' });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('阶段');
    });
  });

  // ------------------------------------
  // 备菜阶段 - 剔除牌
  // ------------------------------------
  describe('REMOVE_CARD', () => {
    it('备菜阶段应允许剔除存在的牌', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PREPARATION,
      });
      // 给玩家额外牌，使其能剔除
      state.players[0].library.push(makeMenuCard('extra-1', CardGrade.FOUR, 1, 1));
      const cardId = state.players[0].library[0].id;

      const result = validateAction(state, 0, { type: 'REMOVE_CARD', cardId });

      expect(result.valid).toBe(true);
    });

    it('银钱不足 3 两时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PREPARATION,
      });
      state.players[0].money = 2;
      const cardId = state.players[0].library[0].id;

      const result = validateAction(state, 0, { type: 'REMOVE_CARD', cardId });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('银钱不足');
    });

    it('牌不存在时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PREPARATION,
      });
      // 给玩家额外牌，避免数量限制
      state.players[0].library.push(makeMenuCard('extra-2', CardGrade.FOUR, 1, 1));

      const result = validateAction(state, 0, { type: 'REMOVE_CARD', cardId: 'nonexistent' });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('牌不存在');
    });

    it('非备菜阶段应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });

      const result = validateAction(state, 0, { type: 'REMOVE_CARD', cardId: 'any' });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('阶段');
    });
  });

  // ------------------------------------
  // 跳过备菜
  // ------------------------------------
  describe('SKIP_REMOVE', () => {
    it('备菜阶段应允许跳过', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PREPARATION,
      });

      const result = validateAction(state, 0, { type: 'SKIP_REMOVE' });

      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------
  // 经营阶段 - 选客人
  // ------------------------------------
  describe('SELECT_GUEST', () => {
    it('经营阶段应允许选客人', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.OPERATION,
      });
      const guestIndex = state.publicArea.publicCards.findIndex((c) => 'dishCount' in c);
      if (guestIndex === -1) return;

      const result = validateAction(state, 0, { type: 'SELECT_GUEST', cardIndex: guestIndex });

      expect(result.valid).toBe(true);
    });

    it('牌索引越界时应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.OPERATION,
      });

      const result = validateAction(state, 0, { type: 'SELECT_GUEST', cardIndex: 99 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('索引');
    });

    it('负数索引应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.OPERATION,
      });

      const result = validateAction(state, 0, { type: 'SELECT_GUEST', cardIndex: -1 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('索引');
    });

    it('非经营阶段应拒绝', () => {
      const state = makeTestState({
        playerPhase: PlayerActionPhase.PURCHASE,
      });

      const result = validateAction(state, 0, { type: 'SELECT_GUEST', cardIndex: 0 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('阶段');
    });
  });
});
