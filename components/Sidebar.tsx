'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  Home, Library, Folder, Plus, ChevronLeft, ChevronRight,
  Settings, X, Clock, PenLine, PenTool, Mic, Sparkles, BookMarked, Headphones, BarChart2
} from 'lucide-react';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon, label, active, collapsed, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`sidebar-nav-item ${active ? 'active' : ''}`}
      title={collapsed ? label : undefined}
    >
      <span className="nav-icon flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  showCreateFolderModal?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose, showCreateFolderModal }: SidebarProps) {
  const pathname = usePathname();
  const { folders, sidebarCollapsed, toggleSidebar } = useStore();
  const [mounted, setMounted] = useState(false);
  const folderList = Object.values(folders).sort((a, b) => b.createdAt - a.createdAt);
  const collapsed = sidebarCollapsed;

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* ── Brand Header ────────────────────────────────────────── */}
        <div className={`h-[64px] flex items-center px-4 flex-shrink-0 transition-all ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link
              href="/"
              className="flex items-center gap-2.5 overflow-hidden min-w-0"
              onClick={onMobileClose}
            >
              <div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm shadow-[var(--primary)]/30">
                Q
              </div>
              <span className="font-extrabold text-[16px] text-[var(--primary)] tracking-tight truncate">
                Quizlu
              </span>
            </Link>
          )}

          {/* Collapse toggle (desktop) */}
          <button
            onClick={toggleSidebar}
            className={`hidden md:flex w-7 h-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors flex-shrink-0 ${collapsed ? '' : 'ml-1'}`}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu nhỏ menu'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Mobile close */}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Main Nav ─────────────────────────────────────────────── */}
        <nav className="p-2 space-y-0.5 flex-shrink-0">
          <NavItem
            href="/"
            icon={<Home size={18} />}
            label="Trang chủ"
            active={pathname === '/'}
            collapsed={collapsed}
          />
          <NavItem
            href="/library"
            icon={<Library size={18} />}
            label="Thư viện của bạn"
            active={!!pathname?.startsWith('/library')}
            collapsed={collapsed}
          />

          <NavItem
            href="/study-hours"
            icon={<Clock size={18} />}
            label="Ghi chú giờ học"
            active={!!pathname?.startsWith('/study-hours')}
            collapsed={collapsed}
          />
          <NavItem
            href="/writing"
            icon={<PenLine size={18} />}
            label="Bài mẫu Writing"
            active={!!pathname?.startsWith('/writing')}
            collapsed={collapsed}
          />
          <NavItem
            href="/task1-practice"
            icon={<BarChart2 size={18} className="text-indigo-500" />}
            label="Luyện Task 1"
            active={!!pathname?.startsWith('/task1-practice')}
            collapsed={collapsed}
            onClick={onMobileClose}
          />
          <NavItem
            href="/task2-practice"
            icon={<PenTool size={18} className="text-emerald-500" />}
            label="Luyện Task 2"
            active={!!pathname?.startsWith('/task2-practice')}
            collapsed={collapsed}
            onClick={onMobileClose}
          />
          <NavItem
            href="/speaking"
            icon={<Mic size={18} />}
            label="Chủ đề Speaking"
            active={!!pathname?.startsWith('/speaking')}
            collapsed={collapsed}
          />
          <NavItem
            href="/ai-generator"
            icon={<Sparkles size={18} className="text-purple-500" />}
            label="AI Tạo Học Phần"
            active={!!pathname?.startsWith('/ai-generator')}
            collapsed={collapsed}
          />
          <NavItem
            href="/ai-training"
            icon={<Sparkles size={18} className="text-purple-500" />}
            label="Phòng thi AI"
            active={pathname === '/ai-training'}
            collapsed={collapsed}
          />

          <NavItem
            href="/reading-errors"
            icon={<BookMarked size={18} />}
            label="Nhật Ký Lỗi Reading"
            active={!!pathname?.startsWith('/reading-errors')}
            collapsed={collapsed}
          />
          <NavItem
            href="/listening-errors"
            icon={<Headphones size={18} />}
            label="Nhật Ký Lỗi Listening"
            active={!!pathname?.startsWith('/listening-errors')}
            collapsed={collapsed}
          />
        </nav>


        {/* ── Folders ──────────────────────────────────────────── */}
        {!collapsed && (
          <div className="px-3 pt-2 pb-1 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Thư mục
              </p>
              <button
                onClick={showCreateFolderModal}
                className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                title="Tạo thư mục mới"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
              {folderList.length === 0 ? (
                <button
                  onClick={showCreateFolderModal}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--primary)] transition-colors"
                >
                  <Plus size={13} />
                  <span>Tạo thư mục đầu tiên</span>
                </button>
              ) : (
                <>
                  {folderList.map((folder) => (
                    <Link
                      key={folder.id}
                      href={`/folder/${folder.id}`}
                      onClick={onMobileClose}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] truncate transition-colors ${pathname === `/folder/${folder.id}`
                        ? 'bg-[var(--primary-light)] text-[var(--primary)] font-medium'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
                        }`}
                    >
                      <Folder size={14} className="flex-shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </Link>
                  ))}
                  <button
                    onClick={showCreateFolderModal}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--primary)] w-full transition-colors"
                  >
                    <Plus size={13} />
                    <span>Thêm thư mục</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom ───────────────────────────────────────────────── */}
        <div className="p-2 border-t border-[var(--border)] flex-shrink-0 mt-auto space-y-0.5">
          <NavItem
            href="/settings"
            icon={<Settings size={18} />}
            label="Cài đặt"
            active={pathname === '/settings'}
            collapsed={collapsed}
          />
        </div>
      </aside>
    </>
  );
}
