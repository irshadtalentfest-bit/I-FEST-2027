import React, { useState, useEffect } from 'react';
import { FestState, UserSession } from './types/fest';
import { FestStorageService, FEST_DATA_CHANGED_EVENT } from './services/storage';
import { getAppLabel } from './utils/labelHelper';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { LiveLeaderboard } from './components/LiveLeaderboard';
import { TeamManagementView } from './components/TeamManagementView';
import { JudgesMarkingView } from './components/JudgesMarkingView';
import { ExecutiveAdminDashboard } from './components/ExecutiveAdminDashboard';
import { PhotoGalleryView } from './components/PhotoGalleryView';
import { CompetitionsScheduleView } from './components/CompetitionsScheduleView';
import { DonationPortalView } from './components/DonationPortalView';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  ShieldCheck,
  Users,
  Scale,
  Sparkles,
  Calendar,
  MapPin,
  HeartHandshake,
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<FestState>(FestStorageService.loadState());
  const [session, setSession] = useState<UserSession | null>(FestStorageService.getSession());
  const [activeTab, setActiveTab] = useState<
    'leaderboard' | 'events' | 'teams' | 'judging' | 'admin' | 'gallery' | 'donate'
  >('leaderboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const refreshState = () => {
    setState(FestStorageService.loadState());
  };

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail) {
        setState(e.detail);
      } else {
        refreshState();
      }
    };

    window.addEventListener(FEST_DATA_CHANGED_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(FEST_DATA_CHANGED_EVENT, handleStorageChange);
    };
  }, []);

  const scrollToMain = () => {
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      setTimeout(() => {
        mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handleAuthenticated = (newSession: UserSession) => {
    setSession(newSession);
    FestStorageService.setSession(newSession);

    if (newSession.role === 'admin') {
      setActiveTab('admin');
    } else if (newSession.role === 'manager') {
      setActiveTab('teams');
    } else if (newSession.role === 'judge') {
      setActiveTab('judging');
    } else {
      setActiveTab('leaderboard');
    }
    scrollToMain();
  };

  const handleLogout = () => {
    FestStorageService.setSession(null);
    setSession(null);
    setActiveTab('leaderboard');
  };

  const s = state.settings;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Universal Top Navigation Header */}
      <Header
        festName={s.festName}
        logoUrl={s.logoUrl}
        settings={s}
        session={session}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* HERO SECTION WITH FOUR-TIER ACCESS STRIP */}
      <section className="relative border-b border-slate-800/80 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          {s.heroBannerUrl ? (
            <img
              src={s.heroBannerUrl}
              alt="Fest Atmosphere"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter blur-sm scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-amber-900/30 via-slate-950 to-cyan-950/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-10 lg:py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-8">
            <div className="space-y-3.5 text-center md:text-left max-w-2xl w-full">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[11px] sm:text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase">
                <span>{s.collegeName}</span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span>{s.heroKicker || 'Irshad Talent Feista 2027'}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3.5 sm:gap-4">
                <img
                  src={s.logoUrl || '/ifest-logo.svg'}
                  alt="I-FEST Irshad Talent Feista Crest"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-slate-900/90 border border-amber-500/40 p-1 shadow-xl shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight text-balance">
                    {s.festName}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed mt-1">
                    {s.tagline}
                  </p>
                </div>
              </div>

              {s.heroSubtitle && (
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl mx-auto md:mx-0">
                  {s.heroSubtitle}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-xs text-slate-400 pt-1 font-mono">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{s.festDates}</span>
                </span>
                <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{s.location}</span>
                </span>
              </div>
            </div>

            {/* Quick Session State / Role Card */}
            <div className="w-full md:w-80 lg:w-96 shrink-0">
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md max-w-md mx-auto md:mx-0 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    {getAppLabel(s, 'currentAccessHeading')}
                  </span>
                  {session ? (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Guest View
                    </span>
                  )}
                </div>

                <div className="text-white font-bold text-sm">
                  {session ? session.name : getAppLabel(s, 'guestVisitorLabel')}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {session?.role === 'admin'
                    ? 'Executive master authority: 24/7 override & settings access.'
                    : session?.role === 'manager'
                    ? `Managing Team Roster & Contestant Codes (${session.name}).`
                    : session?.role === 'judge'
                    ? 'Official evaluator for assigned competition marks.'
                    : 'Viewing live leaderboards, event schedules, and winner posters.'}
                </p>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>{session ? getAppLabel(s, 'switchRoleButton') : getAppLabel(s, 'openPortalButton')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('donate');
                      scrollToMain();
                    }}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <HeartHandshake className="w-4 h-4 text-amber-400" />
                    <span>{getAppLabel(s, 'donateButtonLabel')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4-TIER ACCESS BAR */}
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-slate-800/80">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3.5 text-center md:text-left">
              {getAppLabel(s, 'portalsSectionTitle')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Executive Admin */}
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="p-4 min-h-[88px] rounded-xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 hover:bg-slate-900 transition-all text-left group shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                    {getAppLabel(s, 'portalAdminBadge')}
                  </span>
                </div>
                <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                  {getAppLabel(s, 'portalAdminTitle')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {getAppLabel(s, 'portalAdminDesc')}
                </p>
              </button>

              {/* Option 2: Team Managers */}
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="p-4 min-h-[88px] rounded-xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900 transition-all text-left group shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                    {getAppLabel(s, 'portalManagerBadge')}
                  </span>
                </div>
                <div className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                  {getAppLabel(s, 'portalManagerTitle')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {getAppLabel(s, 'portalManagerDesc')}
                </p>
              </button>

              {/* Option 3: Judges Panel */}
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="p-4 min-h-[88px] rounded-xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400 hover:bg-slate-900 transition-all text-left group shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Scale className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                    {getAppLabel(s, 'portalJudgeBadge')}
                  </span>
                </div>
                <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                  {getAppLabel(s, 'portalJudgeTitle')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {getAppLabel(s, 'portalJudgeDesc')}
                </p>
              </button>

              {/* Option 4: Participants / Public Access */}
              <button
                type="button"
                onClick={() => {
                  FestStorageService.authenticate('public', '');
                  setSession(FestStorageService.getSession());
                  setActiveTab('leaderboard');
                  scrollToMain();
                }}
                className="p-4 min-h-[88px] rounded-xl bg-slate-900/80 border border-purple-500/30 hover:border-purple-400 hover:bg-slate-900 transition-all text-left group shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                    {getAppLabel(s, 'portalPublicBadge')}
                  </span>
                </div>
                <div className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                  {getAppLabel(s, 'portalPublicTitle')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {getAppLabel(s, 'portalPublicDesc')}
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN APPLICATION VIEWPORT */}
      <main id="main-content" className="scroll-mt-20 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'leaderboard' && (
          <LiveLeaderboard
            state={state}
            isAdmin={session?.role === 'admin'}
            onSwitchToJudging={() => setActiveTab('judging')}
          />
        )}

        {activeTab === 'events' && (
          <CompetitionsScheduleView
            state={state}
            session={session}
            onRefreshState={refreshState}
            onOpenTimeLockConfig={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'teams' && (
          <TeamManagementView
            state={state}
            session={session}
            onRefreshState={refreshState}
            onOpenTimeLockConfig={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'gallery' && (
          <PhotoGalleryView
            state={state}
            isAdmin={session?.role === 'admin'}
            onRefreshState={refreshState}
          />
        )}

        {activeTab === 'donate' && (
          <DonationPortalView
            state={state}
            session={session}
            onRefreshState={refreshState}
          />
        )}

        {activeTab === 'admin' && (
          session?.role === 'admin' ? (
            <ExecutiveAdminDashboard
              state={state}
              onRefreshState={refreshState}
              onSwitchTab={(t: any) => setActiveTab(t)}
            />
          ) : (
            <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Executive Admin Access Required</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This exclusive dashboard requires authorized Executive Committee master credentials.
              </p>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="min-h-[44px] py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Authenticate with Master Password
              </button>
            </div>
          )
        )}

        {activeTab === 'judging' && (
          <JudgesMarkingView
            state={state}
            session={session}
            onRefreshState={refreshState}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-xs py-6 pb-safe mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-slate-300">{s.festName}</span>
            <span aria-hidden="true">·</span>
            <span>{s.collegeName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 text-slate-500">
            <span>{s.footerCopyright || 'Official Fest Management Portal'}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="min-h-[44px] px-2 text-amber-400/80 hover:text-amber-300 underline inline-flex items-center"
            >
              {getAppLabel(s, 'footerSignInLink')}
            </button>
          </div>
        </div>
      </footer>

      <OfflineIndicator />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        teams={state.teams}
        judges={state.judges}
        currentSession={session}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
