// packages/server/src/game-session.ts
import { WebSocket } from 'ws';
import {
  GameState,
  PlayerActionPhase,
  RoundPhase,
  PublicGameState,
  MenuCard,
  ShopCard,
  GuestCard,
  isGuestCard,
} from '@song-merchant/shared';
import {
  initializeGame,
  extractInitialAutoEvents,
  buyMenuCard,
  buyShopCard,
  clearLand,
  skipPurchase,
  removeCard,
  skipRemove,
  selectGuest,
  advancePhase,
  calculateShopBonus,
} from '@song-merchant/shared';
import { RoomPlayer } from './room-manager';

export class GameSession {
  private roomId: string;
  private players: RoomPlayer[];
  private state!: GameState;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private warning20sTimer: ReturnType<typeof setTimeout> | null = null;
  private warning10sTimer: ReturnType<typeof setTimeout> | null = null;
  public onStateUpdate: ((state: PublicGameState) => void) | null = null;

  constructor(roomId: string, players: RoomPlayer[]) {
    this.roomId = roomId;
    this.players = players;
  }

  start(): GameState {
    const playerNames = this.players.map((p) => ({
      id: p.id,
      name: p.name,
    }));

    this.state = initializeGame(this.roomId, playerNames);
    this.startTimer();
    this.broadcastLog('系统', 'game-start', `游戏开始！共 ${this.state.players.length} 位玩家`);

    // 广播初始化时自动触发的事件牌
    const initialAutoEvents = extractInitialAutoEvents(this.state);
    for (const evt of initialAutoEvents.triggeredEvents) {
      const scopeLabel = 'all';
      this.broadcastEvent(
        evt.eventCard.name,
        evt.eventCard.description,
        scopeLabel,
        '系统',
      );
      this.broadcastLog('系统', 'system', `事件牌【${evt.eventCard.name}】自动触发：${evt.eventCard.description}`);
    }

    this.broadcast();
    return this.state;
  }

  private findPlayerIndex(playerId: string): number {
    return this.state.players.findIndex((p) => p.id === playerId);
  }

  private getPlayerName(playerIndex: number): string {
    return this.state.players[playerIndex]?.name || '未知';
  }

  private getPlayerId(playerIndex: number): string {
    return this.state.players[playerIndex]?.id || '';
  }

