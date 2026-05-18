// ========================================
// 枚举
// ========================================

/** 菜单牌品级 */
export enum CardGrade {
  FOUR = 4,
  THREE = 3,
  TWO = 2,
  ONE = 1,
}

/** 店铺类型 */
export enum ShopType {
  TEAHOUSE = 'TEAHOUSE',       // 茶馆
  WINEHOUSE = 'WINEHOUSE',     // 酒肆
  SILK = 'SILK',               // 丝绸铺
  PORCELAIN = 'PORCELAIN',     // 瓷器店
  DRINKS = 'DRINKS',           // 饮子铺
  CUJU = 'CUJU',               // 蹴鞠场
  GAMBLING = 'GAMBLING',       // 关扑铺
  FOOD = 'FOOD',               // 饮食铺
  PAINTING = 'PAINTING',       // 书画斋
  BOOKSHOP = 'BOOKSHOP',       // 书坊
}

/** 玩家行动阶段 */
export enum PlayerActionPhase {
  PURCHASE = 'PURCHASE',       // 购买（二选一）
  PREPARATION = 'PREPARATION', // 备菜（可选剔除）
  OPERATION = 'OPERATION',     // 经营（选客人 -> 翻牌 -> 结算）
  DONE = 'DONE',               // 本轮完毕
}

/** 轮次阶段 */
export enum RoundPhase {
  PLAYER_TURNS = 'PLAYER_TURNS', // 玩家依次行动
  ROUND_END = 'ROUND_END',       // 轮末结算/检查胜利
  GAME_OVER = 'GAME_OVER',       // 游戏结束
}

// ========================================
// 卡牌类型
// ========================================

/** 菜单牌 */
export interface MenuCard {
  id: string;
  grade: CardGrade;
  dishName: string;
  income: number;  // 菜品收入（两）
  cost: number;    // 购买费用（两）
}

/** 联动加成 */
export interface SynergyBonus {
  withShopType: ShopType;
  bonus: number;
}

/** 店铺牌 */
export interface ShopCard {
  id: string;
  type: ShopType;
  name: string;
  emoji: string;
  buildCost: number;
  bonusIncome: number;           // 匹配客人时的额外收入
  synergy: SynergyBonus[];       // 联动加成
  specialEffect?: string;        // 特殊效果描述
}

/** 逛街偏好 */
export interface ShopPreference {
  shopType: ShopType;
  label: string;
}

/** 客人牌 */
export interface GuestCard {
  id: string;
  name: string;
  title: string;
  dishCount: number;
  shopPreferences: ShopPreference[];
}

/** 事件牌效果 */
export interface EventEffect {
  type: 'income_modifier' | 'skip_turn' | 'draw_extra' | 'discount';
  value: number;
  scope: 'self' | 'all' | 'next_player';
}

/** 事件牌 */
export interface EventCard {
  id: string;
  name: string;
  description: string;
  effect: EventEffect;
}

/** 公共牌（客人或事件） */
export type PublicCard = GuestCard | EventCard;

// ========================================
// 商业街
// ========================================

/** 商业街地块 */
export type StreetSlot =
  | { state: 'empty' }
  | { state: 'built'; shopCard: ShopCard };

// ========================================
// 玩家
// ========================================

/** 玩家 */
export interface Player {
  id: string;
  name: string;
  money: number;

  // DBG 牌库（无手牌设计）
  library: MenuCard[];   // 牌库（雅阁）
  discard: MenuCard[];   // 弃牌堆（后厨）
  removed: MenuCard[];   // 永久移出的牌

  // 商业街 — 8 个地块
  streetSlots: StreetSlot[];
}

// ========================================
// 公共区域
// ========================================

/** 公共区域 */
export interface PublicArea {
  menuSupply: Record<CardGrade, MenuCard[]>;          // 按品级的菜单供应
  shopDisplay: ShopCard[];                            // 翻开的 4 张店铺牌
  shopDeck: ShopCard[];                               // 店铺牌堆
  publicCards: PublicCard[];                          // 翻开的 4 张公共牌
  guestEventDeck: PublicCard[];                       // 客人+事件牌堆
}

// ========================================
// 游戏状态
// ========================================

/** 完整游戏状态（服务端权威） */
export interface GameState {
  roomId: string;
  roundNumber: number;
  roundPhase: RoundPhase;
  currentPlayerIndex: number;
  playerPhase: PlayerActionPhase;

  players: Player[];
  publicArea: PublicArea;

  // 倒计时
  phaseStartTime: number;   // 当前阶段开始时间戳（ms）
  phaseTimeLimit: number;   // 60000ms

  // 胜利
  winnerId: string | null;
  isGameOver: boolean;
  triggeringPlayerId: string | null;  // 首个达成条件者
}

/** 脱敏后的公开玩家信息 */
export interface PublicPlayer {
  id: string;
  name: string;
  money: number;
  libraryCount: number;
  discard: MenuCard[];
  removed: MenuCard[];
  streetSlots: StreetSlot[];
}

/** 脱敏后的公开游戏状态（推送给客户端） */
export interface PublicGameState {
  roomId: string;
  roundNumber: number;
  roundPhase: RoundPhase;
  currentPlayerIndex: number;
  playerPhase: PlayerActionPhase;

  players: PublicPlayer[];

  publicArea: PublicArea;

  phaseStartTime: number;
  phaseTimeLimit: number;

  winnerId: string | null;
  isGameOver: boolean;
  triggeringPlayerId: string | null;
}

// ========================================
// 回合结算结果
// ========================================

/** 经营阶段结算结果 */
export interface TurnResult {
  dishIncome: number;
  shopBonus: number;
  synergyBonus: number;
  flippedCards: MenuCard[];
}

// ========================================
// 网络消息协议
// ========================================

/** 客户端 -> 服务端消息 */
export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string; maxPlayers: number }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string }
  | { type: 'START_GAME' }
  | { type: 'BUY_MENU'; grade: CardGrade }
  | { type: 'BUY_SHOP'; shopCardId: string }
  | { type: 'SKIP_PURCHASE' }
  | { type: 'REMOVE_CARD'; cardId: string }
  | { type: 'SKIP_REMOVE' }
  | { type: 'SELECT_GUEST'; cardIndex: number }
  | { type: 'READY' };

/** 服务端 -> 客户端消息 */
export type ServerMessage =
  | { type: 'ROOM_CREATED'; roomCode: string; playerId: string }
  | { type: 'ROOM_JOINED'; roomCode: string; playerId: string; players: string[] }
  | { type: 'PLAYER_JOINED'; playerName: string }
  | { type: 'STATE_UPDATE'; state: PublicGameState }
  | { type: 'PREPARE_REVEAL'; cards: MenuCard[] }
  | { type: 'TURN_RESULT'; dishIncome: number; shopBonus: number; synergyBonus: number; flippedCards: MenuCard[] }
  | { type: 'TIMER_WARNING'; secondsLeft: number }
  | { type: 'GAME_OVER'; winnerId: string; finalState: PublicGameState }
  | { type: 'ERROR'; message: string };

// ========================================
// 类型守卫
// ========================================

/** 判断公共牌是否为客人牌 */
export function isGuestCard(card: PublicCard): card is GuestCard {
  return 'dishCount' in card;
}

/** 判断公共牌是否为事件牌 */
export function isEventCard(card: PublicCard): card is EventCard {
  return 'effect' in card;
}
