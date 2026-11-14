'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Plus, BookOpen, Folder, TrendingUp, Target,
  CreditCard, Layers, Brain, PenLine, PenTool, BarChart2,
  Shuffle, Droplets, ChevronRight, Zap, Clock,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { decks, cardsByDeck, progress, folders, sessions, settings, isHydrated, studyHoursGoals, studyHoursLogs } = useStore();
  const { data: session, status } = useSession();

  useEffect(() => { setMounted(true); }, []);

  const deckList = Object.values(decks).sort((a, b) => b.createdAt - a.createdAt);
  const folderList = Object.values(folders).sort((a, b) => b.updatedAt - a.updatedAt);

  const totalCards = deckList.reduce((s, d) => s + d.cardCount, 0);
  const masteredCards = Object.values(progress).filter((p) => p.learnStage === 'mastered').length;

  const recentDecks = [...deckList]
    .sort((a, b) => (b.lastStudied || b.createdAt) - (a.lastStudied || a.createdAt))
    .slice(0, 4);

  const todayStudied = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    const pastDecks = new Set(
      sessions.filter(s => s.startedAt < todayTime).map(s => s.deckId)
    );

    const seenToday = new Set<string>();
    let total = 0;
    
    sessions
      .filter(s => s.startedAt >= todayTime)
      .sort((a, b) => a.startedAt - b.startedAt)
      .forEach(s => {
        if (!pastDecks.has(s.deckId) && !seenToday.has(s.deckId)) {
          seenToday.add(s.deckId);
          total += s.correctCount;
        }
      });
    return total;
  })();

  const dailyGoalPct = Math.min(100, Math.round((todayStudied / (settings.dailyGoal || 20)) * 100));

  // Last 7 days vocab progress
  const today = new Date();
  today.setHours(0,0,0,0);
  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.getTime();
  });
  
  const vocabChartData = last7Days.map(timestamp => {
    const endOfDay = timestamp + 86400000;
    const studiedCount = sessions.filter(s => s.startedAt >= timestamp && s.startedAt < endOfDay).reduce((acc, curr) => acc + (curr.correctCount || 0), 0);
    const dateLabel = new Date(timestamp).toLocaleDateString('vi-VN', { weekday: 'short' });
    return { label: dateLabel, value: studiedCount };
  });
  const maxVocab = Math.max(...vocabChartData.map(d => d.value), 10);

  // Study hours
  const totalStudyMinutes = Object.values(studyHoursLogs || {}).reduce((acc, curr) => acc + curr.minutes, 0);
  const totalTargetHours = Object.values(studyHoursGoals || {}).reduce((acc, curr) => acc + curr.targetHours, 0) || 100;
  const studyHoursPct = Math.min(100, Math.round((totalStudyMinutes / 60 / totalTargetHours) * 100));

  const studyModes = [
    { icon: <Layers size={16} />, label: 'Thẻ ghi nhớ', desc: 'Lật thẻ 3D', href: '/library' },
    { icon: <Brain size={16} />, label: 'Học', desc: 'MCQ + Gõ từ', href: '/library' },
    { icon: <PenLine size={16} />, label: 'Kiểm tra', desc: 'Bài thi tổng hợp', href: '/library' },
    { icon: <Shuffle size={16} />, label: 'Ghép thẻ', desc: 'Match game', href: '/library' },
    { icon: <Droplets size={16} />, label: 'Gravity', desc: 'Từ rơi xuống', href: '/library' },
  ];



  // ── Loading State ───────────────────────────────────────────────────────────
  if (status === 'loading' || (status === 'authenticated' && !isHydrated)) {
    return <LoadingScreen />;
  }

  // ── Empty State ─────────────────────────────────────────────────────────────
  if (deckList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-10 animate-fade-in">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto mb-6">
            <BookOpen size={28} />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-3 tracking-tight">
            Chào mừng đến Quizlu
          </h1>
          <p className="text-[var(--text-muted)] text-base leading-relaxed">
            Học từ vựng IELTS thông minh với spaced repetition và nhiều chế độ luyện tập.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/create-set" className="btn-primary px-5 py-2.5 text-sm">
            <Plus size={16} /> Tạo học phần đầu tiên
          </Link>
        </div>

        {/* Mode preview */}
        <div className="w-full max-w-lg flex flex-col gap-2 mt-2">
          <p className="section-title mb-2 text-center">Các chế độ học</p>
          {studyModes.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-3 px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center flex-shrink-0">
                {m.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{m.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 animate-fade-in">

      {/* ── Greeting ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text)] tracking-tight mb-2">
            {settings.userName ? `Chào mừng trở lại, ${settings.userName}` : 'Trang chủ'}
          </h1>
          <p className="text-[var(--text-muted)] text-sm font-medium">
            {deckList.length} học phần &nbsp;·&nbsp; {totalCards.toLocaleString()} thẻ &nbsp;·&nbsp; {masteredCards.toLocaleString()} đã thuộc
          </p>
        </div>

        {/* Daily Goal pill */}
        <div className="flex items-center gap-3 bg-[var(--card)] border-none rounded-xl px-4 py-3 min-w-[220px] shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center flex-shrink-0">
            <Target size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[var(--text)]">Mục tiêu hôm nay</span>
              <span className="text-xs font-bold text-[var(--primary)]">
                {todayStudied}/{settings.dailyGoal}
              </span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${dailyGoalPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BookOpen size={15} />, label: 'Học phần', value: deckList.length },
          { icon: <CreditCard size={15} />, label: 'Tổng thẻ', value: totalCards },
          { icon: <Zap size={15} />, label: 'Đã thuộc', value: masteredCards },
          { icon: <TrendingUp size={15} />, label: 'Hôm nay', value: todayStudied },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="text-[var(--text-muted)] mb-1">{stat.icon}</div>
            <div className="stat-card-value">{stat.value.toLocaleString()}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── IELTS AI Progress & Analytics ────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vocab Chart */}
        <div className="bg-[var(--card)] rounded-2xl p-5 shadow-sm border border-[var(--border)] col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text)] tracking-tight">Từ vựng (7 ngày qua)</h2>
              <p className="text-xs text-[var(--text-muted)]">Số thẻ đã ôn tập</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="h-32 flex items-end justify-between gap-2 mt-4 pt-2 border-t border-dashed border-[var(--border)]">
            {vocabChartData.map((d, idx) => {
              const hPct = Math.round((d.value / maxVocab) * 100);
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <div className="w-full relative flex items-end justify-center h-24 rounded-t-sm hover:bg-[var(--bg)] transition-colors">
                    <div 
                      className="w-full max-w-[24px] bg-[var(--primary)] rounded-t-sm transition-all duration-500 group-hover:bg-[var(--primary-hover)]"
                      style={{ height: `${hPct}%` }}
                    />
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-bold bg-gray-800 text-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-10 transition-opacity">
                      {d.value} thẻ
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] mt-1 truncate w-full text-center">{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* IELTS Writing & Goals */}
        <div className="flex flex-col gap-4 col-span-1">
          <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-emerald-600 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1">
                Luyện Writing theo Body
              </p>
              <h2 className="text-base font-extrabold text-white">IELTS Task 1 &amp; Task 2</h2>
              <p className="text-xs text-white/85 mt-1 leading-relaxed">
                Dàn ý Band 8.0+ tiếng Việt, chấm 4 tiêu chí 8/8/7/7 và tự viết lại toàn bài hoàn chỉnh.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/task1-practice"
                className="flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-1.5"><BarChart2 size={14} /> Task 1</span>
                <ChevronRight size={12} />
              </Link>
              <Link
                href="/task2-practice"
                className="flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-1.5"><PenTool size={14} /> Task 2</span>
                <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-2xl p-4 shadow-sm border border-[var(--border)] flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">Giờ học mục tiêu</h2>
              <Clock size={14} className="text-orange-500" />
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-black text-[var(--text)]">{(totalStudyMinutes/60).toFixed(1)}</span>
              <span className="text-xs font-semibold text-[var(--text-muted)] mb-1">/ {totalTargetHours}h</span>
            </div>
            <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${studyHoursPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Recent Study Sets ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text)] tracking-tight">Học phần gần đây</h2>
          <Link href="/library" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-0.5 font-medium">
            Xem tất cả <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recentDecks.map((deck) => {
            const cardIds = cardsByDeck[deck.id] ?? [];
            const mastered = cardIds.filter((id) => progress[id]?.learnStage === 'mastered').length;
            const pct = deck.cardCount > 0 ? Math.round((mastered / deck.cardCount) * 100) : 0;

            return (
              <Link
                key={deck.id}
                href={`/study/${deck.id}`}
                className="bg-[var(--card)] border-none rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <span className="text-xs font-semibold text-[var(--primary)]">{pct}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text)] text-sm truncate group-hover:text-[var(--primary)] transition-colors leading-snug">
                    {deck.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{deck.cardCount} thẻ · {mastered} thuộc</p>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-center py-2.5 mt-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-blue-500 text-white text-sm font-bold shadow-sm group-hover:shadow-[var(--shadow-primary)] transition-shadow">
                  {deck.lastStudied ? 'Tiếp tục học' : 'Bắt đầu học'}
                </div>
              </Link>
            );
          })}

          {/* Add new deck */}
          <Link
            href="/create-set"
            className="flex flex-col items-center justify-center gap-3 p-5 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--bg)] group-hover:bg-white flex items-center justify-center">
              <Plus size={24} />
            </div>
            <span className="text-sm font-semibold">Tạo học phần</span>
          </Link>
        </div>
      </section>

      {/* ── Folders ────────────────────────────────────────────────────────── */}
      {folderList.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--text)] tracking-tight">Thư mục</h2>
            <Link href="/library?tab=folders" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-0.5 font-medium">
              Xem tất cả <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folderList.slice(0, 3).map((folder) => (
              <Link key={folder.id} href={`/folder/${folder.id}`} className="folder-card">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center flex-shrink-0">
                  <Folder size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text)] text-sm truncate">{folder.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{folder.deckIds.length} học phần</p>
                </div>
                <ChevronRight size={15} className="text-[var(--text-muted)] flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}


    </div>
  );
}
