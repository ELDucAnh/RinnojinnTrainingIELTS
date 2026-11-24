'use client';
import { useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import {
  Brain, Zap, Shuffle, Layers, ChevronDown,
  BookOpen, Target, TrendingUp, Star, Play, Clock, Users, Award
} from 'lucide-react';

// ── Scroll Reveal Hook ──────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = () => {
        start += Math.ceil((to - start) / 12);
        if (el) el.textContent = start.toLocaleString('vi') + suffix;
        if (start < to) requestAnimationFrame(step);
        else if (el) el.textContent = to.toLocaleString('vi') + suffix;
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

// ── Study Mode Cards (carousel) ─────────────────────────────────────────────
const modeCards = [
  { icon: <Layers size={22} />, label: 'Thẻ ghi nhớ', desc: 'Lật thẻ 3D mượt mà', color: 'from-blue-500 to-indigo-600' },
  { icon: <Brain size={22} />, label: 'Chế độ Học', desc: 'MCQ + Gõ từ thông minh', color: 'from-violet-500 to-purple-600' },
  { icon: <Shuffle size={22} />, label: 'Ghép thẻ', desc: 'Match game hấp dẫn', color: 'from-pink-500 to-rose-600' },
  { icon: <Zap size={22} />, label: 'Gravity', desc: 'Từ rơi, gõ nhanh tay', color: 'from-amber-500 to-orange-600' },
  { icon: <BookOpen size={22} />, label: 'Kiểm tra', desc: 'Bài thi tổng hợp', color: 'from-emerald-500 to-teal-600' },
  { icon: <Target size={22} />, label: 'Mục tiêu', desc: 'Lên lịch học mỗi ngày', color: 'from-cyan-500 to-sky-600' },
];

// ── Main Landing Page ───────────────────────────────────────────────────────
export function LandingPage() {
  useScrollReveal();

  return (
    <div className="landing-root min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ══════════ SECTION 1: HERO ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-20">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="blob-1 absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, #C7D2FE, transparent 70%)' }}
          />
          <div
            className="blob-2 absolute top-1/4 -right-48 w-[700px] h-[700px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #DDD6FE, transparent 70%)' }}
          />
          <div
            className="blob-3 absolute -bottom-48 left-1/3 w-[500px] h-[500px] rounded-full opacity-35"
            style={{ background: 'radial-gradient(circle, #BAE6FD, transparent 70%)' }}
          />
          {/* Grid dots */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, #4255FF 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="animate-slide-up-1 mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-semibold" style={{ color: '#4255FF' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            ✦ Nền tảng học từ vựng IELTS thế hệ mới
          </div>

          {/* Headline */}
          <h1 className="animate-slide-up-2 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-none">
            <span style={{ color: 'var(--text)' }}>Làm chủ từ vựng</span>
            <br />
            <span className="gradient-text-primary">IELTS nhanh</span>
            <br />
            <span style={{ color: 'var(--text)' }}>gấp </span>
            <span className="gradient-text-blue">3 lần</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-slide-up-3 max-w-2xl text-lg md:text-xl leading-relaxed mb-10" style={{ color: 'var(--text-muted)' }}>
            Kết hợp thuật toán <strong style={{ color: 'var(--text)' }}>Spaced Repetition</strong> khoa học với các trò chơi tương tác cuốn hút.
            Học ít hơn, nhớ lâu hơn, đạt band cao hơn!
          </p>

          {/* CTAs */}
          <div className="animate-slide-up-4 flex flex-col sm:flex-row items-center gap-4 mb-16">
            <button
              onClick={() => signIn('google')}
              className="btn-shimmer flex items-center gap-3 px-8 py-4 text-lg shadow-2xl"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Bắt đầu miễn phí
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-6 py-4 text-base font-semibold rounded-full border-2 transition-all hover:scale-105"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <Play size={16} /> Xem tính năng
            </button>
          </div>

          {/* Floating UI preview cards */}
          <div className="animate-slide-up-5 relative w-full max-w-2xl h-48 hidden md:block">
            <div className="animate-float-1 absolute left-4 top-0 glass-card rounded-2xl px-5 py-4 shadow-xl" style={{ '--rotate': '-3deg' } as React.CSSProperties}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #4255FF, #7C3AED)' }}><Star size={16} /></div>
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Streaks</span>
              </div>
              <p className="text-3xl font-black gradient-text-primary">🔥 14 ngày</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Liên tiếp không nghỉ!</p>
            </div>
            <div className="animate-float-2 absolute left-1/2 -translate-x-1/2 top-4 glass-card rounded-2xl px-6 py-5 shadow-2xl">
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Từ vựng hôm nay</p>
              <p className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>ephemeral</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ngắn ngủi, thoáng qua</p>
              <div className="flex gap-2 mt-3">
                <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: '#DCFCE7', color: '#16A34A' }}>✓ Thuộc</span>
                <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>+10 XP</span>
              </div>
            </div>
            <div className="animate-float-3 absolute right-4 top-2 glass-card rounded-2xl px-5 py-4 shadow-xl" style={{ '--rotate': '3deg' } as React.CSSProperties}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Tiến độ học</p>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} style={{ color: '#10B981' }} />
                <span className="text-2xl font-black" style={{ color: '#10B981' }}>78%</span>
              </div>
              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: '78%', background: 'linear-gradient(90deg, #10B981, #059669)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll down indicator */}
        <button
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          className="animate-bounce-down absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 hover:opacity-80 transition-opacity"
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cuộn xuống</span>
          <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
        </button>
      </section>

      {/* ══════════ SECTION 2: FEATURES ═════════════════════════════════════ */}
      <section id="features" className="py-28 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ background: 'var(--gradient-accent)' }}
        />
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="scroll-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-semibold" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              ✦ Tính năng nổi bật
            </div>
            <h2 className="scroll-reveal scroll-reveal-delay-1 text-4xl md:text-5xl font-black mb-5" style={{ color: 'var(--text)' }}>
              Học thông minh hơn,<br />
              <span className="gradient-text-primary">không phải chăm chỉ hơn</span>
            </h2>
            <p className="scroll-reveal scroll-reveal-delay-2 max-w-2xl mx-auto text-lg" style={{ color: 'var(--text-muted)' }}>
              Mọi tính năng đều được thiết kế để giúp bạn ghi nhớ từ vựng hiệu quả nhất theo khoa học thần kinh học.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap size={28} />,
                color: 'from-amber-400 to-orange-500',
                title: 'Học thông minh',
                desc: 'Thuật toán SM-2 tính toán điểm rơi trí nhớ, nhắc lại từ vựng đúng lúc bạn sắp quên. Chỉ học những gì cần thiết!',
                delay: '',
              },
              {
                icon: <Shuffle size={28} />,
                color: 'from-violet-500 to-purple-600',
                title: 'Đa dạng chế độ',
                desc: 'Không bao giờ nhàm chán với Flashcard 3D, Trắc nghiệm, Điền từ, Ghép thẻ và trò chơi Gravity hấp dẫn.',
                delay: 'scroll-reveal-delay-1',
              },
              {
                icon: <Layers size={28} />,
                color: 'from-emerald-400 to-teal-600',
                title: 'Đồng bộ đám mây',
                desc: 'Học mọi lúc mọi nơi. Dữ liệu lưu trữ an toàn và đồng bộ tức thì trên mọi thiết bị, không bao giờ mất dữ liệu.',
                delay: 'scroll-reveal-delay-2',
              },
              {
                icon: <Target size={28} />,
                color: 'from-blue-500 to-indigo-600',
                title: 'Mục tiêu cá nhân',
                desc: 'Đặt mục tiêu hàng ngày, theo dõi tiến độ IELTS 4 kỹ năng. Dashboard trực quan giúp bạn luôn đi đúng hướng.',
                delay: '',
              },
              {
                icon: <BookOpen size={28} />,
                color: 'from-pink-500 to-rose-600',
                title: 'Luyện IELTS Writing AI',
                desc: 'Luyện Task 1 & Task 2 từng Body theo dàn ý Band 8.0+, gia sư AI chấm 4 tiêu chí 8.0/8.5/8.0/7.5 (Overall 8.0) và viết lại toàn bài hoàn chỉnh.',
                delay: 'scroll-reveal-delay-1',
              },
              {
                icon: <Clock size={28} />,
                color: 'from-cyan-500 to-sky-600',
                title: 'Theo dõi thời gian',
                desc: 'Ghi lại số giờ học từng kỹ năng, visualize bằng biểu đồ trực quan. Biết rõ mình đang thiếu kỹ năng gì.',
                delay: 'scroll-reveal-delay-2',
              },
            ].map((f, i) => (
              <div key={i} className={`scroll-reveal ${f.delay} gradient-border p-6 hover:shadow-xl transition-all duration-300`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} text-white flex items-center justify-center mb-5 shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>{f.title}</h3>
                <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 3: STUDY MODES CAROUSEL ═════════════════════════ */}
      <section className="py-20 overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 mb-12 text-center">
          <div className="scroll-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-semibold" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            ✦ 5 chế độ học đa dạng
          </div>
          <h2 className="scroll-reveal scroll-reveal-delay-1 text-4xl md:text-5xl font-black" style={{ color: 'var(--text)' }}>
            Chọn cách học phù hợp<br />
            <span className="gradient-text-primary">với bạn nhất</span>
          </h2>
        </div>

        {/* Auto-sliding carousel */}
        <div className="relative overflow-hidden py-4">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--bg-subtle), transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, var(--bg-subtle), transparent)' }} />

          <div className="carousel-track gap-5 px-5">
            {[...modeCards, ...modeCards].map((m, i) => (
              <div key={i} className="flex-shrink-0 w-56 glass-card rounded-2xl p-5 shadow-md hover:shadow-xl transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center mb-4`}>
                  {m.icon}
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>{m.label}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 4: STATS ════════════════════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="scroll-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-semibold" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              ✦ Con số ấn tượng
            </div>
            <h2 className="scroll-reveal scroll-reveal-delay-1 text-4xl md:text-5xl font-black" style={{ color: 'var(--text)' }}>
              Cộng đồng học viên<br />
              <span className="gradient-text-primary">đang lớn mạnh mỗi ngày</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Users size={24} />, value: 10000, suffix: '+', label: 'Người học', color: 'from-blue-500 to-indigo-600' },
              { icon: <BookOpen size={24} />, value: 500000, suffix: '+', label: 'Thẻ đã học', color: 'from-violet-500 to-purple-600' },
              { icon: <Award size={24} />, value: 95, suffix: '%', label: 'Hài lòng', color: 'from-emerald-500 to-teal-600' },
              { icon: <TrendingUp size={24} />, value: 3, suffix: 'x', label: 'Nhanh hơn', color: 'from-amber-500 to-orange-600' },
            ].map((s, i) => (
              <div key={i} className="scroll-reveal text-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  {s.icon}
                </div>
                <p className="text-4xl font-black mb-1 gradient-text-primary">
                  <AnimatedCounter to={s.value} suffix={s.suffix} />
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 5: CTA BOTTOM ═══════════════════════════════════ */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #4255FF 0%, #7C3AED 40%, #A855F7 70%, #EC4899 100%)' }} />
          {/* Decorative blobs inside CTA */}
          <div className="blob-1 absolute top-0 left-0 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, white, transparent 70%)' }} />
          <div className="blob-2 absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, white, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="scroll-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            ✦ Miễn phí 100% — Không cần thẻ tín dụng
          </div>
          <h2 className="scroll-reveal scroll-reveal-delay-1 text-4xl md:text-6xl font-black text-white mb-6">
            Sẵn sàng chinh phục<br />IELTS ngay hôm nay?
          </h2>
          <p className="scroll-reveal scroll-reveal-delay-2 text-white/80 text-xl mb-10">
            Tham gia ngay và bắt đầu hành trình học từ vựng thông minh nhất của bạn.
          </p>
          <div className="scroll-reveal scroll-reveal-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => signIn('google')}
              className="flex items-center gap-3 px-8 py-4 text-lg font-bold rounded-full transition-all hover:scale-105 shadow-2xl"
              style={{ background: 'white', color: '#4255FF' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Đăng nhập bằng Google
            </button>
          </div>

          {/* Footer links */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm">
            <span>© 2025 Quizlu</span>
            <span>•</span>
            <span>Miễn phí mãi mãi</span>
            <span>•</span>
            <span>Học mọi lúc, mọi nơi</span>
          </div>
        </div>
      </section>
    </div>
  );
}
