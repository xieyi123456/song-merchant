# @song-merchant/shared

共享模块，包含游戏的核心类型定义、常量数据和游戏逻辑实现。

## 📋 模块结构

### `types.ts`
核心类型定义文件，包含：

**枚举类型**
- `CardGrade` - 菜品等级（1-4）
- `ShopType` - 10 种店铺类型
- `PlayerActionPhase` - 玩家行动阶段（购买、备菜、经营、完成）
- `RoundPhase` - 轮次阶段（玩家行动、轮末结算、游戏结束）

**卡牌接口**
- `MenuCard` - 菜品牌（含等级、菜名、收入、成本）
- `ShopCard` - 店铺牌（含类型、名称、成本、基础收入、联动、技能）
- `GuestCard` - 客人牌（含名字、身份、所需菜数、店铺偏好）
- `EventCard` - 事件牌（含名称、描述、效果）

**游戏状态**
- `GameState` - 服务端权威的完整游戏状态
- `PublicGameState` - 脱敏后的公开游戏状态（推送给客户端）
- `Player` - 玩家数据（金钱、菜牌库、商业街）
- `PublicArea` - 公共区域数据（菜品供应、店铺展示、客人卡）

**网络协议**
- `ClientMessage` - 客户端发送的消息类型（创建房间、购买、选客人等）
- `ServerMessage` - 服务端发送的消息类型（状态更新、结果、日志等）

### `constants.ts`
游戏配置数据库，包含：

**游戏规则常量**
- `INITIAL_MENU_PER_PLAYER` - 玩家初始菜品分配
- `VICTORY_SHOPS` - 获胜所需店铺数（8）
- `VICTORY_MONEY` - 获胜所需金币数（50）
- `PHASE_TIME_LIMIT` - 行动时间限制（60秒）

**卡牌数据库**
- `ALL_MENU_CARDS` - 所有菜品数据（按等级分类）
- `ALL_SHOP_CARDS` - 所有店铺数据（31 张）
- `ALL_GUEST_CARDS` - 所有客人数据（51 张）
- `ALL_EVENT_CARDS` - 所有事件数据（8 张）

### `game-logic.ts`
游戏规则实现，包含：

**核心函数**
- 收益计算逻辑
- 店铺联动判断
- 技能效果应用
- 获胜条件检查

### `validation.ts`
消息验证，包含：

**验证函数**
- 客户端消息格式验证
- 游戏操作有效性检查
- 参数范围验证

## 🔌 使用方式

### 导入类型
```typescript
import {
  GameState,
  ClientMessage,
  ServerMessage,
  CardGrade,
  ShopType,
  PlayerActionPhase,
} from '@song-merchant/shared';
```

### 获取卡牌数据
```typescript
import { ALL_MENU_CARDS, ALL_SHOP_CARDS, ALL_GUEST_CARDS, ALL_EVENT_CARDS } from '@song-merchant/shared';

// 获取所有 3 级菜品
const gradeThreeCards = ALL_MENU_CARDS[CardGrade.THREE];

// 获取所有店铺
const allShops = ALL_SHOP_CARDS;
```

### 类型守卫
```typescript
import { isGuestCard, isEventCard } from '@song-merchant/shared';

const publicCard = /* ... */;

if (isGuestCard(publicCard)) {
  console.log(`客人: ${publicCard.name}`);
} else if (isEventCard(publicCard)) {
  console.log(`事件: ${publicCard.name}`);
}
```

## 🧪 测试

运行测试：
```bash
npm run test
npm run test:watch
```

测试覆盖：
- `game-logic.test.ts` - 游戏规则和收益计算
- `validation.test.ts` - 消息验证

## 📦 导出

本模块通过 npm workspaces 被其他包引用：
- `packages/client` 导入用于客户端状态管理和类型提示
- `packages/server` 导入用于服务端游戏逻辑

## 🔍 关键设计决策

1. **分离类型和逻辑** - 类型定义在 `types.ts`，业务逻辑在 `game-logic.ts`
2. **脱敏状态设计** - `PublicGameState` 隐藏玩家的完整手牌信息
3. **卡牌数据生成** - 使用工厂函数 (`makeMenuCard` 等) 确保 ID 唯一性
4. **网络协议定义** - 使用 TypeScript 的 Discriminated Union 简化消息处理
