# 🏪 大宋百商图 - 线上桌游

这是一个基于大宋百商图桌游规则的多人在线游戏平台，采用 monorepo 架构，使用 React + Node.js + WebSocket 技术栈。

## 📋 项目简介

**大宋百商图**是一款策略类桌游，玩家通过购买菜品、建设店铺、招待客人来赚取银两，首先达成目标条件即可获胜。

### 游戏核心机制

- **菜品系统**：四个等级菜品，购买成本和收入各不相同
- **店铺系统**：10 种不同的店铺类型，每种店铺有独特技能和联动加成
- **客人系统**：12 种不同身份客人，有不同的用餐需求和偏好
- **事件系统**：8 张事件卡牌，可能提供好处或挑战
- **获胜条件**：
  - 方式 1：拥有 8 家店铺
  - 方式 2：拥有 50 两银两

## 🏗️ 项目结构

```
song-merchant/
├── packages/
│   ├── client/          # React 前端应用
│   ├── server/          # Node.js WebSocket 服务器
│   └── shared/          # 共享类型定义和游戏逻辑
├── package.json         # Monorepo 根配置
└── README.md            # 项目文档
```

## 📦 核心模块

### `packages/shared`
**共享模块** - 类型定义和游戏逻辑

- `types.ts` - 核心类型定义
  - 枚举：菜单等级、店铺类型、游戏阶段等
  - 卡牌类型：菜单牌、店铺牌、客人牌、事件牌
  - 游戏状态：完整游戏状态和脱敏后的公开状态
  - 网络消息协议

- `constants.ts` - 游戏配置常量
  - 菜单牌数据库（菜品列表、成本、收入）
  - 店铺牌数据库（10 种店铺、技能、联动关系）
  - 客人牌数据库（12 种客人、等级、偏好）
  - 事件牌数据库（8 张事件卡）

- `game-logic.ts` - 游戏规则实现
- `validation.ts` - 消息验证
- `__tests__/` - 测试套件

### `packages/server`
**后端服务** - 游戏核心逻辑和状态管理

- `index.ts` - WebSocket 服务器入口
- `room-manager.ts` - 房间管理（创建、加入、状态跟踪）
- `game-session.ts` - 游戏会话管理（游戏流程控制）
- `message-handler.ts` - 消息处理和分发

**关键特性：**
- 房间码机制（支持多房间并发）
- WebSocket 连接管理
- 游戏状态同步
- 轮次控制和计时器

### `packages/client`
**前端应用** - React 用户界面

**主要组件：**
- `LobbyPage.tsx` - 大厅（创建/加入房间）
- `GamePage.tsx` - 游戏主页面
- `ActionPanel.tsx` - 玩家行动面板
- `PlayerStreet.tsx` - 玩家商业街展示
- `PublicArea.tsx` - 公共区域（菜品、店铺、客人、事件）
- `GameLog.tsx` - 游戏日志
- `RevenueEstimate.tsx` - 收益预估
- `DiceModal.tsx` - 骰子投掷结果显示

**关键特性：**
- 实时游戏状态更新
- WebSocket 连接管理
- 响应式 UI 设计
- 模块化 CSS

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0
- npm >= 9.0

### 安装依赖

```bash
npm install
```

### 开发模式

**终端 1：启动后端服务器**
```bash
npm run dev:server
```
服务器将运行在 `http://localhost:3001`

**终端 2：启动前端开发服务器**
```bash
npm run dev:client
```
前端将运行在 `http://localhost:5173`

### 编译构建

```bash
# 编译所有包
npm run build

# 类型检查
npm run typecheck
```

### 运行测试

```bash
# 运行 shared 包的测试
npm run test

# 监听模式
npm run test:watch
```

## 🎮 游戏流程

### 游戏初始化
1. 玩家创建或加入房间
2. 所有玩家准备就绪后，房主开始游戏
3. 根据玩家数量分配起始资金（5-8 两）

### 轮次结构
每轮玩家按顺序进行以下阶段：

#### 1. **购买阶段** (PURCHASE)
- 选择购买菜品 OR 店铺（二选一）
- 或跳过购买

#### 2. **备菜阶段** (PREPARATION) - 可选
- 可以移除库存中的菜品（需支付 3 两）
- 或跳过

#### 3. **经营阶段** (OPERATION)
- 选择一位客人并支付相应费用（费用 = 客人位置序号）
- 翻开菜品卡，直到数量满足客人需求或无法继续
- 计算收益：
  - 菜品收入：每张菜品基础收入 + 事件修正
  - 店铺加成：客人喜爱的店铺 × 店铺基础收入
  - 联动加成：满足联动条件的店铺额外加成
  - 技能加成：专属技能效果

#### 4. **轮末结算**
- 检查是否触发获胜条件
- 处理持续生效的事件效果

## 🃏 游戏系统详解

### 菜品系统
| 等级 | 菜品示例 | 收入 | 成本 | 数量 |
|------|---------|------|------|------|
| 四级 | 炊饼、豆腐羹 | 1 两 | 1 两 | 20 |
| 三级 | 春茧、蜜饯 | 2 两 | 3 两 | 20 |
| 二级 | 东坡肉、洗手蟹 | 4 两 | 5 两 | 16 |
| 一级 | 蟠桃饭、莲房鱼包 | 6 两 | 8 两 | 12 |

