import {
  CardGrade,
  ShopType,
  MenuCard,
  ShopCard,
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
export const STARTING_MONEY = 10;

// ========================================
// 菜单牌数据
// ========================================

let menuCardCounter = 0;
function makeMenuCard(grade: CardGrade, dishName: string, income: number, cost: number): MenuCard {
  return { id: `menu-${++menuCardCounter}`, grade, dishName, income, cost };
}

const GRADE_FOUR_DISHES = [
  '白水豆腐', '清炒时蔬', '蒸芋头', '煮豆芽', '凉拌黄瓜',
  '糙米饭', '素面', '白粥',
];
const GRADE_FOUR_CARDS: MenuCard[] = GRADE_FOUR_DISHES.flatMap((dish) =>
  Array.from({ length: 5 }, () => makeMenuCard(CardGrade.FOUR, dish, 1, 1))
);

const GRADE_THREE_DISHES = [
  '东坡肉', '叫花鸡', '西湖醋鱼', '龙井虾仁', '宋嫂鱼羹',
  '蜜汁藕', '蟹黄包',
];
const GRADE_THREE_CARDS: MenuCard[] = GRADE_THREE_DISHES.flatMap((dish) =>
  Array.from({ length: 5 }, () => makeMenuCard(CardGrade.THREE, dish, 2, 3))
);

const GRADE_TWO_DISHES = ['佛跳墙', '宫廷糕点', '翡翠虾仁', '红烧狮子头'];
const GRADE_TWO_CARDS: MenuCard[] = GRADE_TWO_DISHES.flatMap((dish) =>
  Array.from({ length: 4 }, () => makeMenuCard(CardGrade.TWO, dish, 3, 5))
);

const GRADE_ONE_DISHES = ['满汉全席', '御赐珍馐'];
const GRADE_ONE_CARDS: MenuCard[] = GRADE_ONE_DISHES.flatMap((dish) =>
  Array.from({ length: 4 }, () => makeMenuCard(CardGrade.ONE, dish, 5, 8))
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
  synergy: { withShopType: ShopType; bonus: number }[] = [], specialEffect?: string,
): ShopCard {
  return { id: `shop-${++shopCardCounter}`, type, name, emoji, buildCost, bonusIncome, synergy, specialEffect };
}

const SHOP_TEMPLATES: Array<{
  type: ShopType; name: string; emoji: string; buildCost: number; bonusIncome: number;
  synergy: { withShopType: ShopType; bonus: number }[]; specialEffect?: string; count: number;
}> = [
  { type: ShopType.TEAHOUSE, name: '茶馆', emoji: '🍵', buildCost: 3, bonusIncome: 2, synergy: [{ withShopType: ShopType.BOOKSHOP, bonus: 1 }], count: 4 },
  { type: ShopType.WINEHOUSE, name: '酒肆', emoji: '🍶', buildCost: 3, bonusIncome: 2, synergy: [{ withShopType: ShopType.FOOD, bonus: 1 }], count: 4 },
  { type: ShopType.SILK, name: '丝绸铺', emoji: '🧵', buildCost: 5, bonusIncome: 3, synergy: [{ withShopType: ShopType.PORCELAIN, bonus: 2 }], count: 4 },
  { type: ShopType.PORCELAIN, name: '瓷器店', emoji: '🏺', buildCost: 5, bonusIncome: 3, synergy: [{ withShopType: ShopType.SILK, bonus: 2 }], count: 4 },
  { type: ShopType.DRINKS, name: '饮子铺', emoji: '🥤', buildCost: 2, bonusIncome: 1, synergy: [{ withShopType: ShopType.TEAHOUSE, bonus: 1 }], count: 4 },
  { type: ShopType.CUJU, name: '蹴鞠场', emoji: '⚽', buildCost: 4, bonusIncome: 2, synergy: [{ withShopType: ShopType.GAMBLING, bonus: 2 }], specialEffect: '每位客人额外翻 1 张牌', count: 3 },
  { type: ShopType.GAMBLING, name: '关扑铺', emoji: '🎲', buildCost: 3, bonusIncome: 2, synergy: [{ withShopType: ShopType.CUJU, bonus: 2 }], specialEffect: '收入随机 +-2 两', count: 3 },
  { type: ShopType.FOOD, name: '饮食铺', emoji: '🍜', buildCost: 3, bonusIncome: 2, synergy: [{ withShopType: ShopType.WINEHOUSE, bonus: 1 }], count: 4 },
  { type: ShopType.PAINTING, name: '书画斋', emoji: '🖼️', buildCost: 4, bonusIncome: 2, synergy: [{ withShopType: ShopType.BOOKSHOP, bonus: 2 }], count: 3 },
  { type: ShopType.BOOKSHOP, name: '书坊', emoji: '📚', buildCost: 4, bonusIncome: 2, synergy: [{ withShopType: ShopType.TEAHOUSE, bonus: 1 }, { withShopType: ShopType.PAINTING, bonus: 2 }], count: 3 },
];

export const ALL_SHOP_CARDS: ShopCard[] = SHOP_TEMPLATES.flatMap((tpl) =>
  Array.from({ length: tpl.count }, () =>
    makeShopCard(tpl.type, tpl.name, tpl.emoji, tpl.buildCost, tpl.bonusIncome, tpl.synergy, tpl.specialEffect),
  )
);

// ========================================
// 客人牌数据
// ========================================

let guestCardCounter = 0;
function makeGuestCard(name: string, title: string, dishCount: number, shopPreferences: { shopType: ShopType; label: string }[]): GuestCard {
  return { id: `guest-${++guestCardCounter}`, name, title, dishCount, shopPreferences };
}

const GUEST_TEMPLATES: Array<{
  name: string; title: string; dishCount: number; shopPreferences: { shopType: ShopType; label: string }[]; count: number;
}> = [
  { name: '张秀才', title: '举人', dishCount: 2, shopPreferences: [{ shopType: ShopType.BOOKSHOP, label: '逛书坊' }, { shopType: ShopType.TEAHOUSE, label: '品茶' }], count: 6 },
  { name: '李员外', title: '员外', dishCount: 3, shopPreferences: [{ shopType: ShopType.SILK, label: '买丝绸' }, { shopType: ShopType.PORCELAIN, label: '赏瓷器' }], count: 6 },
  { name: '王知府', title: '知府', dishCount: 4, shopPreferences: [{ shopType: ShopType.PORCELAIN, label: '鉴赏瓷器' }, { shopType: ShopType.PAINTING, label: '观书画' }, { shopType: ShopType.BOOKSHOP, label: '阅典籍' }], count: 4 },
  { name: '赵牙人', title: '牙人', dishCount: 2, shopPreferences: [{ shopType: ShopType.GAMBLING, label: '碰运气' }, { shopType: ShopType.SILK, label: '看丝绸' }], count: 6 },
  { name: '孙大厨', title: '厨子', dishCount: 3, shopPreferences: [{ shopType: ShopType.FOOD, label: '寻食材' }, { shopType: ShopType.WINEHOUSE, label: '品佳酿' }], count: 6 },
  { name: '周掌柜', title: '掌柜', dishCount: 3, shopPreferences: [{ shopType: ShopType.TEAHOUSE, label: '谈生意' }, { shopType: ShopType.FOOD, label: '用点心' }], count: 6 },
  { name: '吴公子', title: '公子', dishCount: 2, shopPreferences: [{ shopType: ShopType.CUJU, label: '看蹴鞠' }, { shopType: ShopType.DRINKS, label: '喝饮子' }, { shopType: ShopType.GAMBLING, label: '试试手气' }], count: 6 },
  { name: '郑画师', title: '画师', dishCount: 2, shopPreferences: [{ shopType: ShopType.PAINTING, label: '赏画作' }, { shopType: ShopType.BOOKSHOP, label: '寻画谱' }], count: 6 },
  { name: '陈商贾', title: '商贾', dishCount: 4, shopPreferences: [{ shopType: ShopType.SILK, label: '采丝绸' }, { shopType: ShopType.PORCELAIN, label: '购瓷器' }], count: 4 },
  { name: '林小二', title: '小厮', dishCount: 1, shopPreferences: [{ shopType: ShopType.DRINKS, label: '解渴' }, { shopType: ShopType.FOOD, label: '垫肚子' }], count: 8 },
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
function makeEventCard(name: string, description: string, effect: { type: 'income_modifier' | 'skip_turn' | 'draw_extra' | 'discount'; value: number; scope: 'self' | 'all' | 'next_player' }): EventCard {
  return { id: `event-${++eventCardCounter}`, name, description, effect };
}

export const ALL_EVENT_CARDS: EventCard[] = [
  makeEventCard('大寒', '寒风凛冽，所有店铺收入减半', { type: 'income_modifier', value: -0.5, scope: 'all' }),
  makeEventCard('元宵', '元宵佳节，额外获得 3 两', { type: 'income_modifier', value: 3, scope: 'self' }),
  makeEventCard('庙会', '庙会开张，翻牌数 +1', { type: 'draw_extra', value: 1, scope: 'self' }),
  makeEventCard('暴风雨', '暴风雨来袭，下一位玩家跳过回合', { type: 'skip_turn', value: 1, scope: 'next_player' }),
  makeEventCard('丰收年', '五谷丰登，购买菜单牌费用 -2', { type: 'discount', value: 2, scope: 'self' }),
  makeEventCard('科举', '科举放榜，所有读书人额外获得 2 两', { type: 'income_modifier', value: 2, scope: 'all' }),
  makeEventCard('瘟疫', '瘟疫横行，翻牌数 -1（最少 1）', { type: 'draw_extra', value: -1, scope: 'self' }),
  makeEventCard('商路', '商路畅通，额外获得 5 两', { type: 'income_modifier', value: 5, scope: 'self' }),
  makeEventCard('战乱', '战乱四起，所有玩家失去 3 两', { type: 'income_modifier', value: -3, scope: 'all' }),
];
