import React, { useState, useEffect } from 'react';
import { FestSettings, UserSession } from '../types/fest';
import { getAppLabel } from '../utils/labelHelper';
import {
  LogOut,
  ShieldCheck,
  Users,
  Scale,
  Globe,
  Menu,
  X,
  Trophy,
  Calendar,
  Camera,
  HeartHandshake,
  ChevronRight,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type AppTab =
  | 'leaderboard'
  | 'events'
  | 'teams'
  | 'judging'
  | 'admin'
  | 'gallery'
  | 'donate';

interface HeaderProps {
  festName: string;
  logoUrl?: string;
  settings?: FestSettings;
  session: UserSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  festName,
  logoUrl,
  settings,
  session,
  onOpenAuth,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Lock body scroll and listen for Escape key while drawer is open
  useEffect(() => {
    if (!isDrawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  const navItems: Array<{
    id: AppTab;
    label: string;
    icon: React.ReactNode;
    accent?: 'emerald' | 'amber';
  }> = [
    {
      id: 'leaderboard',
      label: getAppLabel(settings, 'navLeaderboard'),
      icon: <Trophy className="w-4 h-4" />,
    },
    {
      id: 'events',
      label: getAppLabel(settings, 'navEvents'),
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'teams',
      label: getAppLabel(settings, 'navTeams'),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'gallery',
      label: getAppLabel(settings, 'navGallery'),
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: 'donate',
      label: getAppLabel(settings, 'navDonate'),
      icon: <HeartHandshake className="w-4 h-4" />,
    },
  ];

  if (session?.role === 'judge' || session?.role === 'admin') {
    navItems.push({
      id: 'judging',
      label: getAppLabel(settings, 'navJudging'),
      icon: <Scale className="w-4 h-4" />,
      accent: 'emerald',
    });
  }

  if (session?.role === 'admin') {
    navItems.push({
      id: 'admin',
      label: getAppLabel(settings, 'navAdmin'),
      icon: <ShieldCheck className="w-4 h-4" />,
      accent: 'amber',
    });
  }

  const handleNavigate = (tab: AppTab) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
    const mainEl = document.getElementById('main-content');
    if (mainEl && window.innerWidth < 1024) {
      setTimeout(() => {
        mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const getRoleBadge = () => {
    if (!session) {
      return (
        <span className="text-xs text-slate-400 font-medium">
          {getAppLabel(settings, 'guestVisitorLabel')}
        </span>
      );
    }
    switch (session.role) {
      case 'admin':
        return (
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Executive Admin (24/7)
          </span>
        );
      case 'manager':
        return (
          <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Team Manager ({session.name})
          </span>
        );
      case 'judge':
        return (
          <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" />
            Judge ({session.name})
          </span>
        );
      default:
        return (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            Public Viewer
          </span>
        );
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6 px-3 sm:px-6 h-14 sm:h-16">
          {/* Left: Mobile/Tablet Drawer Trigger + Official Logo & Wordmark */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isDrawerOpen}
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-1.5 flex items-center justify-center rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('leaderboard')}
              className="flex items-center gap-2.5 cursor-pointer min-w-0 group text-left"
            >
              <img
                src={logoUrl || '/ifest-logo.svg'}
                alt="I-FEST Irshad Talent Feista Logo"
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain bg-slate-900 border border-amber-500/40 group-hover:border-amber-400 transition-colors p-0.5 shrink-0"
              />
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white group-hover:text-amber-300 transition-colors truncate max-w-[140px] sm:max-w-none">
                {festName}
              </span>
            </button>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const activeCls =
                item.accent === 'emerald'
                  ? 'text-emerald-400 border-emerald-400 font-semibold'
                  : 'text-amber-400 border-amber-400 font-semibold';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                    isActive
                      ? activeCls
                      : 'text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Install & Account Action */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>
            <div className="hidden xl:block text-right">{getRoleBadge()}</div>

            {session && session.role !== 'public' ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3 min-h-[40px] sm:min-h-[38px] text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  {getAppLabel(settings, 'switchRoleButton')}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Log Out"
                  aria-label="Log out"
                  className="min-h-[40px] min-w-[40px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3.5 sm:px-4 min-h-[40px] sm:min-h-[38px] text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/10 whitespace-nowrap shrink-0"
              >
                {getAppLabel(settings, 'signInButton')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Collapsible Slide-Out Drawer Navigation for Smartphones & Tablets */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation drawer"
        >
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Slide-Out Drawer Panel */}
          <aside className="relative z-10 w-[85vw] max-w-xs h-full bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={logoUrl || '/ifest-logo.svg'}
                    alt={festName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-lg object-contain bg-slate-900 border border-amber-500/40 p-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-white truncate">{festName}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {settings?.collegeName || 'Navigation'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active Role Status */}
              <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/50">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Active Portal Access
                </div>
                {getRoleBadge()}
              </div>

              {/* Navigation Links */}
              <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-sm font-semibold transition-colors ${
                        isActive
                          ? item.accent === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={
                            isActive
                              ? item.accent === 'emerald'
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                              : 'text-slate-400'
                          }
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-40'}`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-800 space-y-2.5 pb-safe bg-slate-950">
              <div className="sm:hidden flex justify-stretch">
                <PWAInstallButton />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenAuth();
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>
                  {session && session.role !== 'public'
                    ? getAppLabel(settings, 'switchRoleButton')
                    : getAppLabel(settings, 'openPortalButton')}
                </span>
              </button>

              {session && session.role !== 'public' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
