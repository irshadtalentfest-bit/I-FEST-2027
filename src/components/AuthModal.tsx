import React, { useState, useEffect } from 'react';
import { UserRole, Team, Judge, UserSession } from '../types/fest';
import { FestStorageService } from '../services/storage';
import { ShieldCheck, Users, Scale, Eye, EyeOff, Check, AlertCircle, X, Sparkles, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  judges: Judge[];
  currentSession: UserSession | null;
  onAuthenticated: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  teams,
  judges,
  onAuthenticated,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  // Executive Admin State
  const [adminPassword, setAdminPassword] = useState('');

  // Team Manager State
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [managerPassword, setManagerPassword] = useState('');

  // Judge State
  const [selectedJudgeUsername, setSelectedJudgeUsername] = useState<string>(judges[0]?.username || '');
  const [judgePassword, setJudgePassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length > 0 && !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (judges.length === 0) {
      setSelectedJudgeUsername('');
    } else if (!judges.some((j) => j.username === selectedJudgeUsername)) {
      setSelectedJudgeUsername(judges[0].username);
    }
  }, [judges, selectedJudgeUsername]);

  if (!isOpen) return null;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = FestStorageService.authenticate('admin', adminPassword);
    if (res.success && res.session) {
      onAuthenticated(res.session);
      onClose();
    } else {
      setErrorMsg(res.error || 'Authentication failed');
    }
  };

  const handleManagerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = FestStorageService.authenticate('manager', managerPassword, selectedTeamId);
    if (res.success && res.session) {
      onAuthenticated(res.session);
      onClose();
    } else {
      setErrorMsg(res.error || 'Authentication failed');
    }
  };

  const handleJudgeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = FestStorageService.authenticate('judge', judgePassword, selectedJudgeUsername);
    if (res.success && res.session) {
      onAuthenticated(res.session);
      onClose();
    } else {
      setErrorMsg(res.error || 'Authentication failed');
    }
  };

  const handlePublicAccess = () => {
    const res = FestStorageService.authenticate('public', '');
    if (res.success && res.session) {
      onAuthenticated(res.session);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl my-auto">
        {/* Top Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-400 font-mono text-xs font-bold tracking-wider uppercase shrink-0">
              Access Gateway
            </span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <h3 className="text-sm sm:text-base font-bold text-white truncate">Select Your Access Tier</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close access dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Tier Selection Strip */}
        <div className="p-4 sm:p-6 bg-slate-950/40 border-b border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Executive Admin */}
            <button
              onClick={() => {
                setSelectedRole('admin');
                setErrorMsg(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                selectedRole === 'admin'
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">Executive Admin</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Master Secured</div>
            </button>

            {/* 2. Team Managers */}
            <button
              onClick={() => {
                setSelectedRole('manager');
                setShowPassword(false);
                setErrorMsg(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                selectedRole === 'manager'
                  ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">Team Managers</div>
              <div className="text-[10px] text-slate-400 mt-0.5">3 Team Logins</div>
            </button>

            {/* 3. Judges Panel */}
            <button
              onClick={() => {
                setSelectedRole('judge');
                setShowPassword(false);
                setErrorMsg(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                selectedRole === 'judge'
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <Scale className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">Judges Panel</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Marks & Scoring</div>
            </button>

            {/* 4. Public Access */}
            <button
              onClick={() => {
                setSelectedRole('public');
                setShowPassword(false);
                setErrorMsg(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                selectedRole === 'public'
                  ? 'bg-purple-500/10 border-purple-500/50 shadow-md ring-1 ring-purple-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">Public / Guest</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Without Login</div>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Form Content by Tier */}
        <div className="p-6">
          {/* TIER 1: EXECUTIVE ADMIN */}
          {selectedRole === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300">
                <span className="font-bold text-amber-300 block mb-0.5">Executive Master Access</span>
                Grants absolute 24/7 administrative oversight: update team manager passwords, configure time-locks, declare winners, customize branding, and reset fest scores.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Master Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter master password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 pr-10 font-mono"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Enter Executive Admin Portal</span>
              </button>
            </form>
          )}

          {/* TIER 2: TEAM MANAGERS */}
          {selectedRole === 'manager' && (
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-300">
                <span className="font-bold text-cyan-300 block mb-0.5">Team Manager Access</span>
                Manage your squad rosters, contestant codes, and competition schedules before the Executive Committee time-lock expires.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Your Team
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {teams.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedTeamId === t.id
                          ? 'border-cyan-500 bg-cyan-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="font-bold text-xs truncate">{t.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Prefix: <span className="font-mono text-cyan-400">{t.codePrefix}</span> · {t.managerName}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Manager Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="Enter manager password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Sign In as Team Manager</span>
              </button>
            </form>
          )}

          {/* TIER 3: JUDGES PANEL */}
          {selectedRole === 'judge' && (
            <form onSubmit={handleJudgeLogin} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300">
                <span className="font-bold text-emerald-300 block mb-0.5">Judges Official Panel</span>
                Input and evaluate performance scores for your assigned competitions.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Judge Account
                </label>
                {judges.length > 0 ? (
                  <select
                    value={selectedJudgeUsername}
                    onChange={(e) => setSelectedJudgeUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {judges.map((j) => (
                      <option key={j.id} value={j.username}>
                        {j.name} ({j.designation}) - @{j.username}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    No judge accounts exist yet. Executive Admin must create judge accounts in Executive Controls.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Judge Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={judgePassword}
                    onChange={(e) => setJudgePassword(e.target.value)}
                    placeholder="Enter judge password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 pr-10 font-mono"
                    required
                    disabled={judges.length === 0}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={judges.length === 0}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Scale className="w-4 h-4" />
                <span>Enter Judges Marking Portal</span>
              </button>
            </form>
          )}

          {/* TIER 4: PUBLIC ACCESS / WITHOUT LOGIN */}
          {selectedRole === 'public' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs text-slate-300">
                <span className="font-bold text-purple-300 block text-sm mb-1">
                  Public & Participant Browse Mode (Without Login)
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Direct access for students, participants, faculty, and visitors. Explore the real-time overall fest points table, event schedules, contestant codes, rules, and download automated winner posters instantly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Live 1st, 2nd, 3rd Standings</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Download Winner Posters</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Search Contestant Codes</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Event Schedules & Venues</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePublicAccess}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Browse Without Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
