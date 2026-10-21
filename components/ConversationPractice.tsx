import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Loader2, ArrowRight, Check, X, Type, Sparkles, AlertCircle, TrendingUp, MessageSquare, RotateCcw, BookOpen, Save } from 'lucide-react';
import type { Card } from '@/lib/types';
import { ProgressBar } from './ProgressBar';
import { useStore } from '@/lib/store';

type ConversationItem =
  | { type: 'repeat_sentence'; speaker: string; text: string }
  | { type: 'translate_typing'; vietnamese: string; expectedEnglish: string; task2Prompt?: string; argument?: string };

interface GrammarError {
  original: string;
  correction: string;
  explanation: string;
}

interface VocabTip {
  studentWord: string;
  betterAlternative: string;
  reason: string;
}

interface TranslationAnalysis {
  score: number;
  grammarErrors: GrammarError[];
  vocabularyTips: VocabTip[];
  structureFeedback: string;
  correctedSentence: string;
}

interface ConversationPracticeProps {
  cards: Card[];
  onComplete: (correct: number, total: number) => void;
}

const PASS_THRESHOLD = 70; // minimum score to move on

export function ConversationPractice({ cards, onComplete }: ConversationPracticeProps) {
  const { createWritingSample } = useStore();
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // States for translate_typing
  const [translationInput, setTranslationInput] = useState('');
  const [translationChecked, setTranslationChecked] = useState(false);
  const [isTranslationCorrect, setIsTranslationCorrect] = useState(false);
  const [analysis, setAnalysis] = useState<TranslationAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);   // retry counter
  const [savedToWriting, setSavedToWriting] = useState(false); // per-sentence save state

  // Shared
  const [correctCount, setCorrectCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchExercises = useCallback(() => {
    if (!cards || cards.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const words = cards.map(c => c.term);

    fetch('/api/ai/generate-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words })
    })
      .then(async res => {
        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          if (!res.ok) {
            throw new Error(`Máy chủ phản hồi lỗi (Mã ${res.status}): ${text.slice(0, 150)}`);
          }
          throw new Error('Dữ liệu AI trả về không đúng định dạng JSON.');
        }

        if (!res.ok || data.error) {
          throw new Error(data.error || `Lỗi từ AI (Mã ${res.status})`);
        }

        if (data.conversation && Array.isArray(data.conversation) && data.conversation.length > 0) {
          setConversation(data.conversation);
        } else {
          throw new Error('AI không tạo được bài tập nào phù hợp từ danh sách từ vựng.');
        }
      })
      .catch(err => {
        console.error('Error generating conversation:', err);
        setErrorMsg(err.message || 'Lỗi kết nối khi tạo bài tập.');
        setConversation([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [cards]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Gọi AI phân tích bản dịch
  const analyzeTranslation = async (userText: string, item: Extract<ConversationItem, { type: 'translate_typing' }>) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/ai/analyze-translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTranslation: userText,
          expectedEnglish: item.expectedEnglish,
          vietnameseSentence: item.vietnamese,
        }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Lỗi phản hồi từ máy chủ (HTTP ${res.status})`);
      }
      if (!res.ok || data.error) {
        alert(data.error || 'Lỗi khi phân tích bản dịch.');
      } else {
        setAnalysis(data);
        setIsTranslationCorrect((data.score ?? 0) >= PASS_THRESHOLD);
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      alert(err.message || 'Lỗi kết nối khi phân tích câu trả lời.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkTranslation = () => {
    const item = conversation[currentIdx];
    if (item.type !== 'translate_typing') return;
    setTranslationChecked(true);
    setAttemptCount(prev => prev + 1);
    analyzeTranslation(translationInput, item);
  };

  // Retry: clear input & analysis, allow re-attempt
  const retryTranslation = () => {
    setTranslationInput('');
    setTranslationChecked(false);
    setAnalysis(null);
    setIsTranslationCorrect(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const nextItem = () => {
    const item = conversation[currentIdx];
    let wasCorrect = false;
    if (item.type === 'translate_typing') {
      wasCorrect = isTranslationCorrect;
    }
    if (wasCorrect) setCorrectCount(c => c + 1);

    // Reset per-item state
    setTranslationInput('');
    setTranslationChecked(false);
    setIsTranslationCorrect(false);
    setAnalysis(null);
    setAttemptCount(0);
    setSavedToWriting(false);

    if (currentIdx + 1 < conversation.length) {
      setCurrentIdx(i => i + 1);
    } else {
      onComplete(correctCount + (wasCorrect ? 1 : 0), conversation.length);
    }
  };

  // Save this sentence to Writing Samples
  const handleSaveToWriting = useCallback(() => {
    const item = conversation[currentIdx];
    if (item.type !== 'translate_typing') return;
    const savedSentence = analysis?.correctedSentence || translationInput;
    const topic = item.task2Prompt || 'IELTS Writing Task 2 Practice';
    const argument = item.argument || '';

    createWritingSample({
      task: 'task2',
      title: `[Luyện viết] ${topic.slice(0, 60)}${topic.length > 60 ? '...' : ''}`,
      topic,
      content: `[${argument}]\n\nCâu của bạn:\n${translationInput}\n\nCâu đã sửa:\n${savedSentence}`,
      tags: ['from_practice', 'task2_sentence'],
    });
    setSavedToWriting(true);
  }, [conversation, currentIdx, analysis, translationInput, createWritingSample]);

  const speak = (text: string) => {
    const url = `/api/tts?text=${encodeURIComponent(text)}&v=2`;
    const audio = new Audio(url);
    audio.play().catch(e => console.error('Audio play failed:', e));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= PASS_THRESHOLD) return 'text-amber-600';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-green-400';
    if (score >= PASS_THRESHOLD) return 'from-amber-500 to-yellow-400';
    return 'from-red-500 to-rose-400';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        <p className="text-[var(--text-muted)] text-sm font-medium">AI đang soạn bài tập viết Task 2 của bạn...</p>
      </div>
    );
  }

  if (errorMsg || conversation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <AlertCircle size={28} />
        </div>
        <h3 className="font-bold text-lg text-[var(--text)]">Không thể tạo bài luyện viết Task 2</h3>
        <p className="text-sm text-[var(--text-muted)] max-w-md">
          {errorMsg || 'Bộ từ vựng cần có ít nhất 1 từ để AI có thể tạo bài tập.'}
        </p>
        <button
          onClick={fetchExercises}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <RotateCcw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  const currentItem = conversation[currentIdx];
  if (currentItem.type !== 'translate_typing') {
    return <div className="text-center py-10 text-[var(--text-muted)]">Loại bài tập không hỗ trợ.</div>;
  }

  // Detect topic number (1 or 2) for display
  const promptList = Array.from(new Set(
    (conversation.filter(i => i.type === 'translate_typing') as Extract<ConversationItem, { type: 'translate_typing' }>[])
      .map(i => i.task2Prompt)
  ));
  const topicNum = currentItem.task2Prompt
    ? (promptList.indexOf(currentItem.task2Prompt) + 1)
    : 1;

  return (
    <div className="flex flex-col gap-5 bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm animate-fade-in">
      <ProgressBar current={currentIdx} total={conversation.length} label={`Câu ${currentIdx + 1}/${conversation.length} · Đề ${topicNum}/2`} />

      {/* ── Task 2 Context ─────────────────────────────── */}
      {currentItem.task2Prompt && (
        <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-light)] p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md">
              📋 Task 2 — Đề {topicNum}
            </span>
            {currentItem.argument && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md ml-auto">
                💡 {currentItem.argument}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text)] leading-relaxed font-medium">
            {currentItem.task2Prompt}
          </p>
        </div>
      )}

      {/* ── Vietnamese sentence to translate ──────────── */}
      <div>
        <h3 className="font-bold text-[var(--text-muted)] mb-2 flex items-center gap-2 text-sm">
          <Type size={16} className="text-blue-500" /> Dịch câu sau sang tiếng Anh (Band 7+):
        </h3>
        <p className="text-lg font-semibold text-[var(--text)] bg-blue-50 p-4 rounded-xl border border-blue-200 leading-relaxed">
          {currentItem.vietnamese}
        </p>
        {attemptCount > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-1.5 ml-1">
            Lần thử: <span className="font-bold text-[var(--text)]">{attemptCount}</span>
          </p>
        )}
      </div>

      {/* ── Translation input ──────────────────────────── */}
      <div>
        <textarea
          ref={textareaRef}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] resize-none h-28 transition-all"
          placeholder="Gõ bản dịch tiếng Anh của bạn vào đây... (Ctrl+Enter để kiểm tra)"
          value={translationInput}
          onChange={e => setTranslationInput(e.target.value)}
          disabled={translationChecked}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !translationChecked && translationInput.trim()) {
              checkTranslation();
            }
          }}
        />
        {!translationChecked && (
          <p className="text-xs text-[var(--text-muted)] mt-1 ml-1">Ctrl+Enter để kiểm tra nhanh</p>
        )}
      </div>

      {/* ── AI Analysis Result ─────────────────────────── */}
      {translationChecked && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Loading */}
          {isAnalyzing && (
            <div className="flex items-center gap-3 p-4 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
              <Loader2 size={20} className="animate-spin text-[var(--primary)] flex-shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text)] text-sm">AI đang phân tích bài dịch của bạn...</p>
                <p className="text-xs text-[var(--text-muted)]">Đang kiểm tra ngữ pháp, từ vựng và cấu trúc câu</p>
              </div>
            </div>
          )}

          {/* Result */}
          {analysis && !isAnalyzing && (
            <div className="flex flex-col gap-4">
              {/* Score header */}
              <div className={`flex items-center gap-4 p-4 rounded-2xl text-white bg-gradient-to-r ${getScoreBg(analysis.score)}`}>
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-black leading-none">{analysis.score}</span>
                  <span className="text-xs font-semibold opacity-80">/ 100</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">
                    {analysis.score >= 80 ? '🎉 Xuất sắc!' : analysis.score >= PASS_THRESHOLD ? '👍 Đạt yêu cầu!' : '❌ Chưa đạt — Cần viết lại!'}
                  </p>
                  <p className="text-sm opacity-90 leading-relaxed mt-0.5">{analysis.structureFeedback}</p>
                  {analysis.score < PASS_THRESHOLD && (
                    <p className="text-xs opacity-80 mt-1 font-semibold">
                      ⚠️ Cần đạt ít nhất {PASS_THRESHOLD}/100 mới được qua câu tiếp theo.
                    </p>
                  )}
                </div>
              </div>

              {/* Corrected sentence */}
              {analysis.correctedSentence && analysis.correctedSentence.trim() !== translationInput.trim() && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Câu đúng hoàn chỉnh</span>
                    <button
                      onClick={() => speak(analysis.correctedSentence)}
                      className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">{analysis.correctedSentence}</p>
                </div>
              )}

              {/* Grammar errors */}
              {analysis.grammarErrors?.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">Lỗi ngữ pháp ({analysis.grammarErrors.length})</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {analysis.grammarErrors.map((err, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-mono line-through decoration-red-400">{err.original}</span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded font-mono font-semibold">{err.correction}</span>
                        </div>
                        <p className="text-[var(--text-muted)] mt-1 ml-1">{err.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vocabulary tips */}
              {analysis.vocabularyTips?.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Cải thiện từ vựng</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {analysis.vocabularyTips.map((tip, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded font-medium">{tip.studentWord}</span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded font-semibold">{tip.betterAlternative}</span>
                        </div>
                        <p className="text-[var(--text-muted)] mt-1 ml-1">{tip.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expected answer reference */}
              <div className="p-4 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Đáp án gợi ý từ AI</span>
                  <button
                    onClick={() => speak(currentItem.expectedEnglish)}
                    className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
                <p className="text-[var(--text)] text-sm leading-relaxed">{currentItem.expectedEnglish}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons ─────────────────────────────── */}
      <div className="flex flex-col gap-2 mt-2">
        {!translationChecked ? (
          <button
            onClick={checkTranslation}
            disabled={!translationInput.trim()}
            className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={16} /> Phân tích bài dịch
          </button>
        ) : (
          <>
            {/* While AI is analyzing — buttons hidden, loading indicator shown above */}
            {isAnalyzing && null}

            {/* After analysis is done */}
            {analysis && !isAnalyzing && (
              <>
                {/* Save to Writing — always available after analysis */}
                <button
                  onClick={handleSaveToWriting}
                  disabled={savedToWriting}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-60"
                  style={{
                    background: savedToWriting ? 'var(--success-light)' : 'transparent',
                    color: savedToWriting ? 'var(--success)' : 'var(--text-muted)',
                    borderColor: savedToWriting ? 'var(--success)' : 'var(--border)',
                  }}
                >
                  {savedToWriting ? <><Check size={15} /> Đã lưu vào Bài mẫu Writing</> : <><Save size={15} /> Lưu câu này vào Bài mẫu Writing</>}
                </button>

                {/* Score < 70: must retry */}
                {!isTranslationCorrect && (
                  <button
                    onClick={retryTranslation}
                    className="flex items-center justify-center gap-2 btn-secondary w-full py-3"
                  >
                    <RotateCcw size={16} /> Viết lại câu này (chưa đạt {PASS_THRESHOLD}/100)
                  </button>
                )}

                {/* Score >= 70: can proceed */}
                {isTranslationCorrect && (
                  <button
                    onClick={nextItem}
                    className="btn-primary w-full py-3"
                  >
                    {currentIdx + 1 >= conversation.length ? 'Hoàn thành 🎉' : 'Câu tiếp theo'} <ArrowRight size={18} />
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
