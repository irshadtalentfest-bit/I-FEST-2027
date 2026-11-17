import React, { useState, useEffect } from 'react';
import {
  FestState,
  Team,
  Judge,
  FestEvent,
  FestSettings,
  AgeCategory,
  StageType,
  AppCustomLabels,
} from '../types/fest';
import { FestStorageService } from '../services/storage';
import { DEFAULT_CUSTOM_LABELS } from '../utils/labelHelper';
import { compressImageFile, saveMediaDataUrl } from '../utils/mediaStorage';
import { ConfirmModal } from './ConfirmModal';
import {
  ShieldCheck,
  Key,
  Users,
  Scale,
  Clock,
  Settings,
  RotateCcw,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Calendar,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  HeartHandshake,
  CheckCircle2,
  Shuffle,
} from 'lucide-react';

function toLocalDatetimeInputValue(isoString: string | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

interface ExecutiveAdminDashboardProps {
  state: FestState;
  onRefreshState: () => void;
  onSwitchTab?: (tab: string) => void;
}

export const ExecutiveAdminDashboard: React.FC<ExecutiveAdminDashboardProps> = ({
  state,
  onRefreshState,
  onSwitchTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'managers' | 'judges' | 'timelock' | 'events' | 'donations' | 'branding' | 'resets'
  >('managers');

  // Status feedback toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Unified Confirmation Modal state (replaces window.confirm cleanly inside iframe)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    type: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  // 1. TEAM MANAGERS EDITING STATE
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormPrefix, setTeamFormPrefix] = useState('');
  const [teamFormManagerName, setTeamFormManagerName] = useState('');
  const [teamFormUsername, setTeamFormUsername] = useState('');
  const [teamFormPassword, setTeamFormPassword] = useState('');
  const [teamFormColor, setTeamFormColor] = useState('#f59e0b');
  const [showManagerPasswords, setShowManagerPasswords] = useState<Record<string, boolean>>({});
  const [showTeamModalPassword, setShowTeamModalPassword] = useState(false);

  const handleStartEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormName(team.name);
    setTeamFormPrefix(team.codePrefix);
    setTeamFormManagerName(team.managerName);
    setTeamFormUsername(team.managerUsername);
    setTeamFormPassword(team.managerPassword);
    setTeamFormColor(team.color);
    setShowTeamModalPassword(false);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    FestStorageService.updateTeamManager(editingTeam.id, {
      name: teamFormName.trim(),
      codePrefix: teamFormPrefix.trim().toUpperCase(),
      managerName: teamFormManagerName.trim(),
      managerUsername: teamFormUsername.trim(),
      managerPassword: teamFormPassword.trim(),
      color: teamFormColor,
    });

    setEditingTeam(null);
    onRefreshState();
    showToast(`Updated credentials & prefix for ${teamFormName}`);
  };

  // 2. JUDGES MANAGEMENT STATE
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [judgeFormName, setJudgeFormName] = useState('');
  const [judgeFormUsername, setJudgeFormUsername] = useState('');
  const [judgeFormPassword, setJudgeFormPassword] = useState('');
  const [judgeFormDesignation, setJudgeFormDesignation] = useState('');
  const [judgeFormAssignedEvents, setJudgeFormAssignedEvents] = useState<string[]>([]);
  const [showJudgePasswords, setShowJudgePasswords] = useState<Record<string, boolean>>({});
  const [showJudgeModalPassword, setShowJudgeModalPassword] = useState(false);

  const handleOpenAddJudge = () => {
    setEditingJudge(null);
    setJudgeFormName('');
    setJudgeFormUsername(`judge_${state.judges.length + 1}`);
    setJudgeFormPassword('');
    setJudgeFormDesignation('Visiting Jury Member');
    setJudgeFormAssignedEvents([]);
    setShowJudgeModalPassword(false);
    setIsJudgeModalOpen(true);
  };

  const handleOpenEditJudge = (j: Judge) => {
    setEditingJudge(j);
    setJudgeFormName(j.name);
    setJudgeFormUsername(j.username);
    setJudgeFormPassword(j.password);
    setJudgeFormDesignation(j.designation);
    setJudgeFormAssignedEvents(j.assignedEventIds || []);
    setShowJudgeModalPassword(false);
    setIsJudgeModalOpen(true);
  };

  const handleSaveJudge = (e: React.FormEvent) => {
    e.preventDefault();
    const currentState = FestStorageService.loadState();

    if (editingJudge) {
      currentState.judges = currentState.judges.map((j) =>
        j.id === editingJudge.id
          ? {
              ...j,
              name: judgeFormName.trim(),
              username: judgeFormUsername.trim().toLowerCase(),
              password: judgeFormPassword.trim(),
              designation: judgeFormDesignation.trim(),
              assignedEventIds: judgeFormAssignedEvents,
            }
          : j
      );
    } else {
      const newJudge: Judge = {
        id: `judge-${Date.now()}`,
        name: judgeFormName.trim(),
        username: judgeFormUsername.trim().toLowerCase(),
        password: judgeFormPassword.trim(),
        designation: judgeFormDesignation.trim(),
        assignedEventIds: judgeFormAssignedEvents,
        createdAt: new Date().toISOString(),
      };
      currentState.judges.push(newJudge);
    }

    FestStorageService.saveState(currentState);
    setIsJudgeModalOpen(false);
    onRefreshState();
    showToast('Judge account saved successfully.');
  };

  const handleDeleteJudge = (judgeId: string) => {
    const targetJudge = state.judges.find((j) => j.id === judgeId);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Judge Account Permanently',
      message: `Are you sure you want to permanently remove "${targetJudge?.name || 'this judge'}"? They will immediately lose jury panel access and be unassigned from all events.`,
      confirmText: 'Yes, Delete Judge',
      type: 'danger',
      onConfirm: () => {
        FestStorageService.deleteJudge(judgeId);
        setConfirmConfig(null);
        onRefreshState();
        showToast('Judge account permanently deleted.');
      },
    });
  };

  const handleDeleteAllJudges = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete All Existing Judge Accounts',
      message: `Are you sure you want to permanently delete all ${state.judges.length} judge accounts? Only newly created judges will remain.`,
      confirmText: 'Yes, Delete All Judges',
      type: 'danger',
      onConfirm: () => {
        FestStorageService.clearAllJudges();
        setConfirmConfig(null);
        onRefreshState();
        showToast('All judge accounts permanently deleted.');
      },
    });
  };

  // 3. TIME-LOCK STATE
  const [lockEnabled, setLockEnabled] = useState(state.timeLock.enabled);
  const [lockDeadline, setLockDeadline] = useState(
    toLocalDatetimeInputValue(state.timeLock.deadline)
  );
  const [lockReason, setLockReason] = useState(state.timeLock.reason || '');

  const handleSaveTimeLock = (e: React.FormEvent) => {
    e.preventDefault();
    const currentState = FestStorageService.loadState();
    currentState.timeLock = {
      ...currentState.timeLock,
      enabled: lockEnabled,
      deadline: new Date(lockDeadline).toISOString(),
      reason: lockReason.trim(),
    };
    FestStorageService.saveState(currentState);
    onRefreshState();
    showToast('Time-lock settings updated for Team Managers (Participants & Competitions).');
  };

  const applyTimeLockPreset = (offsetMinutes: number, forceLock = false) => {
    const targetDate = new Date(Date.now() + offsetMinutes * 60000);
    setLockDeadline(toLocalDatetimeInputValue(targetDate.toISOString()));
    setLockEnabled(forceLock);
  };

  // 4. EVENTS MANAGEMENT STATE
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FestEvent | null>(null);
  const [eventFormTitle, setEventFormTitle] = useState('');
  const [eventFormCategory, setEventFormCategory] = useState<FestEvent['category']>('Stage');
  const [eventFormStageType, setEventFormStageType] = useState<StageType>('On-Stage');
  const [eventFormTargetCategory, setEventFormTargetCategory] = useState<AgeCategory | 'All'>('Senior');
  const [eventFormIsGroupEvent, setEventFormIsGroupEvent] = useState<boolean>(false);
  const [eventFormMaxPerTeam, setEventFormMaxPerTeam] = useState<number>(2);
  const [eventFormVenue, setEventFormVenue] = useState('');
  const [eventFormDate, setEventFormDate] = useState('Day 1 - March 18');
  const [eventFormTime, setEventFormTime] = useState('10:00 AM');
  const [eventFormRules, setEventFormRules] = useState('');
  const [eventFormStatus, setEventFormStatus] = useState<FestEvent['status']>('Upcoming');
  const [eventFormIsPublished, setEventFormIsPublished] = useState<boolean>(false);

  // Filters for events list
  const [eventFilterStage, setEventFilterStage] = useState<'all' | 'On-Stage' | 'Off-Stage'>('all');
  const [eventFilterDivision, setEventFilterDivision] = useState<'all' | AgeCategory>('all');

  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setEventFormTitle('');
    setEventFormCategory('Stage');
    setEventFormStageType('On-Stage');
    setEventFormTargetCategory('Senior');
    setEventFormIsGroupEvent(false);
    setEventFormMaxPerTeam(2);
    setEventFormVenue('Main Stage A');
    setEventFormDate('Day 1 - March 18');
    setEventFormTime('10:00 AM');
    setEventFormRules('Time limit: 5 minutes.\nJudged on creativity, timing, and stage presence.');
    setEventFormStatus('Upcoming');
    setEventFormIsPublished(false);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (ev: FestEvent) => {
    setEditingEvent(ev);
    setEventFormTitle(ev.title);
    setEventFormCategory(ev.category);
    setEventFormStageType(ev.stageType || (ev.category === 'Off-Stage' ? 'Off-Stage' : 'On-Stage'));
    setEventFormTargetCategory(ev.targetCategory || 'Senior');
    setEventFormIsGroupEvent(!!ev.isGroupEvent);
    setEventFormMaxPerTeam(ev.maxParticipantsPerTeam || 2);
    setEventFormVenue(ev.venue);
    setEventFormDate(ev.date);
    setEventFormTime(ev.time);
    setEventFormRules(ev.rules.join('\n'));
    setEventFormStatus(ev.status);
    setEventFormIsPublished(ev.isPublishedToPublic ?? false);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const rulesArray = eventFormRules
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    const sanitizedMax = Math.max(1, Math.min(50, Math.round(eventFormMaxPerTeam || 1)));

    const payload: FestEvent = editingEvent
      ? {
          ...editingEvent,
          title: eventFormTitle.trim(),
          category: eventFormCategory,
          stageType: eventFormStageType,
          targetCategory: eventFormTargetCategory,
          isGroupEvent: eventFormIsGroupEvent,
          maxParticipantsPerTeam: sanitizedMax,
          venue: eventFormVenue.trim(),
          date: eventFormDate.trim(),
          time: eventFormTime.trim(),
          rules: rulesArray,
          status: eventFormStatus,
          isPublishedToPublic: eventFormIsPublished,
        }
      : {
          id: `ev-${Date.now()}`,
          title: eventFormTitle.trim(),
          category: eventFormCategory,
          stageType: eventFormStageType,
          targetCategory: eventFormTargetCategory,
          venue: eventFormVenue.trim(),
          date: eventFormDate.trim(),
          time: eventFormTime.trim(),
          rules: rulesArray,
          status: eventFormStatus,
          isPublishedToPublic: eventFormIsPublished,
          isGroupEvent: eventFormIsGroupEvent,
          maxParticipantsPerTeam: sanitizedMax,
          criteria: [
            { id: 'c-1', name: 'Presentation & Concept', maxMarks: 35 },
            { id: 'c-2', name: 'Skill & Execution', maxMarks: 35 },
            { id: 'c-3', name: 'Overall Impression', maxMarks: 30 },
          ],
          assignedJudgeIds: state.judges.map((j) => j.id),
        };

    const res = FestStorageService.saveEvent(payload, 'admin');
    if (!res.success) {
      showToast(res.error || 'Failed to save competition event.');
      return;
    }

    setIsEventModalOpen(false);
    onRefreshState();
    showToast('Competition event & team quota saved.');
  };

  const handleAdjustEventTeamLimit = (ev: FestEvent, delta: number) => {
    const current = ev.maxParticipantsPerTeam || 2;
    const next = Math.max(1, Math.min(50, current + delta));
    if (next === current) return;
    const res = FestStorageService.updateEventTeamLimit(ev.id, next);
    if (res.success) {
      onRefreshState();
      showToast(`"${ev.title}" limited to max ${next} participant${next === 1 ? '' : 's'} per team.`);
    }
  };

  const handleReshuffleJudgeCodes = (ev: FestEvent) => {
    const res = FestStorageService.reshuffleEventJudgeCodes(ev.id);
    if (res.success) {
      onRefreshState();
      showToast(`Anonymous judge code letters reshuffled for "${ev.title}".`);
    }
  };

  const handleToggleEventPublish = (eventId: string) => {
    const isNowPublic = FestStorageService.toggleEventPublicPublish(eventId);
    onRefreshState();
    showToast(
      isNowPublic
        ? 'Competition results published to live public leaderboard.'
        : 'Competition results retracted to Executive Admin Review only.'
    );
  };

  const handlePublishAllReviewed = () => {
    const count = FestStorageService.publishAllReviewedEvents();
    onRefreshState();
    showToast(
      count > 0
        ? `Successfully published ${count} reviewed event results to the public.`
        : 'No pending reviewed event results to publish.'
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    const targetEv = state.events.find((e) => e.id === eventId);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Competition Permanently',
      message: `Are you sure you want to permanently delete "${targetEv?.title || 'this competition'}" along with all submitted judge scores and declarations?`,
      confirmText: 'Yes, Delete Competition',
      type: 'danger',
      onConfirm: () => {
        FestStorageService.deleteEvent(eventId, 'admin');
        setConfirmConfig(null);
        onRefreshState();
        showToast('Competition and associated records permanently deleted.');
      },
    });
  };

  const handleDeleteAllEvents = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete All Existing Competitions & Programs',
      message: `Are you sure you want to permanently delete all ${state.events.length} competitions/programs and their submitted marks? Only newly added custom events will remain.`,
      confirmText: 'Yes, Delete All Competitions',
      type: 'danger',
      onConfirm: () => {
        FestStorageService.clearAllEvents();
        setConfirmConfig(null);
        onRefreshState();
        showToast('All competitions and associated marks permanently deleted.');
      },
    });
  };

  const handleDirectEventPosterUpload = async (eventId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1600, 0.88);
      const ref = compressed.length > 220 * 1024
        ? await saveMediaDataUrl(`poster-tpl-${eventId}-${Date.now()}`, compressed)
        : compressed;
      FestStorageService.setEventPosterTemplate(eventId, ref);
      onRefreshState();
      showToast('Single 1st/2nd/3rd winner poster template saved for this competition.');
    } catch {
      showToast('Failed to process poster template image.');
    }
  };

  // 5. BRANDING & SETTINGS STATE
  const [brandingSettings, setBrandingSettings] = useState<FestSettings>({
    ...state.settings,
    customLabels: { ...DEFAULT_CUSTOM_LABELS, ...(state.settings.customLabels || {}) },
  });

  useEffect(() => {
    setBrandingSettings({
      ...state.settings,
      customLabels: { ...DEFAULT_CUSTOM_LABELS, ...(state.settings.customLabels || {}) },
    });
    setLockEnabled(state.timeLock.enabled);
    setLockDeadline(toLocalDatetimeInputValue(state.timeLock.deadline));
    setLockReason(state.timeLock.reason || '');
  }, [state.lastUpdated]);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const currentState = FestStorageService.loadState();
    currentState.settings = { ...brandingSettings };
    const saveRes = FestStorageService.saveState(currentState);
    if (!saveRes.success) {
      showToast(saveRes.error || 'Could not save customizations.');
      return;
    }
    onRefreshState();
    showToast('Global fest branding and all dynamic texts updated successfully.');
  };

  const handleResetLabelsToDefault = () => {
    setBrandingSettings({
      ...brandingSettings,
      customLabels: { ...DEFAULT_CUSTOM_LABELS },
    });
    showToast('UI Labels restored to defaults. Click "Save Global Customizations" to apply.');
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 512, 0.9);
      setBrandingSettings({ ...brandingSettings, logoUrl: compressed });
      showToast('Custom logo loaded! Click "Save Global Customizations" to apply.');
    } catch {
      showToast('Failed to read logo file.');
    }
  };

  const handleUnifiedTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1600, 0.88);
      const ref = compressed.length > 220 * 1024
        ? await saveMediaDataUrl(`unified-poster-tpl-${Date.now()}`, compressed)
        : compressed;
      setBrandingSettings({
        ...brandingSettings,
        unifiedPosterTemplateUrl: ref,
        customPosterBgUrl: ref,
      });
      showToast('Unified poster template loaded! Click "Save Global Customizations" to apply.');
    } catch {
      showToast('Failed to process template file.');
    }
  };

  // 6. SCORES RESET & DATABASE TOOLS
  const handleResetScoresToZero = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reset All Scores & Standings to Zero',
      message:
        'CRITICAL ACTION: Reset all contestant scores, judge marks, and event declarations back to zero for the start of the fest? Team rosters and event lists will remain intact.',
      confirmText: 'Yes, Reset Scores to Zero',
      type: 'warning',
      onConfirm: () => {
        FestStorageService.resetAllScoresAndStatuses();
        setConfirmConfig(null);
        onRefreshState();
        showToast('All fest scores and standings have been reset to zero.');
      },
    });
  };

  const handleClearDummyData = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Clear All Sample / Existing Records',
      message:
        'This will permanently clear all participants, competitions, judges, marks, and gallery items so you start with a completely clean database containing ONLY newly added custom entries.',
      confirmText: 'Yes, Wipe & Start Clean',
      type: 'danger',
      onConfirm: () => {
        FestStorageService.clearAllInitialDummyData();
        setConfirmConfig(null);
        onRefreshState();
        showToast('Database cleared cleanly. Ready for your custom fest entries.');
      },
    });
  };

  const handleExportJSON = () => {
    const jsonStr = FestStorageService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ifest_2027_backup_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Database JSON backup downloaded.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = FestStorageService.importDatabaseJSON(content);
      if (res.success) {
        onRefreshState();
        showToast('Database imported successfully.');
      } else {
        showToast(res.error || 'Failed to import JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Restore Factory Sample Seed Data',
      message:
        'Reset entire platform back to the original sample seed state? This will overwrite any custom modifications.',
      confirmText: 'Yes, Restore Defaults',
      type: 'warning',
      onConfirm: () => {
        FestStorageService.factoryReset();
        setConfirmConfig(null);
        onRefreshState();
        showToast('Platform reset to initial defaults.');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast banner */}
      {toastMsg && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 p-4 rounded-xl bg-slate-900 border border-emerald-500/50 shadow-2xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
              Executive Committee Control Center
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                Master 24/7 Authority
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage dynamic team manager passwords, unlimited judge accounts, time-lock windows, branding, and fest resets.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab('gallery')}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Media</span>
            </button>
          )}
          <button
            onClick={handleResetScoresToZero}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Scores to Zero</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto scroll-touch p-1.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveSubTab('managers')}
          className={`min-h-[40px] px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'managers'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Team Manager Passwords</span>
        </button>

        <button
          onClick={() => setActiveSubTab('judges')}
          className={`min-h-[40px] px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'judges'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Judges Accounts ({state.judges.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('timelock')}
          className={`min-h-[40px] px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'timelock'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Time-Lock Configuration</span>
        </button>

        <button
          onClick={() => setActiveSubTab('events')}
          className={`min-h-[40px] px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'events'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Competitions Manager ({state.events.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('donations')}
          className={`min-h-[40px] px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'donations'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Donations &amp; Fund ({(state.donations || []).length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('branding')}
          className={`min-h-[40px] px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'branding'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Branding &amp; Dynamic Texts</span>
        </button>

        <button
          onClick={() => setActiveSubTab('resets')}
          className={`min-h-[40px] px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'resets'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Database &amp; Reset</span>
        </button>
      </div>

      {/* 1. SUB-TAB: TEAM MANAGERS PASSWORDS PANEL (EXCLUSIVE ADMIN REQUIREMENT) */}
      {activeSubTab === 'managers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="font-bold text-amber-300 block text-sm mb-1">
              Exclusive Team Managers Password & Credentials Desk
            </span>
            <p className="text-slate-400 leading-relaxed">
              Executive admins have exclusive authority to dynamically set, update, or change individual passwords, contestant code prefixes, and manager contact details for each of the 3 teams without code modifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.teams.map((t) => {
              const isPasswordVisible = !!showManagerPasswords[t.id];
              const participantCount = state.participants.filter((p) => p.teamId === t.id).length;

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <h4 className="font-bold text-white text-base">{t.name}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        Prefix: {t.codePrefix}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Manager:</span>
                        <span className="font-semibold text-white">{t.managerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Username:</span>
                        <span className="font-mono text-cyan-300">{t.managerUsername}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Password:</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-amber-400">
                            {isPasswordVisible ? t.managerPassword : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShowManagerPasswords((prev) => ({
                                ...prev,
                                [t.id]: !prev[t.id],
                              }))
                            }
                            className="text-slate-500 hover:text-slate-300"
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Registered:</span>
                        <span className="font-mono text-slate-400">{participantCount} contestants</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartEditTeam(t)}
                    className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Password & Details</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* EDIT TEAM MODAL */}
          {editingTeam && (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
              <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    Edit Credentials: {editingTeam.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set a new password or change manager profile dynamically.
                  </p>
                </div>

                <form onSubmit={handleSaveTeam} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Team Display Name</label>
                    <input
                      type="text"
                      value={teamFormName}
                      onChange={(e) => setTeamFormName(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Code Letter Prefix</label>
                      <input
                        type="text"
                        value={teamFormPrefix}
                        onChange={(e) => setTeamFormPrefix(e.target.value)}
                        placeholder="e.g. A"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Brand Color</label>
                      <input
                        type="color"
                        value={teamFormColor}
                        onChange={(e) => setTeamFormColor(e.target.value)}
                        className="w-full h-[42px] rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Manager Full Name</label>
                    <input
                      type="text"
                      value={teamFormManagerName}
                      onChange={(e) => setTeamFormManagerName(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Manager Login Username</label>
                    <input
                      type="text"
                      value={teamFormUsername}
                      onChange={(e) => setTeamFormUsername(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-amber-400 font-bold mb-1">New Manager Password</label>
                    <div className="relative">
                      <input
                        type={showTeamModalPassword ? 'text' : 'password'}
                        value={teamFormPassword}
                        onChange={(e) => setTeamFormPassword(e.target.value)}
                        placeholder="Enter new dynamic password"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-none focus:border-amber-500 pr-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeamModalPassword(!showTeamModalPassword)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        title={showTeamModalPassword ? 'Hide password' : 'Show password'}
                      >
                        {showTeamModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTeam(null)}
                      className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                    >
                      Save New Credentials
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SUB-TAB: JUDGES ACCOUNTS MANAGER */}
      {activeSubTab === 'judges' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Judges Panel Roster</h3>
              <p className="text-xs text-slate-400">
                Create unlimited judge accounts, assign specific events, or delete existing accounts permanently.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {state.judges.length > 0 && (
                <button
                  onClick={handleDeleteAllJudges}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All Judges</span>
                </button>
              )}
              <button
                onClick={handleOpenAddJudge}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Judge Account</span>
              </button>
            </div>
          </div>

          {/* Mobile Judge Cards (< md) */}
          <div className="md:hidden space-y-3">
            {state.judges.map((j) => (
              <div
                key={j.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900 space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm">{j.name}</div>
                    <div className="text-[11px] text-slate-400">{j.designation}</div>
                  </div>
                  <span className="font-mono text-cyan-400 text-xs">@{j.username}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Password:</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-amber-400">
                      {showJudgePasswords[j.id] ? j.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setShowJudgePasswords((prev) => ({
                          ...prev,
                          [j.id]: !prev[j.id],
                        }))
                      }
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      title={showJudgePasswords[j.id] ? 'Hide password' : 'Show password'}
                    >
                      {showJudgePasswords[j.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {j.assignedEventIds && j.assignedEventIds.length > 0 ? (
                    j.assignedEventIds.map((evId) => {
                      const ev = state.events.find((e) => e.id === evId);
                      return (
                        <span
                          key={evId}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                        >
                          {ev?.title || evId}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Assigned: All events</span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditJudge(j)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteJudge(j.id)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Judges Table (>= md) */}
          <div className="hidden md:block rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto scroll-touch">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Judge Name & Role</th>
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3">Password</th>
                    <th className="px-5 py-3">Assigned Events</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {state.judges.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <div className="font-bold text-white">{j.name}</div>
                        <div className="text-[10px] text-slate-500">{j.designation}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-cyan-400">@{j.username}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-amber-400">
                            {showJudgePasswords[j.id] ? j.password : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShowJudgePasswords((prev) => ({
                                ...prev,
                                [j.id]: !prev[j.id],
                              }))
                            }
                            className="p-1 text-slate-500 hover:text-slate-300"
                            title={showJudgePasswords[j.id] ? 'Hide password' : 'Show password'}
                          >
                            {showJudgePasswords[j.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {j.assignedEventIds && j.assignedEventIds.length > 0 ? (
                            j.assignedEventIds.map((evId) => {
                              const ev = state.events.find((e) => e.id === evId);
                              return (
                                <span
                                  key={evId}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                                >
                                  {ev?.title || evId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">All events</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditJudge(j)}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteJudge(j.id)}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ADD / EDIT JUDGE MODAL */}
          {isJudgeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
              <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    {editingJudge ? 'Edit Judge Account' : 'Create New Judge Account'}
                  </h3>
                </div>

                <form onSubmit={handleSaveJudge} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Judge Full Name</label>
                    <input
                      type="text"
                      value={judgeFormName}
                      onChange={(e) => setJudgeFormName(e.target.value)}
                      placeholder="e.g. Dr. Priya Sharma"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Designation / Role</label>
                    <input
                      type="text"
                      value={judgeFormDesignation}
                      onChange={(e) => setJudgeFormDesignation(e.target.value)}
                      placeholder="e.g. Cultural Jury Chair"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Login Username</label>
                      <input
                        type="text"
                        value={judgeFormUsername}
                        onChange={(e) => setJudgeFormUsername(e.target.value)}
                        placeholder="judge_sharma"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-amber-400 font-bold mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showJudgeModalPassword ? 'text' : 'password'}
                          value={judgeFormPassword}
                          onChange={(e) => setJudgeFormPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowJudgeModalPassword(!showJudgeModalPassword)}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          title={showJudgeModalPassword ? 'Hide password' : 'Show password'}
                        >
                          {showJudgeModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Assigned Competitions</label>
                    <div className="max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      {state.events.map((ev) => {
                        const checked = judgeFormAssignedEvents.includes(ev.id);
                        return (
                          <label
                            key={ev.id}
                            className="min-h-[40px] flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-900 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setJudgeFormAssignedEvents([...judgeFormAssignedEvents, ev.id]);
                                } else {
                                  setJudgeFormAssignedEvents(
                                    judgeFormAssignedEvents.filter((id) => id !== ev.id)
                                  );
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-700 text-emerald-500"
                            />
                            <span className="text-white text-xs">{ev.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsJudgeModalOpen(false)}
                      className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md"
                    >
                      Save Judge Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SUB-TAB: TIME-LOCK CONFIGURATION */}
      {activeSubTab === 'timelock' && (
        <form
          onSubmit={handleSaveTimeLock}
          className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs max-w-2xl"
        >
          <div className="border-b border-slate-800 pb-3">
            <span className="text-amber-400 font-mono font-bold uppercase tracking-wider">
              Participants &amp; Competitions Time Restriction
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Team Manager Editing Deadline &amp; 24/7 Executive Override
            </h3>
            <p className="text-slate-400 mt-1 leading-relaxed">
              Before the deadline, Team Managers can add, edit, and delete participants and competition details. Once this deadline passes (or manual lock is enabled), Team Managers automatically lose all editing permissions while Executive Admins retain permanent 24/7 override access.
            </p>
          </div>

          <div className="space-y-4">
            {/* Immediate Lock Switch */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white text-sm block">Lock Team Managers Immediately</span>
                <span className="text-slate-400 text-xs">
                  Force-freeze all Team Manager modifications to participants and competitions regardless of deadline time.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLockEnabled(!lockEnabled)}
                className={`min-h-[42px] px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                  lockEnabled
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {lockEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{lockEnabled ? 'Locked' : 'Unlocked'}</span>
              </button>
            </div>

            {/* Deadline Date & Time + Quick Window Presets */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Team Manager Editing Deadline (Local Date &amp; Time)
              </label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => applyTimeLockPreset(15, false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-mono"
                >
                  Open +15 Mins
                </button>
                <button
                  type="button"
                  onClick={() => applyTimeLockPreset(120, false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-mono"
                >
                  Open +2 Hours
                </button>
                <button
                  type="button"
                  onClick={() => applyTimeLockPreset(1440, false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-mono"
                >
                  Open +24 Hours
                </button>
                <button
                  type="button"
                  onClick={() => applyTimeLockPreset(-5, false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-rose-500/30 text-rose-300 font-mono"
                >
                  Expire Deadline Now
                </button>
              </div>
              <input
                type="datetime-local"
                value={lockDeadline}
                onChange={(e) => setLockDeadline(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Active Saved Deadline: {new Date(state.timeLock.deadline).toLocaleString()}
              </span>
            </div>

            {/* Lock Reason / Notification message */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Lock Reason Message for Team Managers
              </label>
              <textarea
                rows={2}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Modification window for participants and competitions has officially closed."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Time-Lock Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. SUB-TAB: COMPETITIONS & EVENTS MANAGER WITH PRIVACY CONTROLS */}
      {activeSubTab === 'events' && (() => {
        const reviewedPendingEvents = state.events.filter(
          (e) =>
            !e.isPublishedToPublic &&
            (e.status === 'Results Published' || e.status === 'Under Review (Admin Only)')
        );
        const publicCount = state.events.filter((e) => e.isPublishedToPublic).length;

        const filteredEvents = state.events.filter((ev) => {
          if (eventFilterStage !== 'all') {
            const evStage = ev.stageType || (ev.category === 'Off-Stage' ? 'Off-Stage' : 'On-Stage');
            if (evStage !== eventFilterStage) return false;
          }
          if (eventFilterDivision !== 'all') {
            const evDiv = ev.targetCategory || 'General';
            if (evDiv !== 'All' && evDiv !== eventFilterDivision) return false;
          }
          return true;
        });

        return (
          <div className="space-y-5">
            {/* PRIVACY & RESULTS RELEASE EXECUTIVE CONTROL DESK */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Judge Results Privacy & Executive Release Control
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Live Public Broadcast Gatekeeper
                </h4>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  When judges declare scores, results remain strictly confidential for Executive Admin inspection.
                  Use individual toggle buttons or the master release trigger below to publish standings and winner posters to participants.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400 font-mono">
                  <span>Total Events: <strong className="text-white">{state.events.length}</strong></span>
                  <span>·</span>
                  <span>Publicly Visible: <strong className="text-emerald-400">{publicCount}</strong></span>
                  <span>·</span>
                  <span>Under Admin Review: <strong className="text-amber-400">{reviewedPendingEvents.length}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                {reviewedPendingEvents.length > 0 && (
                  <button
                    onClick={handlePublishAllReviewed}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Publish All Reviewed ({reviewedPendingEvents.length})</span>
                  </button>
                )}
                {state.events.length > 0 && (
                  <button
                    onClick={handleDeleteAllEvents}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All Events</span>
                  </button>
                )}
                <button
                  onClick={handleOpenAddEvent}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Competition</span>
                </button>
              </div>
            </div>

            {/* Event Filtering Strip */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                <div className="flex items-center gap-2 overflow-x-auto scroll-touch pb-0.5">
                  <span className="text-slate-400 font-medium shrink-0">Stage Type:</span>
                  <div className="flex items-center gap-1">
                    {(['all', 'On-Stage', 'Off-Stage'] as const).map((stage) => (
                      <button
                        key={stage}
                        onClick={() => setEventFilterStage(stage)}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          eventFilterStage === stage
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {stage === 'all' ? 'All Stages' : stage}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scroll-touch pb-0.5">
                  <span className="text-slate-400 font-medium shrink-0">Age Division:</span>
                  <div className="flex items-center gap-1">
                    {(['all', 'Sub-Junior', 'Junior', 'Senior', 'General'] as const).map((div) => (
                      <button
                        key={div}
                        onClick={() => setEventFilterDivision(div)}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          eventFilterDivision === div
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {div === 'all' ? 'All Divisions' : div}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <span className="text-slate-500 font-mono text-[11px] shrink-0">
                Showing {filteredEvents.length} of {state.events.length} competitions
              </span>
            </div>

            {/* Events Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((ev) => {
                const stage = ev.stageType || (ev.category === 'Off-Stage' ? 'Off-Stage' : 'On-Stage');
                const division = ev.targetCategory || 'General';
                const isPublic = ev.isPublishedToPublic ?? true;

                return (
                  <div
                    key={ev.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {ev.category}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              stage === 'Off-Stage'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {stage}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {division}
                          </span>
                        </div>

                        {/* Privacy Switcher Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleEventPublish(ev.id)}
                          title={isPublic ? 'Click to make private' : 'Click to publish to public'}
                          className={`min-h-[36px] text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                            isPublic
                              ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/40'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                          }`}
                        >
                          {isPublic ? (
                            <>
                              <Globe className="w-3.5 h-3.5" />
                              <span>Live on Public</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Release to Public</span>
                            </>
                          )}
                        </button>
                      </div>

                      <h4 className="font-bold text-white text-base">{ev.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {ev.venue} · {ev.date} · {ev.time}
                      </p>

                      <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                        <span className="text-slate-500">Status:</span>
                        <span
                          className={`font-semibold ${
                            ev.status === 'Results Published'
                              ? 'text-emerald-400'
                              : ev.status === 'Under Review (Admin Only)'
                              ? 'text-amber-400 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {ev.status}
                        </span>
                        {!isPublic && (
                          <span className="text-amber-400/90 italic">
                            (Hidden from public view)
                          </span>
                        )}
                      </div>

                      {/* Team Limit & Anonymous Judge Code Mapping */}
                      {(() => {
                        const registered = state.participants.filter((p) =>
                          (p.registeredEventIds || []).includes(ev.id)
                        );
                        const limit = ev.maxParticipantsPerTeam || 2;
                        const codeMap = ev.judgeCodeLetters || {};
                        return (
                          <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 text-[11px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 font-medium">
                                Max Participants / Team
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustEventTeamLimit(ev, -1)}
                                  disabled={limit <= 1}
                                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center border border-slate-700"
                                  title="Decrease max participants per team"
                                >
                                  −
                                </button>
                                <span className="min-w-[2.25rem] text-center font-mono font-bold text-sm text-amber-300 tabular-nums">
                                  {limit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustEventTeamLimit(ev, 1)}
                                  disabled={limit >= 50}
                                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center border border-slate-700"
                                  title="Increase max participants per team"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                              <div className="text-slate-400 flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-500">Judge Blind Codes:</span>
                                {registered.length === 0 ? (
                                  <span className="text-slate-600 italic">No entries yet</span>
                                ) : (
                                  registered.slice(0, 6).map((p) => (
                                    <span
                                      key={p.id}
                                      className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                                      title={`${p.name} (${p.teamName}) -> Judge Code ${codeMap[p.id] || '?'}`}
                                    >
                                      {p.code}→<strong className="text-cyan-300">{codeMap[p.id] || '?'}</strong>
                                    </span>
                                  ))
                                )}
                                {registered.length > 6 && (
                                  <span className="text-[10px] text-slate-500">
                                    +{registered.length - 6} more
                                  </span>
                                )}
                              </div>
                              {registered.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleReshuffleJudgeCodes(ev)}
                                  title="Randomly reassign anonymous alphabet codes for judges"
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700"
                                >
                                  <Shuffle className="w-3.5 h-3.5" />
                                  <span>Reshuffle</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs gap-2 flex-wrap">
                      <span className="text-slate-500">
                        {ev.isGroupEvent ? 'Group Event (Excluded from Pen/Star)' : 'Individual'} · {ev.assignedJudgeIds.length} judges
                      </span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-amber-300 cursor-pointer flex items-center gap-1 border border-slate-700"
                          title="Upload single 1st/2nd/3rd winner poster template for this event"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>{ev.customPosterTemplateUrl ? 'Change Poster' : 'Poster Template'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleDirectEventPosterUpload(ev.id, e)}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => handleOpenEditEvent(ev)}
                          title="Edit Event"
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          title="Delete Event"
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ADD / EDIT EVENT MODAL */}
            {isEventModalOpen && (
              <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      {editingEvent ? 'Edit Fest Competition' : 'Create New Competition'}
                    </h3>
                  </div>

                  <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Competition Title</label>
                      <input
                        type="text"
                        value={eventFormTitle}
                        onChange={(e) => setEventFormTitle(e.target.value)}
                        placeholder="e.g. Battle of the Bands"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Category</label>
                        <select
                          value={eventFormCategory}
                          onChange={(e) => setEventFormCategory(e.target.value as any)}
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="Stage">Stage</option>
                          <option value="Off-Stage">Off-Stage</option>
                          <option value="Music & Dance">Music & Dance</option>
                          <option value="Tech & Coding">Tech & Coding</option>
                          <option value="Literary">Literary</option>
                          <option value="Fine Arts">Fine Arts</option>
                          <option value="Gaming">Gaming</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Stage Type (Award Computation)
                        </label>
                        <select
                          value={eventFormStageType}
                          onChange={(e) => setEventFormStageType(e.target.value as StageType)}
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-bold"
                        >
                          <option value="On-Stage">On-Stage (Counts towards Star of Fest)</option>
                          <option value="Off-Stage">Off-Stage (Counts towards Pen & Star)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Age Division</label>
                        <select
                          value={eventFormTargetCategory}
                          onChange={(e) => setEventFormTargetCategory(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="All">All Categories</option>
                          <option value="Senior">Senior</option>
                          <option value="Junior">Junior</option>
                          <option value="Sub-Junior">Sub-Junior</option>
                          <option value="General">General</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Max Per Team</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={eventFormMaxPerTeam}
                          onChange={(e) =>
                            setEventFormMaxPerTeam(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Status</label>
                        <select
                          value={eventFormStatus}
                          onChange={(e) => setEventFormStatus(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="Upcoming">Upcoming</option>
                          <option value="Ongoing">Ongoing</option>
                          <option value="Judging">Judging</option>
                          <option value="Under Review (Admin Only)">Under Review (Admin Only)</option>
                          <option value="Results Published">Results Published</option>
                        </select>
                      </div>
                    </div>

                    {/* Group Event Toggle (Pen & Star Award Eligibility) */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">Group Competition</span>
                        <span className="text-[11px] text-slate-400">
                          {eventFormIsGroupEvent
                            ? 'Group item: Points count for Team Trophy ONLY (excluded from Pen & Star of the Fest).'
                            : 'Individual item: Eligible for Pen & Star of the Fest if division is Sub-Junior, Junior, or Senior.'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={eventFormIsGroupEvent}
                        onChange={(e) => setEventFormIsGroupEvent(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                      />
                    </div>

                    {/* Privacy Option */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">Publish Results to Public</span>
                        <span className="text-[11px] text-slate-400">
                          {eventFormIsPublished
                            ? 'Results & winner posters will be visible to all visitors without login.'
                            : 'Results remain strictly hidden under Executive Admin review.'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={eventFormIsPublished}
                        onChange={(e) => setEventFormIsPublished(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Venue Location</label>
                      <input
                        type="text"
                        value={eventFormVenue}
                        onChange={(e) => setEventFormVenue(e.target.value)}
                        placeholder="Main Auditorium Stage A"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Date</label>
                        <input
                          type="text"
                          value={eventFormDate}
                          onChange={(e) => setEventFormDate(e.target.value)}
                          placeholder="Day 1 - March 18"
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Time</label>
                        <input
                          type="text"
                          value={eventFormTime}
                          onChange={(e) => setEventFormTime(e.target.value)}
                          placeholder="10:00 AM - 01:00 PM"
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Rules (One per line)</label>
                      <textarea
                        rows={3}
                        value={eventFormRules}
                        onChange={(e) => setEventFormRules(e.target.value)}
                        placeholder="Rule 1&#10;Rule 2"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEventModalOpen(false)}
                        className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                      >
                        Save Competition
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 4B. SUB-TAB: DONATIONS & FUND CONTRIBUTIONS ADMIN */}
      {activeSubTab === 'donations' && (() => {
        const ds = brandingSettings.donationSettings || {
          enabled: true,
          fundGoal: 150000,
          upiId: 'ifest2027@irshadcollege',
          upiName: 'I-FEST 2027 Organizing Committee',
          bankName: 'Federal Bank · Irshad Campus Branch',
          accountNumber: '10290100456814',
          ifscCode: 'FDRL0001029',
          accountHolder: 'Irshad Talent Feista Committee',
          donationNote: 'Every contribution directly supports stage infrastructure, winner trophies, hospitality, and student awards.',
        };
        const donations = Array.isArray(state.donations) ? state.donations : [];

        return (
          <div className="space-y-6 text-xs">
            {/* Payment Channel & Goal Configuration */}
            <form onSubmit={handleSaveBranding} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-amber-400 font-mono font-bold uppercase tracking-wider">
                    Fest Fundraising Settings
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Official UPI, Bank Transfer &amp; Fund Goal Configuration
                  </h3>
                </div>
                {onSwitchTab && (
                  <button
                    type="button"
                    onClick={() => onSwitchTab('donate')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30"
                  >
                    Open Public Donation Portal
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Official UPI ID</label>
                  <input
                    type="text"
                    value={ds.upiId}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, upiId: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">UPI Payee Name</label>
                  <input
                    type="text"
                    value={ds.upiName}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, upiName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bank Account Holder</label>
                  <input
                    type="text"
                    value={ds.accountHolder}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, accountHolder: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bank &amp; Branch Name</label>
                  <input
                    type="text"
                    value={ds.bankName}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, bankName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={ds.accountNumber}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, accountNumber: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={ds.ifscCode}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, ifscCode: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Fund Goal (INR)</label>
                  <input
                    type="number"
                    min={1000}
                    value={ds.fundGoal}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, fundGoal: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Transparency Note</label>
                  <input
                    type="text"
                    value={ds.donationNote}
                    onChange={(e) =>
                      setBrandingSettings({
                        ...brandingSettings,
                        donationSettings: { ...ds, donationNote: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Donation Channel Details</span>
              </button>
            </form>

            {/* Contributions Verification & Cleanup Ledger */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-bold text-white">Manage Recorded Contributions ({donations.length})</h4>
                  <p className="text-slate-400">
                    Verify pending UPI/bank contributions submitted by public visitors or delete dummy records.
                  </p>
                </div>
                {donations.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Delete All Donation Records',
                        message: `Permanently clear all ${donations.length} donation ledger entries?`,
                        confirmText: 'Yes, Clear Donations',
                        type: 'danger',
                        onConfirm: () => {
                          FestStorageService.clearAllDonations();
                          setConfirmConfig(null);
                          onRefreshState();
                          showToast('All donation records deleted cleanly.');
                        },
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Donations</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800">
                {donations.map((don) => (
                  <div key={don.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-sm">
                        {don.donorName} <span className="text-slate-400 font-normal">({don.donorRole})</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        ₹{don.amount.toLocaleString('en-IN')} · {don.paymentMethod}
                        {don.transactionRef ? ` · Ref: ${don.transactionRef}` : ''} · {don.purpose || 'General Fest Fund'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          FestStorageService.verifyDonation(
                            don.id,
                            don.status === 'Verified' ? 'Pending Verification' : 'Verified'
                          );
                          onRefreshState();
                          showToast(`Marked ${don.donorName}'s contribution as ${don.status === 'Verified' ? 'Pending' : 'Verified'}.`);
                        }}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 ${
                          don.status === 'Verified'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{don.status === 'Verified' ? 'Verified' : 'Verify Now'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          FestStorageService.deleteDonation(don.id);
                          onRefreshState();
                          showToast('Contribution entry deleted.');
                        }}
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {donations.length === 0 && (
                  <p className="py-6 text-center text-slate-500">No donation entries recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. SUB-TAB: BRANDING & DYNAMIC TEXTS */}
      {activeSubTab === 'branding' && (
        <form
          onSubmit={handleSaveBranding}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs max-w-3xl"
        >
          <div className="border-b border-slate-800 pb-3">
            <span className="text-amber-400 font-mono font-bold uppercase tracking-wider">
              Branding & Customization
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Global App Branding & Dynamic Static Content
            </h3>
            <p className="text-slate-400 mt-1 leading-relaxed">
              Executive admins can customize overall logo URLs, hero banner visuals, point allocation schemes, contestant code prefix patterns, and static announcement copy in real time without editing source files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Fest Title</label>
              <input
                type="text"
                value={brandingSettings.festName}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, festName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Host College / University</label>
              <input
                type="text"
                value={brandingSettings.collegeName}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, collegeName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Fest Tagline</label>
              <input
                type="text"
                value={brandingSettings.tagline}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, tagline: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Fest Dates</label>
              <input
                type="text"
                value={brandingSettings.festDates}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, festDates: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">App Overall Logo (URL or Upload Image)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={brandingSettings.logoUrl}
                  onChange={(e) =>
                    setBrandingSettings({ ...brandingSettings, logoUrl: e.target.value })
                  }
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                />
                <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer border border-slate-700 shrink-0">
                  Upload
                  <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contestant Code Prefix</label>
              <input
                type="text"
                value={brandingSettings.contestantCodePrefix}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, contestantCodePrefix: e.target.value })
                }
                placeholder="IF27"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Hero Kicker Label</label>
              <input
                type="text"
                value={brandingSettings.heroKicker || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, heroKicker: e.target.value })
                }
                placeholder="Irshad Talent Feista 2027 · Official Portal"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Footer Copyright Text</label>
              <input
                type="text"
                value={brandingSettings.footerCopyright || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, footerCopyright: e.target.value })
                }
                placeholder="I-FEST 2027 - Irshad Talent Feista"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Leaderboard Main Heading</label>
              <input
                type="text"
                value={brandingSettings.leaderboardTitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, leaderboardTitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Leaderboard Subtitle</label>
              <input
                type="text"
                value={brandingSettings.leaderboardSubtitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, leaderboardSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Hero Description Subtitle</label>
              <textarea
                rows={2}
                value={brandingSettings.heroSubtitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, heroSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Pen of the Fest Title</label>
              <input
                type="text"
                value={brandingSettings.penOfFestTitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, penOfFestTitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Star of the Fest Title</label>
              <input
                type="text"
                value={brandingSettings.starOfFestTitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, starOfFestTitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Pen of the Fest Rule Description</label>
              <input
                type="text"
                value={brandingSettings.penOfFestSubtitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, penOfFestSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Star of the Fest Rule Description</label>
              <input
                type="text"
                value={brandingSettings.starOfFestSubtitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, starOfFestSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Star of the Fest Stage Eligibility</label>
              <select
                value={brandingSettings.starOfFestStageScope || 'combined'}
                onChange={(e) =>
                  setBrandingSettings({
                    ...brandingSettings,
                    starOfFestStageScope: e.target.value as 'combined' | 'offstage' | 'onstage',
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="combined">On-Stage + Off-Stage Individual Combined (Sub-Junior/Junior/Senior)</option>
                <option value="offstage">Off-Stage Individual Only (Sub-Junior/Junior/Senior)</option>
                <option value="onstage">On-Stage Individual Only (Sub-Junior/Junior/Senior)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Gallery Heading</label>
              <input
                type="text"
                value={brandingSettings.galleryTitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, galleryTitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Gallery Subtitle</label>
              <input
                type="text"
                value={brandingSettings.gallerySubtitle || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, gallerySubtitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Venue / Location</label>
              <input
                type="text"
                value={brandingSettings.location || ''}
                onChange={(e) =>
                  setBrandingSettings({ ...brandingSettings, location: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Complete Global UI Labels Editor (Every text/title/button across the app) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-cyan-300 block">
                  Complete App UI Labels & Dynamic Text Editor
                </span>
                <p className="text-[11px] text-slate-400">
                  Edit every navigation label, portal card title, badge, section heading, position title, and button across the entire app.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetLabelsToDefault}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
              >
                Reset Labels to Default
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {(Object.keys(DEFAULT_CUSTOM_LABELS) as Array<keyof AppCustomLabels>).map((labelKey) => {
                const readableKey = labelKey.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
                const value = brandingSettings.customLabels?.[labelKey] ?? DEFAULT_CUSTOM_LABELS[labelKey];
                return (
                  <div key={labelKey} className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 truncate" title={readableKey}>
                      {readableKey}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setBrandingSettings({
                          ...brandingSettings,
                          customLabels: {
                            ...(brandingSettings.customLabels || DEFAULT_CUSTOM_LABELS),
                            [labelKey]: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Default Unified 1st/2nd/3rd Poster Template Upload */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-amber-300 block">
              Default Unified Multi-Winner Poster Template (1st, 2nd & 3rd)
            </span>
            <p className="text-[11px] text-slate-400">
              Upload a 3:4 artwork background used by default when generating combined winner posters (you can also override per event inside Competitions Manager or any event poster modal).
            </p>
            <div className="flex items-center gap-3">
              <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer border border-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Unified Poster Template</span>
                <input type="file" accept="image/*" onChange={handleUnifiedTemplateUpload} className="hidden" />
              </label>
              {brandingSettings.unifiedPosterTemplateUrl && (
                <span className="text-[11px] text-emerald-400 font-mono">Template Active</span>
              )}
            </div>
          </div>

          {/* Points Allocation Scheme (Standard First, Second, Third) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="font-bold text-amber-300 block">
              Championship Position Points Allocation Scheme
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">First Position Points</label>
                <input
                  type="number"
                  value={brandingSettings.pointsScheme.first}
                  onChange={(e) =>
                    setBrandingSettings({
                      ...brandingSettings,
                      pointsScheme: {
                        ...brandingSettings.pointsScheme,
                        first: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Second Position Points</label>
                <input
                  type="number"
                  value={brandingSettings.pointsScheme.second}
                  onChange={(e) =>
                    setBrandingSettings({
                      ...brandingSettings,
                      pointsScheme: {
                        ...brandingSettings.pointsScheme,
                        second: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Third Position Points</label>
                <input
                  type="number"
                  value={brandingSettings.pointsScheme.third}
                  onChange={(e) =>
                    setBrandingSettings({
                      ...brandingSettings,
                      pointsScheme: {
                        ...brandingSettings.pointsScheme,
                        third: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-orange-400 font-bold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Announcement Ticker */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Live Fest Announcement Banner</label>
            <textarea
              rows={2}
              value={brandingSettings.announcement}
              onChange={(e) =>
                setBrandingSettings({ ...brandingSettings, announcement: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 flex items-center justify-center gap-1.5 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Global Customizations</span>
            </button>
          </div>
        </form>
      )}

      {/* 6. SUB-TAB: DATABASE & RESETS */}
      {activeSubTab === 'resets' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 text-xs max-w-2xl">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-rose-400 font-mono font-bold uppercase tracking-wider">
              Fest Reset & Database Storage
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Reset Controls & JSON Backup / Restore
            </h3>
            <p className="text-slate-400 mt-1">
              Clear dummy test scores or wipe sample records before the fest commences, or export snapshots.
            </p>
          </div>

          {/* Clear All Dummy Data (Starts Fresh for Custom Entries Only) */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Trash2 className="w-4 h-4 text-amber-400" />
              Clear All Existing / Sample Records (Clean Slate)
            </div>
            <p className="text-slate-300 text-xs">
              Permanently deletes all initial sample judges, competitions, participants, marks, and gallery items so only newly added custom data remains.
            </p>
            <button
              type="button"
              onClick={handleClearDummyData}
              className="mt-2 w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Sample Data Now</span>
            </button>
          </div>

          {/* Critical Feature: Reset Scores & Standings to Zero */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              Reset All Scores & Standings to Zero
            </div>
            <p className="text-slate-400 text-xs">
              Removes all submitted marks and declared winners, resetting event statuses to 'Upcoming'. Participant rosters and competition rules remain intact.
            </p>
            <button
              type="button"
              onClick={handleResetScoresToZero}
              className="mt-2 w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Scores & Points to Zero</span>
            </button>
          </div>

          {/* Backup / Export */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-white block">Download Database JSON</span>
              <p className="text-slate-400 text-[11px]">
                Export complete state (teams, participants, events, marks, and settings).
              </p>
              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full min-h-[42px] py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Backup JSON</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-white block">Restore from JSON File</span>
              <p className="text-slate-400 text-[11px]">
                Import a previously downloaded fest database JSON file.
              </p>
              <label className="w-full min-h-[42px] py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Factory Default Reset */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-slate-300 font-bold block">Reset to Factory Defaults</span>
              <span className="text-[11px] text-slate-500">
                Restores original sample data with Phoenix, Titan, Falcon teams.
              </span>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="min-h-[42px] w-full sm:w-auto px-4 py-2 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-semibold text-xs transition-colors"
            >
              Factory Reset
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          type={confirmConfig.type}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
};