  handleAction(playerId: string, action: { type: string; [key: string]: any }): GameState {
    try {
      const playerIndex = this.findPlayerIndex(playerId);
      if (playerIndex === -1) {
        throw new Error('找不到玩家');
      }

      if (playerIndex !== this.state.currentPlayerIndex) {
        throw new Error('不是你的回合');
      }

      const playerName = this.getPlayerName(playerIndex);

      switch (action.type) {
        case 'BUY_MENU': {
          const grade = action.grade;
          const gradeLabel: Record<number, string> = { 4: '四品', 3: '三品', 2: '二品', 1: '一品' };
          const gradeText = gradeLabel[grade as number] || String(grade);
          this.state = buyMenuCard(this.state, playerIndex, grade);
          this.broadcastLog(playerName, playerId, `购买了 ${gradeText} 菜单牌`);
          break;
        }
        case 'BUY_SHOP': {
          const shopCard = this.state.publicArea.shopDisplay.find(
            (s: ShopCard) => s.id === action.shopCardId
          );
          const shopName = shopCard ? `${shopCard.emoji}${shopCard.name}` : '店铺';
          const slotIdx = action.slotIndex ?? 0;
          const slot = this.state.players[playerIndex].streetSlots[slotIdx];
          const clearingCost = slot && slot.state === 'uncleared' ? (slot as any).clearingCost : 0;
          const costText = clearingCost > 0 ? `（建造${shopCard?.buildCost || '?'}两 + 清理${clearingCost}两）` : `（${shopCard?.buildCost || '?'}两）`;
          this.state = buyShopCard(this.state, playerIndex, action.shopCardId, slotIdx);
          this.broadcastLog(playerName, playerId, `建造了 ${shopName}${costText}`);
          break;
        }
        case 'CLEAR_LAND': {
          const slotIdx = action.slotIndex ?? 0;
          const slot = this.state.players[playerIndex].streetSlots[slotIdx];
          const clearingCost = slot && slot.state === 'uncleared' ? (slot as any).clearingCost : 0;
          this.state = clearLand(this.state, playerIndex, slotIdx);
          this.broadcastLog(playerName, playerId, `花费 ${clearingCost} 两清理了第 ${slotIdx + 1} 块土地`);
          break;
        }
        case 'SKIP_PURCHASE':
          this.state = skipPurchase(this.state, playerIndex);
          this.broadcastLog(playerName, playerId, '跳过购买');
          break;
        case 'REMOVE_CARD':
          this.state = removeCard(this.state, playerIndex, action.cardId);
          this.broadcastLog(playerName, playerId, '花费3两移出了一张菜单牌（精简牌库）');
          break;
        case 'SKIP_REMOVE':
          this.state = skipRemove(this.state, playerIndex);
          this.broadcastLog(playerName, playerId, '跳过备菜');
          break;
        case 'SELECT_GUEST': {
          const card = this.state.publicArea.publicCards[action.cardIndex];
          const skipFee = action.cardIndex * 1; // SKIP_GUEST_FEE = 1
          const skipText = skipFee > 0 ? `（跳过费 ${skipFee} 两）` : '';
          const result = selectGuest(this.state, playerIndex, action.cardIndex);
          this.state = result.state;

          // 广播补牌时自动触发的事件
          for (const evt of result.autoEvents.triggeredEvents) {
            this.broadcastEvent(
              evt.eventCard.name,
              evt.eventCard.description,
              'all',
              playerName,
            );
            this.broadcastLog('系统', 'system', `事件牌【${evt.eventCard.name}】自动触发：${evt.eventCard.description}`);
          }

          // 客人牌结算
          if (result.result.flippedCards.length > 0) {
            const guest = card as GuestCard;
            const synergyDetail = this.buildSynergyDetail(playerIndex, guest);
            const gm = result.result.gamblingModifier || 0;
            const gmText = gm !== 0 ? ` + 🎲技能+${gm}两` : '';
            const totalIncome = result.result.dishIncome + result.result.shopBonus + result.result.synergyBonus + gm;

            this.broadcastLog(
              playerName, playerId,
              `招待 ${guest.name}${skipText}：菜品收入 ${result.result.dishIncome}两 + 匹配加成 ${result.result.shopBonus}两 + 联动加成 ${result.result.synergyBonus}两${gmText} = 总收入 ${totalIncome}两${synergyDetail ? '（' + synergyDetail + '）' : ''}`
            );

            this.sendToPlayer(playerId, {
              type: 'TURN_RESULT',
              dishIncome: result.result.dishIncome,
              shopBonus: result.result.shopBonus,
              synergyBonus: result.result.synergyBonus,
              flippedCards: result.result.flippedCards,
              synergyDetail,
              gamblingModifier: gm,
            });
          } else if (result.autoEvents.triggeredEvents.length === 0) {
            // 休养生息等情况
            this.broadcastLog(playerName, playerId, '休养生息，跳过经营并获得免费菜牌');
          }
          break;
        }
        default:
          throw new Error(`未知操作类型: ${action.type}`);
      }

      // 如果阶段是 DONE，推进到下一玩家/轮次
      if (this.state.playerPhase === PlayerActionPhase.DONE) {
        this.state = advancePhase(this.state);
      }

      // 检查是否需要开始新轮次
      if (this.state.roundPhase === RoundPhase.ROUND_END) {
        this.state.roundNumber++;
        this.state.roundPhase = RoundPhase.PLAYER_TURNS;
        this.state.currentPlayerIndex = 0;
        this.state.playerPhase = PlayerActionPhase.PURCHASE;
        this.state.phaseStartTime = Date.now();
        this.broadcastLog('系统', 'round-start', `=== 第 ${this.state.roundNumber} 轮开始 ===`);
      }

      this.startTimer();
      this.broadcast();

      if (this.state.playerPhase === PlayerActionPhase.PREPARATION) {
        this.sendPrepareReveal(playerId);
      }

      if (this.state.isGameOver) {
        this.clearTimer();
        const winner = this.state.players.find((p) => p.id === this.state.winnerId);
        this.broadcastLog('系统', 'game-over', `游戏结束！${winner?.name || '未知'} 获胜！`);
        this.broadcastGameOver();
      }
    } catch (err: any) {
      this.sendToPlayer(playerId, {
        type: 'ERROR',
        message: err.message || '操作失败',
      });
    }

    return this.state;
  }

  private buildSynergyDetail(playerIndex: number, guest: GuestCard): string {
    const player = this.state.players[playerIndex];
    const builtShops = player.streetSlots
      .filter((s): s is { state: 'built'; shopCard: ShopCard } => s.state === 'built')
      .map((s) => s.shopCard);

    const matchedShops = builtShops.filter((shop) =>
      guest.shopPreferences.some((pref) => pref.shopType === shop.type)
    );

    const synergyPairs: string[] = [];
    for (const shop of matchedShops) {
      for (const syn of shop.synergy) {
        const partner = builtShops.find((s) => s.type === syn.withShopType);
        if (partner) {
          synergyPairs.push(`${shop.emoji}${shop.name}+${partner.emoji}${partner.name} 联动+${syn.bonus}`);
        }
      }
    }

    return synergyPairs.join('，');
  }

