import {
  CardGrade,
  ShopType,
  MenuCard,
  ShopCard,
  ShopSkill,
  GuestCard,
  EventCard,
} from './types.js';

// ========================================
// 游戏规则常量
// ========================================

export const INITIAL_MENU_PER_PLAYER: { grade: CardGrade; count: number }[] = [
  { grade: CardGrade.FOUR, count: 6 },
  { grade: CardGrade.THREE, count: 2 },
];

export const SHOPS_DISPLAY_COUNT = 4;
export const PUBLIC_CARDS_COUNT = 4;
export const PHASE_TIME_LIMIT = 60000;
export const REMOVE_COST = 3;
export const VICTORY_SHOPS = 8;
export const VICTORY_MONEY = 50;
export const STREET_SLOT_COUNT = 8;
export const SKIP_GUEST_FEE = 1;
export const STARTING_MONEY = [10, 10, 10, 10];

// ========================================
// 菜单牌数据
// ========================================

let menuCardCounter = 0;
function makeMenuCard(grade: CardGrade, dishName: string, income: number, cost: number): MenuCard {
  return { id: `menu-${++menuCardCounter}`, grade, dishName, income, cost };
}

const GRADE_FOUR_DISHES = [
  '炊饼', '豆腐羹', '辣脚子', '菜羹',
];
const GRADE_FOUR_CARDS: MenuCard[] = GRADE_FOUR_DISHES.flatMap((dish) =>
  Array.from({ length: 5 }, () => makeMenuCard(CardGrade.FOUR, dish, 1, 1))
);

const GRADE_THREE_DISHES = [
  '春茧', '蜜饯', '香糖果子', '羊肉馒头',
];
const GRADE_THREE_CARDS: MenuCard[] = GRADE_THREE_DISHES.flatMap((dish) =>
  Array.from({ length: 5 }, () => makeMenuCard(CardGrade.THREE, dish, 2, 3))
);

const GRADE_TWO_DISHES = ['山家三脆', '东坡肉', '洗手蟹', '酥骨鱼'];
const GRADE_TWO_CARDS: MenuCard[] = GRADE_TWO_DISHES.flatMap((dish) =>
  Array.from({ length: 4 }, () => makeMenuCard(CardGrade.TWO, dish, 4, 5))
);

const GRADE_ONE_DISHES = ['蟠桃饭', '莲房鱼包', '蟹酿橙'];
const GRADE_ONE_CARDS: MenuCard[] = GRADE_ONE_DISHES.flatMap((dish) =>
  Array.from({ length: 4 }, () => makeMenuCard(CardGrade.ONE, dish, 6, 8))
);

export const ALL_MENU_CARDS: Record<CardGrade, MenuCard[]> = {
  [CardGrade.ONE]: GRADE_ONE_CARDS,
  [CardGrade.TWO]: GRADE_TWO_CARDS,
  [CardGrade.THREE]: GRADE_THREE_CARDS,
  [CardGrade.FOUR]: GRADE_FOUR_CARDS,
};

// ========================================
// 店铺牌数据
// ========================================

let shopCardCounter = 0;
function makeShopCard(
  type: ShopType, name: string, emoji: string, buildCost: number, bonusIncome: number,
  synergy: { withShopType: ShopType; bonus: number }[] = [], skill?: ShopSkill,
): ShopCard {
  return { id: `shop-${++shopCardCounter}`, type, name, emoji, buildCost, bonusIncome, synergy, skill };
}