### 店铺系统 (10 种)
- **饮子铺** (🥤) - 与卦肆联动
- **瓷器铺** (🏺) - 与官扑铺联动
- **酒肆** (🍶) - 与蹴鞠场联动
- **书坊** (📚) - 与勾栏瓦肆联动
- **绸缎庄** (🧵) - 与首饰铺联动
- **首饰铺** (💍) - 与绸缎庄联动
- **卦肆** (🔮) - 技能：骰子≥4 额外 3 两
- **官扑铺** (🎲) - 基础收入 3 两
- **蹴鞠场** (⚽) - 技能：骰子点数等量银两
- **勾栏瓦肆** (🎭) - 技能：每家店铺额外 1 两

### 客人系统 (12 种)
从基层百姓到帝王，需求各异：
- **货郎、农夫、工匠** - 需要 2 道菜，偏好明确
- **书生、歌女、富商** - 需要 3 道菜，选择更广
- **贵公子、县令、将军** - 需要 4 道菜
- **宰相、王爷** - 需要 5 道菜
- **皇帝** - 需要 6 道菜，全店通吃

### 事件系统 (8 张)
- **增益事件**：获得资金、提高收入、跳过经营
- **减益事件**：降低收入、征税
- **转换事件**：弃牌换新、骰子自动最大值

## 🔌 WebSocket 协议

### 客户端消息
```typescript
// 房间管理
{ type: 'CREATE_ROOM'; playerName: string; maxPlayers: number }
{ type: 'JOIN_ROOM'; roomCode: string; playerName: string }

// 游戏控制
{ type: 'START_GAME' }
{ type: 'BUY_MENU'; grade: CardGrade }
{ type: 'BUY_SHOP'; shopCardId: string }
{ type: 'SKIP_PURCHASE' }
{ type: 'REMOVE_CARD'; cardId: string }
{ type: 'SKIP_REMOVE' }
{ type: 'SELECT_GUEST'; cardIndex: number }
{ type: 'READY' }
```

### 服务器消息
```typescript
// 房间事件
{ type: 'ROOM_CREATED'; roomCode: string; playerId: string }
{ type: 'ROOM_JOINED'; roomCode: string; playerId: string; players: string[] }
{ type: 'PLAYER_JOINED'; playerName: string }

// 游戏更新
{ type: 'STATE_UPDATE'; state: PublicGameState }
{ type: 'PREPARE_REVEAL'; cards: MenuCard[] }
{ type: 'TURN_RESULT'; dishIncome: number; shopBonus: number; ... }
{ type: 'EVENT_TRIGGERED'; eventName: string; description: string; ... }

// 系统消息
{ type: 'GAME_LOG'; playerName: string; message: string; logType: string }
{ type: 'TIMER_WARNING'; secondsLeft: number }
{ type: 'GAME_OVER'; winnerId: string; finalState: PublicGameState }
{ type: 'ERROR'; message: string }
```

## 📊 游戏状态结构

**完整状态** (服务端权威)：
- 所有玩家的完整数据（包括手牌库）
- 控制信息和定时器

**公开状态** (推送给客户端)：
- 脱敏的玩家数据（隐藏对手手牌库大小）
- 所有玩家都能看到的公共信息
- 游戏阶段和轮次信息

## 🛠️ 开发指南

### 添加新的菜品
编辑 `packages/shared/src/constants.ts`：
```typescript
const GRADE_FOUR_DISHES = [
  '炊饼', '豆腐羹', '辣脚子', '菜羹',  // 添加新菜品
];
```

### 添加新的店铺
在 `SHOP_TEMPLATES` 中添加配置，包括：
- 店铺类型和名称
- 建造成本和基础收入
- 联动加成
- 专属技能（可选）

### 添加新事件
在 `ALL_EVENT_CARDS` 中使用 `makeEventCard()` 创建新事件卡

### 运行类型检查
```bash
npm run typecheck
```

## 📝 代码规范

- 使用 TypeScript 进行类型检查
- ESM 模块系统
- React 函数式组件 + Hooks
- CSS Modules 样式隔离

## 🧪 测试

目前有针对以下模块的测试：
- `game-logic.ts` - 游戏规则和收益计算
- `validation.ts` - 消息验证逻辑

运行测试：
```bash
npm run test
npm run test:watch  # 监听模式
```

## 🎯 功能清单

- [x] 房间管理和玩家管理
- [x] 基础游戏流程
- [x] 菜品购买和建造店铺
- [x] 客人招待和收益计算
- [x] 店铺联动加成
- [x] 店铺特殊技能
- [x] 事件卡牌效果
- [x] 游戏日志和时间提示
- [x] 获胜条件检查
- [ ] 排行榜系统
- [ ] 游戏回放功能
- [ ] 人工智能对手
- [ ] 移动端适配优化

## 🐛 已知问题

- 无

## 📄 许可证

MIT

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**游戏规则参考**：原始桌游《大宋百商图》
