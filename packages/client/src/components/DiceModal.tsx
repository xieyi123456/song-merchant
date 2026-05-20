// packages/client/src/components/DiceModal.tsx
import React, { useEffect, useState } from 'react';
import styles from './DiceModal.module.css';

interface DiceModalProps {
  skillIncome: number;
  totalIncome: number;
  skillDetail: string;
  onComplete: () => void;
}

const DICE_FRAMES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const DiceModal: React.FC<DiceModalProps> = ({
  skillIncome,
  totalIncome,
  skillDetail,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'rolling' | 'result'>('rolling');
  const [currentFace, setCurrentFace] = useState(0);

  useEffect(() => {
    if (phase !== 'rolling') return;

    let count = 0;
    const interval = setInterval(() => {
      setCurrentFace(Math.floor(Math.random() * 6));
      count++;
      if (count >= 15) {
        clearInterval(interval);
        setPhase('result');
      }
    }, 80);

    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === 'result') {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {phase === 'rolling' ? (
          <div className={styles.rolling}>
            <div className={styles.dice}>{DICE_FRAMES[currentFace]}</div>
            <div className={styles.rollingText}>技能掷骰中...</div>
          </div>
        ) : (
          <div className={styles.result}>
            <div className={styles.resultDice}>
              {skillIncome > 0 ? '⚅' : skillIncome === 0 ? '⚃' : '⚀'}
            </div>
            <div className={styles.resultText}>
              {skillDetail || `技能收入：`}
              <span className={styles.positive}>
                +{skillIncome} 两
              </span>
            </div>
            <div className={styles.totalText}>
              本轮总收入：<span className={styles.totalValue}>{totalIncome} 两</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