const SHOP_TEMPLATES: Array<{
  type: ShopType; name: string; emoji: string; buildCost: number; bonusIncome: number;
  synergy: { withShopType: ShopType; bonus: number }[]; skill?: ShopSkill; count: number;
}> = [
  { type: ShopType.DRINKS, name: '饮子铺', emoji: '🥤', buildCost: 3, bonusIncome: 1, synergy: [{ withShopType: ShopType.FORTUNE, bonus: 2 }], count: 4 },
  { type: ShopType.PORCELAIN, name: '瓷器铺', emoji: '🏺', buildCost: 4, bonusIncome: 1, synergy: [{ withShopType: ShopType.GAMBLING, bonus: 2 }], count: 4 },
  { type: ShopType.WINEHOUSE, name: '酒肆', emoji: '🍶', buildCost: 4, bonusIncome: 2, synergy: [{ withShopType: ShopType.CUJU, bonus: 2 }], count: 4 },
  { type: ShopType.BOOKSHOP, name: '书坊', emoji: '📚', buildCost: 5, bonusIncome: 2, synergy: [{ withShopType: ShopType.THEATER, bonus: 2 }], count: 4 },
  { type: ShopType.SILK, name: '绸缎庄', emoji: '🧵', buildCost: 5, bonusIncome: 2, synergy: [{ withShopType: ShopType.JEWELRY, bonus: 2 }], count: 4 },
  { type: ShopType.JEWELRY, name: '首饰铺', emoji: '💍', buildCost: 6, bonusIncome: 2, synergy: [{ withShopType: ShopType.SILK, bonus: 2 }], count: 3 },
  {
    type: ShopType.FORTUNE, name: '卦肆', emoji: '🔮', buildCost: 6, bonusIncome: 3,
    synergy: [{ withShopType: ShopType.DRINKS, bonus: 2 }],
    skill: { name: '卜卦', description: '客人光顾时，可投掷1次骰子，若点数≥4，额外获得3两银子', type: 'dice_check', diceThreshold: 4, diceBonus: 3 },
    count: 3,
  },
  { type: ShopType.GAMBLING, name: '官扑铺', emoji: '🎲', buildCost: 7, bonusIncome: 3, synergy: [{ withShopType: ShopType.PORCELAIN, bonus: 2 }], count: 3 },
  {
    type: ShopType.CUJU, name: '蹴鞠场', emoji: '⚽', buildCost: 8, bonusIncome: 3,
    synergy: [{ withShopType: ShopType.WINEHOUSE, bonus: 2 }],
    skill: { name: '蹴鞠', description: '客人光顾时，可投掷1次骰子，获得与骰子点数等量的银子', type: 'dice_income' },
    count: 3,
  },
  {
    type: ShopType.THEATER, name: '勾栏瓦肆', emoji: '🎭', buildCost: 9, bonusIncome: 4,
    synergy: [{ withShopType: ShopType.BOOKSHOP, bonus: 2 }],
    skill: { name: '瓦肆', description: '客人光顾时，玩家拥有的每栋店铺都能额外获得1两银子', type: 'per_shop_income', bonusPerShop: 1 },
    count: 3,
  },
];

export const ALL_SHOP_CARDS: ShopCard[] = SHOP_TEMPLATES.flatMap((tpl) =>
  Array.from({ length: tpl.count }, () =>
    makeShopCard(tpl.type, tpl.name, tpl.emoji, tpl.buildCost, tpl.bonusIncome, tpl.synergy, tpl.skill),
  )
);

// ========================================
// 客人牌数据
// ========================================

let guestCardCounter = 0;
function makeGuestCard(name: string, title: string, dishCount: number, shopPreferences: { shopType: ShopType; label: string }[] | 'ALL_SHOPS'): GuestCard {
  return {
    id: `guest-${++guestCardCounter}`,
    name,
    title,
    dishCount,
    shopPreferences: shopPreferences === 'ALL_SHOPS' ? [] : shopPreferences,
    ...(shopPreferences === 'ALL_SHOPS' ? { allShops: true } as any : {}),
  };
}

