// packages/server/src/game-session.ts
import { WebSocket } from 'ws';
import {
  GameState,
  PlayerActionPhase,
  RoundPhase,
  PublicGameState,
  MenuCard,
} from '@song-merchant/shared';
import {
  initializeGame,
  buyMenuCard,
  buyShopCard,
  skipPurchase,
  removeCard,
  skipRemove,
  selectGuest,
  advancePhase,
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
    this.broadcast();
    return this.state;
  }

  private findPlayerIndex(playerId: string): number {
    return this.state.players.findIndex((p) => p.id === playerId);
  }

  handleAction(playerId: string, action: { type: string; [key: string]: any }): GameState {
    try {
      const playerIndex = this.findPlayerIndex(playerId);
      if (playerIndex === -1) {
        throw new Error('找不到玩家');
      }

      // 检查是否是当前行动玩家
      if (playerIndex !== this.state.currentPlayerIndex) {
        throw new Error('不是你的回合');
      }

      switch (action.type) {
        case 'BUY_MENU':
          this.state = buyMenuCard(this.state, playerIndex, action.grade);
          break;
        case 'BUY_SHOP':
          this.state = buyShopCard(this.state, playerIndex, action.shopCardId);
          break;
        case 'SKIP_PURCHASE':
          this.state = skipPurchase(this.state, playerIndex);
          break;
        case 'REMOVE_CARD':
          this.state = removeCard(this.state, playerIndex, action.cardId);
          break;
        case 'SKIP_REMOVE':
          this.state = skipRemove(this.state, playerIndex);
          break;
        case 'SELECT_GUEST': {
          const result = selectGuest(this.state, playerIndex, action.cardIndex);
          this.state = result.state;
          // 推送回合结算结果
          this.sendToPlayer(playerId, {
            type: 'TURN_RESULT',
            dishIncome: result.result.dishIncome,
            shopBonus: result.result.shopBonus,
            synergyBonus: result.result.synergyBonus,
            flippedCards: result.result.flippedCards,
          });
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
        // 所有玩家行动完毕，进入下一轮
        this.state.roundNumber++;
        this.state.roundPhase = RoundPhase.PLAYER_TURNS;
        this.state.currentPlayerIndex = 0;
        this.state.playerPhase = PlayerActionPhase.PURCHASE;
        this.state.phaseStartTime = Date.now();
      }

      // 检查阶段是否变化，如果变化了重新启动定时器
      this.startTimer();
      this.broadcast();

      // 备菜阶段特殊处理：推送 PREPARE_REVEAL
      if (this.state.playerPhase === PlayerActionPhase.PREPARATION) {
        this.sendPrepareReveal(playerId);
      }

      // 检查游戏结束
      if (this.state.isGameOver) {
        this.clearTimer();
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

  handleTimeout(): GameState {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    console.log(`[GameSession] 玩家 ${currentPlayer.name} 超时`);

    const playerIndex = this.state.currentPlayerIndex;

    switch (this.state.playerPhase) {
      case PlayerActionPhase.PURCHASE:
        // 超时自动跳过购买
        this.state = skipPurchase(this.state, playerIndex);
        break;
      case PlayerActionPhase.PREPARATION:
        // 超时自动跳过备菜
        this.state = skipRemove(this.state, playerIndex);
        break;
      case PlayerActionPhase.OPERATION:
        // 超时自动选择第一个客人（index=0，不付插队费）
        {
          const result = selectGuest(this.state, playerIndex, 0);
          this.state = result.state;
        }
        break;
      default:
        break;
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

    // 40s 后推送 20s 警告
    this.warning20sTimer = setTimeout(() => {
      this.broadcastTimerWarning(20);
    }, phaseTimeLimit - 20000);

    // 50s 后推送 10s 警告
    this.warning10sTimer = setTimeout(() => {
      this.broadcastTimerWarning(10);
    }, phaseTimeLimit - 10000);

    // 60s 后超时处理
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

    // 备菜阶段：展示玩家全部牌（牌库 + 弃牌堆）
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
    };
  }
}