  handleTimeout(): GameState {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    console.log(`[GameSession] 玩家 ${currentPlayer.name} 超时`);

    const playerIndex = this.state.currentPlayerIndex;
    const playerName = this.getPlayerName(playerIndex);

    switch (this.state.playerPhase) {
      case PlayerActionPhase.PURCHASE:
        this.state = skipPurchase(this.state, playerIndex);
        this.broadcastLog(playerName, this.getPlayerId(playerIndex), '超时，自动跳过购买');
        break;
      case PlayerActionPhase.PREPARATION:
        this.state = skipRemove(this.state, playerIndex);
        this.broadcastLog(playerName, this.getPlayerId(playerIndex), '超时，自动跳过备菜');
        break;
      case PlayerActionPhase.OPERATION: {
        const result = selectGuest(this.state, playerIndex, 0);
        this.state = result.state;
        this.broadcastLog(playerName, this.getPlayerId(playerIndex), '超时，自动选择第一位客人');
        break;
      }
      default:
        break;
    }

    if (this.state.playerPhase === PlayerActionPhase.DONE) {
      this.state = advancePhase(this.state);
    }

    if (this.state.roundPhase === RoundPhase.ROUND_END) {
      this.state.roundNumber++;
      this.state.roundPhase = RoundPhase.PLAYER_TURNS;
      this.state.currentPlayerIndex = 0;
      this.state.playerPhase = PlayerActionPhase.PURCHASE;
      this.state.phaseStartTime = Date.now();
      this.broadcastLog('系统', 'round-start', `=== 第 ${this.state.roundNumber} 轮开始 ===`);
    }

    this.startTimer();
    this.broadcast();

    if (this.state.isGameOver) {
      this.clearTimer();
      this.broadcastGameOver();
    }

    return this.state;
  }

  getState(): GameState {
    return this.state;
  }

  getPublicState(): PublicGameState {
    return this.sanitizeState();
  }

  startTimer(): void {
    this.clearTimer();

    this.state.phaseStartTime = Date.now();
    this.state.phaseTimeLimit = 60000;

    const phaseTimeLimit = this.state.phaseTimeLimit;

    this.warning20sTimer = setTimeout(() => {
      this.broadcastTimerWarning(20);
    }, phaseTimeLimit - 20000);

    this.warning10sTimer = setTimeout(() => {
      this.broadcastTimerWarning(10);
    }, phaseTimeLimit - 10000);

    this.timer = setTimeout(() => {
      this.handleTimeout();
    }, phaseTimeLimit);
  }

  clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.warning20sTimer) {
      clearTimeout(this.warning20sTimer);
      this.warning20sTimer = null;
    }
    if (this.warning10sTimer) {
      clearTimeout(this.warning10sTimer);
      this.warning10sTimer = null;
    }
  }

  private broadcast(): void {
    const publicState = this.sanitizeState();
    if (this.onStateUpdate) {
      this.onStateUpdate(publicState);
    }
    this.players.forEach((p) => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(
          JSON.stringify({ type: 'STATE_UPDATE', state: publicState })
        );
      }
    });
  }

  private broadcastLog(playerName: string, playerId: string, message: string): void {
    const msg = JSON.stringify({
      type: 'GAME_LOG',
      playerName,
      message,
      logType: playerId === 'system' || playerId === 'round-start' || playerId === 'game-start' || playerId === 'game-over' ? 'system' : 'action',
    });
    this.players.forEach((p) => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(msg);
      }
    });
  }

  private broadcastEvent(eventName: string, description: string, scope: string, triggeredBy: string): void {
    const msg = JSON.stringify({
      type: 'EVENT_TRIGGERED',
      eventName,
      description,
      scope,
      triggeredBy,
    });
    this.players.forEach((p) => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(msg);
      }
    });
  }

  private broadcastTimerWarning(secondsLeft: number): void {
    this.players.forEach((p) => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(
          JSON.stringify({ type: 'TIMER_WARNING', secondsLeft })
        );
      }
    });
  }

  private broadcastGameOver(): void {
    const publicState = this.sanitizeState();
    this.players.forEach((p) => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(
          JSON.stringify({
            type: 'GAME_OVER',
            winnerId: this.state.winnerId,
            finalState: publicState,
          })
        );
      }
    });
  }

  private sendToPlayer(playerId: string, message: any): void {
    const player = this.players.find((p) => p.id === playerId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }

  private sendPrepareReveal(playerId: string): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;

    const allCards: MenuCard[] = [...player.library, ...player.discard];

    this.sendToPlayer(playerId, {
      type: 'PREPARE_REVEAL',
      cards: allCards,
    });
  }

  private sanitizeState(): PublicGameState {
    return {
      roomId: this.state.roomId,
      roundNumber: this.state.roundNumber,
      roundPhase: this.state.roundPhase,
      currentPlayerIndex: this.state.currentPlayerIndex,
      playerPhase: this.state.playerPhase,
      players: this.state.players.map((p) => ({
        id: p.id,
        name: p.name,
        money: p.money,
        libraryCount: p.library.length,
        discard: p.discard,
        removed: p.removed,
        streetSlots: p.streetSlots,
      })),
      publicArea: this.state.publicArea,
      phaseStartTime: this.state.phaseStartTime,
      phaseTimeLimit: this.state.phaseTimeLimit,
      winnerId: this.state.winnerId,
      isGameOver: this.state.isGameOver,
      triggeringPlayerId: this.state.triggeringPlayerId,
      activeEffects: this.state.activeEffects,
    };
  }
}