const GUEST_TEMPLATES: Array<{
  name: string; title: string; dishCount: number;
  shopPreferences: { shopType: ShopType; label: string }[] | 'ALL_SHOPS';
  count: number;
}> = [
  { name: '货郎', title: '货郎', dishCount: 2, shopPreferences: [], count: 6 },
  { name: '农夫', title: '农夫', dishCount: 2, shopPreferences: [{ shopType: ShopType.DRINKS, label: '饮子铺' }], count: 6 },
  { name: '工匠', title: '工匠', dishCount: 2, shopPreferences: [{ shopType: ShopType.PORCELAIN, label: '瓷器铺' }, { shopType: ShopType.WINEHOUSE, label: '酒肆' }], count: 6 },
  { name: '书生', title: '书生', dishCount: 3, shopPreferences: [{ shopType: ShopType.BOOKSHOP, label: '书坊' }, { shopType: ShopType.DRINKS, label: '饮子铺' }], count: 5 },
  { name: '歌女', title: '歌女', dishCount: 3, shopPreferences: [{ shopType: ShopType.SILK, label: '绸缎庄' }, { shopType: ShopType.JEWELRY, label: '首饰铺' }], count: 5 },
  { name: '富商', title: '富商', dishCount: 3, shopPreferences: [{ shopType: ShopType.PORCELAIN, label: '瓷器铺' }, { shopType: ShopType.WINEHOUSE, label: '酒肆' }, { shopType: ShopType.BOOKSHOP, label: '书坊' }], count: 4 },
  { name: '贵公子', title: '贵公子', dishCount: 4, shopPreferences: [{ shopType: ShopType.SILK, label: '绸缎庄' }, { shopType: ShopType.JEWELRY, label: '首饰铺' }, { shopType: ShopType.WINEHOUSE, label: '酒肆' }], count: 4 },
  { name: '县令', title: '县令', dishCount: 4, shopPreferences: [{ shopType: ShopType.BOOKSHOP, label: '书坊' }, { shopType: ShopType.FORTUNE, label: '卦肆' }, { shopType: ShopType.WINEHOUSE, label: '酒肆' }], count: 3 },
  { name: '将军', title: '将军', dishCount: 4, shopPreferences: [{ shopType: ShopType.GAMBLING, label: '官扑铺' }, { shopType: ShopType.CUJU, label: '蹴鞠场' }, { shopType: ShopType.WINEHOUSE, label: '酒肆' }], count: 3 },
  { name: '宰相', title: '宰相', dishCount: 5, shopPreferences: [{ shopType: ShopType.SILK, label: '绸缎庄' }, { shopType: ShopType.BOOKSHOP, label: '书坊' }, { shopType: ShopType.FORTUNE, label: '卦肆' }, { shopType: ShopType.WINEHOUSE, label: '酒肆' }], count: 2 },
  { name: '王爷', title: '王爷', dishCount: 5, shopPreferences: [{ shopType: ShopType.JEWELRY, label: '首饰铺' }, { shopType: ShopType.THEATER, label: '勾栏瓦肆' }, { shopType: ShopType.WINEHOUSE, label: '酒肆' }], count: 2 },
  { name: '皇帝', title: '皇帝', dishCount: 6, shopPreferences: 'ALL_SHOPS', count: 1 },
];

export const ALL_GUEST_CARDS: GuestCard[] = GUEST_TEMPLATES.flatMap((tpl) =>
  Array.from({ length: tpl.count }, () =>
    makeGuestCard(tpl.name, tpl.title, tpl.dishCount, tpl.shopPreferences),
  )
);

// ========================================
// 事件牌数据
// ========================================

let eventCardCounter = 0;
function makeEventCard(name: string, description: string, effect: EventCard['effect']): EventCard {
  return { id: `event-${++eventCardCounter}`, name, description, effect };
}

export const ALL_EVENT_CARDS: EventCard[] = [
  makeEventCard('硕果累累', '所有玩家立即获得 3 两银子', { type: 'give_money', value: 3, scope: 'all', duration: 'instant' }),
  makeEventCard('天降横财', '当前玩家投掷骰子，获得与点数等量的银子', { type: 'dice_money', value: 0, scope: 'self', duration: 'instant' }),
  makeEventCard('门可罗雀', '所有店铺的逛街基础收入 -1（最低降为0，不影响联动和技能加成）', { type: 'shop_income_reduce', value: 1, scope: 'all', duration: 'persistent' }),
  makeEventCard('苛捐杂税', '每位玩家在回合结束时，每拥有一个店铺需缴纳 1 两银子', { type: 'tax_per_shop', value: 1, scope: 'all', duration: 'persistent' }),
  makeEventCard('无尖不商', '所有菜品的售卖基础收入 +1', { type: 'dish_income_boost', value: 1, scope: 'all', duration: 'persistent' }),
  makeEventCard('辞旧迎新', '所有玩家可以将后厨中的任意数量菜品弃掉，并从公共牌堆抽取等量的新菜品', { type: 'swap_cards', value: 0, scope: 'all', duration: 'instant' }),
  makeEventCard('高朋满座', '本回合招待客人时，骰子点数直接视为最大值（即6点），无需实际投掷', { type: 'auto_max_dice', value: 6, scope: 'self', duration: 'instant' }),
  makeEventCard('休养生息', '当前玩家可以跳过经营阶段，直接结束回合，并免费获得一张随机菜品牌', { type: 'skip_and_free_card', value: 0, scope: 'self', duration: 'instant' }),
];
