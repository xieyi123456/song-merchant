// packages/client/src/pages/GamePage.tsx
import React from 'react';
import { PublicGameState, MenuCard } from '@song-merchant/shared';
import { StatusBar } from '../components/StatusBar';
import { PublicArea } from '../components/PublicArea';
import { ActionPanel } from '../components/ActionPanel';
import { RevenueEstimate } from '../components/RevenueEstimate';
import { PlayerStreet } from '../components/PlayerStreet';
import { GameLog, LogEntry } from '../components/GameLog';
import { DiceModal } from '../components/DiceModal';
import styles from './GamePage.module.css';

interface GamePageProps {
  sendMessage: (msg: any) => void;
  gameState: PublicGameState | null;
  playerId: string;
  roomCode: string;
  logs: LogEntry[];
  prepareCards: MenuCard[];
  lastTurnResult: any;
  onTurnResultDone: () => void;
}

export const GamePage: React.FC<GamePageProps> = ({
  sendMessage,
  gameState,
  playerId,
  roomCode,
  logs,
  prepareCards,
  lastTurnResult,
  onTurnResultDone,
}) => {
  if (!gameState) {
    return (
      <div className={styles.loading}>
        <p>正在加载游戏...</p>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;

  const showDice = lastTurnResult && lastTurnResult.gamblingModifier !== undefined && lastTurnResult.gamblingModifier !== 0;

  return (
    <div className={styles.container}>
      {showDice && (
        <DiceModal
          skillIncome={lastTurnResult.gamblingModifier}
          totalIncome={lastTurnResult.dishIncome + lastTurnResult.shopBonus + lastTurnResult.synergyBonus + lastTurnResult.gamblingModifier}
          skillDetail={lastTurnResult.skillDetail || ''}
          onComplete={onTurnResultDone}
        />
      )}

      <StatusBar
        gameState={gameState}
        roomCode={roomCode}
      />

      <div className={styles.publicRow}>
        <PublicArea gameState={gameState} />
        <ActionPanel
          gameState={gameState}
          isMyTurn={isMyTurn}
          sendMessage={sendMessage}
          playerId={playerId}
          prepareCards={prepareCards}
        />
      </div>

      <RevenueEstimate gameState={gameState} isMyTurn={isMyTurn} />

      <div className={styles.streetsSection}>
        {gameState.players.map((player, idx) => (
          <PlayerStreet
            key={player.id}
            player={player}
            isCurrentPlayer={idx === gameState.currentPlayerIndex}
            isMe={player.id === playerId}
            phaseStartTime={gameState.phaseStartTime}
            phaseTimeLimit={gameState.phaseTimeLimit}
          />
        ))}
      </div>

      <GameLog gameState={gameState} logs={logs} />
    </div>
  );
};
