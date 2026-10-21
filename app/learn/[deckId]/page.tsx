'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Timer as TimerIcon, Check } from 'lucide-react';
import { useStore } from '@/lib/store';
import { shuffleArray } from '@/lib/shuffle';
import { FlashCard, FlashCardNav } from '@/components/FlashCard';
import { MultipleChoice } from '@/components/MultipleChoice';
import { TypeAnswer } from '@/components/TypeAnswer';
import { MatchGame } from '@/components/MatchGame';
import { GravityGame } from '@/components/GravityGame';
import { ConversationPractice } from '@/components/ConversationPractice';
import { ListeningPractice } from '@/components/ListeningPractice';
import { ReadingPractice } from '@/components/ReadingPractice';
import { ResultScreen } from '@/components/ResultScreen';
import { ProgressBar } from '@/components/ProgressBar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { v4 as uuidv4 } from 'uuid';
import type { Card } from '@/lib/types';

type StudyMode = 'flashcard' | 'learn' | 'match' | 'gravity' | 'test' | 'conversation' | 'listening' | 'reading';
type LearnStage = 'mcq1' | 'type1' | 'mcq2' | 'type2';
const LEARN_STAGES: LearnStage[] = ['mcq1', 'type1', 'mcq2', 'type2'];

function LearnContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = params.deckId as string;
  const modeParam = (searchParams.get('mode') || 'flashcard') as StudyMode;

  const { decks, cards, cardsByDeck, settings, progress, updateProgress, addSession, toggleStarCard, markDeckCompleted, isHydrated } = useStore();

  const deck = decks[deckId];
  const rawIds = cardsByDeck[deckId] ?? [];
  // Memoize để tránh tạo array mới mỗi render → khiến MultipleChoice xáo trộn lại đáp án
  const allCards: Card[] = useMemo(
    () => rawIds.map(id => cards[id]).filter(Boolean) as Card[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId, rawIds.join(',')]
  );

  const [studyCards, setStudyCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [learnStageMap, setLearnStageMap] = useState<Record<string, number>>({});
  const [learnCorrect, setLearnCorrect] = useState(0);
  // correctSteps: tăng mỗi lần đúng 1 bước nhỏ, dùng cho thanh tiến độ realtime
  const [correctSteps, setCorrectSteps] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const startTime = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (allCards.length === 0) return;
    const shouldReset = searchParams.get('resetSession') === 'true';
    const unmastered = allCards.filter(c => progress[c.id]?.learnStage !== 'mastered');
    const cardsToStudy = (modeParam === 'learn' && unmastered.length > 0 && !shouldReset) ? unmastered : allCards;
    const shuffled = settings.shuffleCards ? shuffleArray([...cardsToStudy]) : [...cardsToStudy];
    setStudyCards(shuffled);
    setCurrentIndex(0);
    setCorrectCount(0);
    setDone(false);
    setFcFlipped(false);
    const initialStageMap: Record<string, number> = {};
    let initialSteps = 0;
    let initialMastered = 0;
    if (modeParam === 'learn' && !shouldReset) {
      allCards.forEach(c => {
        const stageStr = progress[c.id]?.learnStage;
        if (stageStr === 'mastered') {
          initialStageMap[c.id] = LEARN_STAGES.length;
          initialSteps += LEARN_STAGES.length;
          initialMastered += 1;
        } else if (stageStr && stageStr !== 'unseen') {
          const step = LEARN_STAGES.indexOf(stageStr as any);
          if (step !== -1) {
            initialStageMap[c.id] = step;
            initialSteps += step;
          }
        }
      });
    }

    let restored = false;
    if (modeParam === 'learn') {
      if (shouldReset) {
        localStorage.removeItem(`vocab_learn_${deckId}`);
      } else {
        try {
          const savedStr = localStorage.getItem(`vocab_learn_${deckId}`);
        if (savedStr) {
          const saved = JSON.parse(savedStr);
          if (saved && typeof saved === 'object') {
            setLearnStageMap(saved.learnStageMap || initialStageMap);
            setLearnCorrect(saved.learnCorrect || initialMastered);
            setCorrectSteps(saved.correctSteps || initialSteps);
            setCurrentIndex((typeof saved.currentIndex === 'number' && saved.currentIndex < shuffled.length) ? saved.currentIndex : 0);
            restored = true;
          }
        }
      } catch (e) {}
      }
    }

    if (!restored) {
      setLearnStageMap(initialStageMap);
      setLearnCorrect(initialMastered);
      setCorrectSteps(initialSteps);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, modeParam]);

  useEffect(() => {
    if (modeParam !== 'learn' || allCards.length === 0 || !mounted) return;
    const shouldReset = searchParams.get('resetSession') === 'true';
    if (done || shouldReset) {
      try { localStorage.removeItem(`vocab_learn_${deckId}`); } catch(e) {}
    } else {
      try {
        localStorage.setItem(`vocab_learn_${deckId}`, JSON.stringify({
          learnStageMap,
          learnCorrect,
          correctSteps,
          currentIndex
        }));
      } catch(e) {}
    }
  }, [learnStageMap, learnCorrect, correctSteps, currentIndex, deckId, modeParam, allCards.length, done, mounted, searchParams]);

  useEffect(() => {
    if (!settings.showTimer) return;
    timerRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [settings.showTimer]);

  const finishSession = useCallback((correct: number, total: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCorrectCount(correct);
    setFinishing(true);
    setTimeout(() => {
      setDone(true);
      setFinishing(false);
    }, 1200);
    addSession({
      id: uuidv4(),
      deckId,
      mode: modeParam,
      startedAt: startTime.current,
      completedAt: Date.now(),
      totalCards: total,
      correctCount: correct,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    });
  }, [deckId, modeParam, addSession]);

  const handleRestart = () => {
    setDone(false);
    setCurrentIndex(0);
    setCorrectCount(0);
    setElapsedSecs(0);
    setFcFlipped(false);
    setLearnStageMap({});
    setLearnCorrect(0);
    setCorrectSteps(0);
    try { localStorage.removeItem(`vocab_learn_${deckId}`); } catch(e) {}
    startTime.current = Date.now();
    const unmastered = allCards.filter(c => progress[c.id]?.learnStage !== 'mastered');
    const cardsToStudy = (modeParam === 'learn' && unmastered.length > 0) ? unmastered : allCards;
    const shuffled = settings.shuffleCards ? shuffleArray([...cardsToStudy]) : [...cardsToStudy];
    setStudyCards(shuffled);
    if (settings.showTimer) {
      timerRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    }
  };

  const handleLearnAnswer = (isCorrect: boolean) => {
    const shouldReset = searchParams.get('resetSession') === 'true';
    const card = studyCards[currentIndex];
    const stageIdx = learnStageMap[card.id] ?? 0;

    if (isCorrect) {
      const nextStage = stageIdx + 1;
      const nowMastered = nextStage >= LEARN_STAGES.length;

      // Save to persistent store immediately, UNLESS we are in a review session
      if (!shouldReset) {
        if (nowMastered) {
          updateProgress(card.id, {
            learnStage: 'mastered',
            repetitions: (progress[card.id]?.repetitions ?? 0) + 1,
            lastAnswered: Date.now(),
          });
        } else {
          updateProgress(card.id, {
            learnStage: LEARN_STAGES[nextStage] || 'unseen',
            lastAnswered: Date.now(),
          });
        }
      }

      if (stageIdx < LEARN_STAGES.length) {
        setCorrectSteps(s => s + 1);
      }

      setLearnStageMap(prev => {
        const newMap = { ...prev, [card.id]: nextStage };
        const totalMastered = allCards.filter(c => (newMap[c.id] ?? 0) >= LEARN_STAGES.length).length;

        if (totalMastered >= allCards.length) {
          // All done — finish session
          setLearnCorrect(totalMastered);
          finishSession(totalMastered, allCards.length);
          if (modeParam === 'learn') markDeckCompleted(deckId);
          return newMap;
        }

        // Advance to next unmastered card
        let nextIdx = (currentIndex + 1) % studyCards.length;
        let loopCount = 0;
        while ((newMap[studyCards[nextIdx].id] ?? 0) >= LEARN_STAGES.length && loopCount < studyCards.length) {
          nextIdx = (nextIdx + 1) % studyCards.length;
          loopCount++;
        }
        setLearnCorrect(totalMastered);
        setCurrentIndex(nextIdx);
        return newMap;
      });
    } else {
      // Wrong answer — KHÔNG trừ % và KHÔNG lùi stage.
      // Giữ nguyên correctSteps (thanh % không giảm).
      // Thẻ giữ nguyên stage hiện tại, chuyển sang thẻ tiếp theo.
      // Thẻ sẽ xuất hiện lại vì chưa mastered, và khi trả lời đúng sẽ cộng thêm %.
      if (!shouldReset) {
        updateProgress(card.id, {
          lastAnswered: Date.now(),
        });
      }
      // Không thay đổi learnStageMap — giữ nguyên stage của thẻ
      setCurrentIndex(prev => {
        let nextIdx = (currentIndex + 1) % studyCards.length;
        let loopCount = 0;
        // Bỏ qua các thẻ đã mastered
        while ((learnStageMap[studyCards[nextIdx].id] ?? 0) >= LEARN_STAGES.length && loopCount < studyCards.length) {
          nextIdx = (nextIdx + 1) % studyCards.length;
          loopCount++;
        }
        return nextIdx;
      });
    }
  };

  // Test/MCQ handler
  const handleTestAnswer = (isCorrect: boolean) => {
    const nc = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(nc);
    if (currentIndex + 1 >= studyCards.length) {
      finishSession(nc, studyCards.length);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  if (!mounted || !isHydrated) return <LoadingScreen />;

  const modeLabels: Record<StudyMode, string> = {
    flashcard: 'Thẻ ghi nhớ',
    learn: 'Học',
    match: 'Ghép thẻ',
    gravity: 'Gravity',
    test: 'Kiểm tra',
    conversation: 'Luyện viết Task 2',
    listening: 'Luyện nghe',
    reading: 'Luyện đọc'
  };

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Link href="/" className="btn-primary"><ArrowLeft size={16} /> Về trang chủ</Link>
      </div>
    );
  }

  const currentCard = studyCards[currentIndex];

  return (
    <div className={`flex flex-col gap-4 mx-auto animate-fade-in ${modeParam === 'reading' ? 'max-w-7xl w-full px-4' : 'max-w-3xl w-full'}`}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[var(--text)] truncate">{modeLabels[modeParam]}</h1>
          <p className="text-xs text-[var(--text-muted)] truncate">{deck.name}</p>
        </div>
        {settings.showTimer && !['flashcard', 'learn'].includes(modeParam) && (
          <div className="flex items-center gap-1.5 text-sm font-mono font-semibold text-[var(--text-muted)] flex-shrink-0">
            <TimerIcon size={14} /> {elapsedSecs}s
          </div>
        )}
      </div>

      {/* ── Done Screen ────────────────────────────────── */}
      {done && (
        <ResultScreen
          totalCards={studyCards.length}
          correctCount={correctCount}
          mode={modeParam}
          deckId={deckId}
          timeSeconds={elapsedSecs}
          onRestart={handleRestart}
        />
      )}

      {/* ── Flashcard Mode ─────────────────────────────── */}
      {!done && modeParam === 'flashcard' && studyCards.length > 0 && currentCard && (
        <div className="flex flex-col gap-4 relative">
          {finishing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm rounded-3xl animate-fade-in">
              <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-2xl flex items-center gap-3 animate-slide-up">
                <Check size={28} /> Hoàn thành! 🎉
              </div>
            </div>
          )}
          <ProgressBar current={currentIndex + (finishing ? 1 : 0)} total={studyCards.length} label={`${Math.min(currentIndex + 1 + (finishing ? 1 : 0), studyCards.length)} / ${studyCards.length}`} />
          <FlashCard
            card={currentCard}
            flipped={fcFlipped}
            onFlip={() => setFcFlipped(f => !f)}
            showSide={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
          />
          <FlashCardNav
            current={currentIndex}
            total={studyCards.length}
            onPrev={() => { setCurrentIndex(i => Math.max(0, i - 1)); setFcFlipped(false); }}
            onNext={() => {
              setFcFlipped(false);
              if (currentIndex + 1 >= studyCards.length) {
                finishSession(studyCards.length, studyCards.length);
              } else {
                setCurrentIndex(i => i + 1);
              }
            }}
            onReset={() => { setCurrentIndex(0); setFcFlipped(false); }}
          />
        </div>
      )}

      {/* ── Learn Mode ─────────────────────────────────── */}
      {!done && modeParam === 'learn' && studyCards.length > 0 && currentCard && (
        <div className="flex flex-col gap-4 relative">
          {finishing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm rounded-3xl animate-fade-in">
              <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-2xl flex items-center gap-3 animate-slide-up">
                <Check size={28} /> Hoàn thành!
              </div>
            </div>
          )}
          {/* Realtime: correctSteps / (N * 4), label show mastered count */}
          <ProgressBar
            current={correctSteps}
            total={allCards.length * LEARN_STAGES.length}
            label={`Đã thuộc: ${learnCorrect} / ${allCards.length}`}
          />
          {(() => {
            const stageIdx = Math.min(learnStageMap[currentCard.id] ?? 0, LEARN_STAGES.length - 1);
            const stage = LEARN_STAGES[stageIdx];
            const isType = stage?.startsWith('type') ?? false;
            return isType ? (
              <TypeAnswer
                key={`${currentCard.id}-${stageIdx}`}
                card={currentCard}
                questionField={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
                answerField={settings.answerLanguage === 'definition' ? 'definition' : 'term'}
                onAnswer={handleLearnAnswer}
              />
            ) : (
              <MultipleChoice
                key={`${currentCard.id}-${stageIdx}`}
                card={currentCard}
                allCards={allCards}
                questionField={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
                answerField={settings.answerLanguage === 'definition' ? 'definition' : 'term'}
                onAnswer={handleLearnAnswer}
              />
            );
          })()}
        </div>
      )}

      {/* ── Test Mode ──────────────────────────────────── */}
      {!done && modeParam === 'test' && studyCards.length > 0 && currentCard && (
        <div className="flex flex-col gap-4 relative">
          {finishing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm rounded-3xl animate-fade-in">
              <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-2xl flex items-center gap-3 animate-slide-up">
                <Check size={28} /> Hoàn thành! 🎉
              </div>
            </div>
          )}
          <ProgressBar current={currentIndex + (finishing ? 1 : 0)} total={studyCards.length} label={`${Math.min(currentIndex + 1 + (finishing ? 1 : 0), studyCards.length)} / ${studyCards.length}`} />
          <MultipleChoice
            card={currentCard}
            allCards={allCards}
            questionField={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
            answerField={settings.answerLanguage === 'definition' ? 'definition' : 'term'}
            onAnswer={handleTestAnswer}
          />
        </div>
      )}

      {/* ── Match Game ─────────────────────────────────── */}
      {!done && modeParam === 'match' && (
        <MatchGame
          cards={allCards.slice(0, 8)}
          onComplete={(correct, elapsed) => finishSession(correct, Math.min(8, allCards.length))}
        />
      )}

      {/* ── Gravity Mode ───────────────────────────────── */}
      {!done && modeParam === 'gravity' && (
        <GravityGame
          cards={allCards}
          onComplete={(correct, total) => finishSession(correct, total)}
        />
      )}

      {/* ── Conversation Mode ──────────────────────────── */}
      {!done && modeParam === 'conversation' && (
        <ConversationPractice
          cards={allCards}
          onComplete={(correct, total) => finishSession(correct, total)}
        />
      )}

      {/* ── Listening Mode ──────────────────────────── */}
      {!done && modeParam === 'listening' && (
        <ListeningPractice
          cards={allCards}
          onComplete={(correct: number, total: number) => finishSession(correct, total)}
        />
      )}

      {/* ── Reading Mode ──────────────────────────── */}
      {!done && modeParam === 'reading' && (
        <ReadingPractice
          cards={allCards}
          onComplete={(correct: number, total: number) => finishSession(correct, total)}
        />
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-[var(--text-muted)]">Đang tải...</div>}>
      <LearnContent />
    </Suspense>
  );
}
