import React, { useState, useEffect } from 'react';
import {
  FestState,
  FestEvent,
  UserSession,
  AgeCategory,
  StageType,
} from '../types/fest';
import { FestStorageService } from '../services/storage';
import { getAppLabel } from '../utils/labelHelper';
import { ConfirmModal } from './ConfirmModal';
import { WinnerPosterModal } from './WinnerPosterModal';
import {
  Calendar,
  MapPin,
  Clock,
  Lock,
  Unlock,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Download,
  X,
  AlertTriangle,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface CompetitionsScheduleViewProps {
  state: FestState;
  session: UserSession | null;
  onRefreshState: () => void;
  onOpenTimeLockConfig?: () => void;
}

export const CompetitionsScheduleView: React.FC<CompetitionsScheduleViewProps> = ({
  state,
  session,
  onRefreshState,
  onOpenTimeLockConfig,
}) => {
  const isAdmin = session?.role === 'admin';
  const isManager = session?.role === 'manager';

  // Tick every 15s so expiry is enforced live in UI without page reload
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const lockStatus = FestStorageService.isRosterLocked(session?.role || 'public');
  const canModifyCompetitions = isAdmin || (isManager && !lockStatus.locked);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'All' | 'On-Stage' | 'Off-Stage'>('All');
  const [divisionFilter, setDivisionFilter] = useState<'All' | AgeCategory>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FestEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<FestEvent['category']>('Stage');
  const [formStageType, setFormStageType] = useState<StageType>('On-Stage');
  const [formTargetCategory, setFormTargetCategory] = useState<AgeCategory | 'All'>('Senior');
  const [formIsGroupEvent, setFormIsGroupEvent] = useState(false);
  const [formVenue, setFormVenue] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formMaxParticipants, setFormMaxParticipants] = useState(2);
  const [formRules, setFormRules] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete & Poster modals
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [posterEvent, setPosterEvent] = useState<FestEvent | null>(null);

  const s = state.settings;

  const getDeadlineText = () => {
    if (!state.timeLock.deadline) return 'No deadline set';
    const deadlineDate = new Date(state.timeLock.deadline);
    const diffMs = deadlineDate.getTime() - nowMs;
    if (diffMs <= 0) return 'Deadline expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining before automatic lock`;
  };

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormCategory('Stage');
    setFormStageType('On-Stage');
    setFormTargetCategory('Senior');
    setFormIsGroupEvent(false);
    setFormVenue('Main Auditorium');
    setFormDate('Day 1 - March 18');
    setFormTime('10:00 AM - 12:00 PM');
    setFormMaxParticipants(2);
    setFormRules('Time limit: 5 minutes.\nJudged on creativity, clarity, and stage discipline.');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ev: FestEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormCategory(ev.category);
    setFormStageType(ev.stageType || 'On-Stage');
    setFormTargetCategory(ev.targetCategory || 'Senior');
    setFormIsGroupEvent(!!ev.isGroupEvent);
    setFormVenue(ev.venue);
    setFormDate(ev.date);
    setFormTime(ev.time);
    setFormMaxParticipants(ev.maxParticipantsPerTeam || 2);
    setFormRules((ev.rules || []).join('\n'));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Competition title cannot be empty.');
      return;
    }
    if (!formVenue.trim()) {
      setFormError('Venue location is required.');
      return;
    }

    const rulesArray = formRules
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const payload: FestEvent = editingEvent
      ? {
          ...editingEvent,
          title: formTitle.trim(),
          category: formCategory,
          stageType: formStageType,
          targetCategory: formTargetCategory,
          isGroupEvent: formIsGroupEvent,
          venue: formVenue.trim(),
          date: formDate.trim(),
          time: formTime.trim(),
          maxParticipantsPerTeam: Math.max(1, formMaxParticipants || 1),
          rules: rulesArray,
        }
      : {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          title: formTitle.trim(),
          category: formCategory,
          stageType: formStageType,
          targetCategory: formTargetCategory,
          venue: formVenue.trim(),
          date: formDate.trim() || 'Day 1 - March 18',
          time: formTime.trim() || '10:00 AM',
          rules: rulesArray,
          status: 'Upcoming',
          isPublishedToPublic: false,
          isGroupEvent: formIsGroupEvent,
          maxParticipantsPerTeam: Math.max(1, formMaxParticipants || 1),
          criteria: [
            { id: 'c-1', name: 'Presentation & Concept', maxMarks: 35 },
            { id: 'c-2', name: 'Skill & Execution', maxMarks: 35 },
            { id: 'c-3', name: 'Overall Impression', maxMarks: 30 },
          ],
          assignedJudgeIds: state.judges.map((j) => j.id),
        };

    const res = FestStorageService.saveEvent(payload, session?.role || 'public');
    if (!res.success) {
      setFormError(res.error || 'Could not save competition.');
      return;
    }

    setIsModalOpen(false);
    onRefreshState();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const res = FestStorageService.deleteEvent(deleteTarget.id, session?.role || 'public');
    setDeleteTarget(null);
    if (!res.success) {
      setActionError(res.error || 'Failed to delete competition.');
      setTimeout(() => setActionError(null), 4000);
      return;
    }
    onRefreshState();
  };

  const categories = ['All', 'Music & Dance', 'Literary', 'Fine Arts', 'Stage', 'Off-Stage', 'Tech & Coding', 'Gaming'];

  const filteredEvents = state.events.filter((ev) => {
    const matchesStage = stageFilter === 'All' || ev.stageType === stageFilter;
    const matchesDivision =
      divisionFilter === 'All' || ev.targetCategory === divisionFilter || ev.targetCategory === 'All';
    const matchesCat = categoryFilter === 'All' || ev.category === categoryFilter;
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesDivision && matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            Programs &amp; Stage Schedule
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {getAppLabel(s, 'eventsScheduleHeading')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {getAppLabel(s, 'eventsScheduleSubtitle')}
          </p>
        </div>

        {canModifyCompetitions && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Competition</span>
          </button>
        )}
      </div>

      {/* Time-Lock Governance Banner (Shown to Admins, Team Managers, or when locked) */}
      {(isAdmin || isManager) && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            lockStatus.locked
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                lockStatus.locked ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {lockStatus.locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">
                  {lockStatus.locked
                    ? 'Competition & Roster Editing Locked'
                    : 'Competition & Roster Editing Window Open'}
                </span>
                {isAdmin && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" /> 24/7 Executive Override
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAdmin
                  ? `Executive Admins maintain permanent 24/7 permission to add, edit, or delete competitions even after Team Manager deadline (${new Date(state.timeLock.deadline).toLocaleString()}).`
                  : lockStatus.locked
                  ? `${lockStatus.reason} Team Managers can no longer modify competitions.`
                  : `Deadline: ${new Date(state.timeLock.deadline).toLocaleString()} (${getDeadlineText()}).`}
              </p>
            </div>
          </div>

          {isAdmin && onOpenTimeLockConfig && (
            <button
              onClick={onOpenTimeLockConfig}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-700 whitespace-nowrap shrink-0 transition-colors"
            >
              Configure Time Lock
            </button>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] font-mono text-slate-500 uppercase mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative md:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competition, venue..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-mono text-slate-500 uppercase mr-1">Division:</span>
            {(['All', 'Sub-Junior', 'Junior', 'Senior', 'General'] as const).map((div) => (
              <button
                key={div}
                onClick={() => setDivisionFilter(div)}
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap shrink-0 font-medium transition-colors ${
                  divisionFilter === div
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {div}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase mr-1">Stage:</span>
            {(['All', 'On-Stage', 'Off-Stage'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStageFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap shrink-0 font-medium transition-colors ${
                  stageFilter === st
                    ? 'bg-purple-500 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((ev) => {
          const isPublicResult = ev.isPublishedToPublic && ev.status === 'Results Published';
          const canSeeWinners = !!ev.winners && (isPublicResult || isAdmin);

          return (
            <div
              key={ev.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                {/* Quiet unboxed metadata strip */}
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-amber-400 font-semibold">{ev.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ev.stageType || 'On-Stage'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-cyan-300">{ev.targetCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ev.isGroupEvent ? 'Group' : 'Individual'}</span>
                  </div>
                  <span
                    className={`font-semibold ${
                      isPublicResult
                        ? 'text-emerald-400'
                        : ev.status === 'Under Review (Admin Only)'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {isPublicResult ? 'Results Published' : ev.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight">{ev.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {ev.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {ev.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {ev.venue}
                  </span>
                </div>

                {ev.rules && ev.rules.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/70 space-y-1">
                    <div className="text-[11px] font-mono text-slate-500 uppercase flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Official Rules
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {ev.rules.map((r, i) => (
                        <li key={i} className="leading-snug">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  Max {ev.maxParticipantsPerTeam || 2} per team
                </span>

                <div className="flex items-center gap-2">
                  {canSeeWinners && (
                    <button
                      type="button"
                      onClick={() => setPosterEvent(ev)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{getAppLabel(s, 'combinedPosterButton')}</span>
                    </button>
                  )}

                  {canModifyCompetitions && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ev)}
                        title="Edit Competition"
                        aria-label={`Edit ${ev.title}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: ev.id, title: ev.title })}
                        title="Delete Competition"
                        aria-label={`Delete ${ev.title}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="md:col-span-2 p-10 text-center rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-xs text-slate-500 space-y-3">
            <Sparkles className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
            <p>No competitions found matching your selected filters.</p>
            {canModifyCompetitions && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Competition</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Competition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl my-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {editingEvent ? 'Edit Competition Details' : 'Add New Competition'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Competition Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Classical Solo Vocal"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as FestEvent['category'])}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Stage">Stage</option>
                    <option value="Off-Stage">Off-Stage</option>
                    <option value="Music & Dance">Music &amp; Dance</option>
                    <option value="Literary">Literary</option>
                    <option value="Fine Arts">Fine Arts</option>
                    <option value="Tech & Coding">Tech &amp; Coding</option>
                    <option value="Gaming">Gaming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Stage Type</label>
                  <select
                    value={formStageType}
                    onChange={(e) => setFormStageType(e.target.value as StageType)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="On-Stage">On-Stage</option>
                    <option value="Off-Stage">Off-Stage</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Age Division</label>
                  <select
                    value={formTargetCategory}
                    onChange={(e) => setFormTargetCategory(e.target.value as AgeCategory | 'All')}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Sub-Junior">Sub-Junior</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="General">General</option>
                    <option value="All">All Categories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Max Per Team {!isAdmin && <span className="text-[10px] text-amber-400">(Admin Only)</span>}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formMaxParticipants}
                    onChange={(e) =>
                      setFormMaxParticipants(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))
                    }
                    disabled={!isAdmin}
                    title={
                      isAdmin
                        ? 'Maximum participants allowed per team for this competition'
                        : 'Only Executive Admins can configure team member limits'
                    }
                    className={`w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono focus:outline-none focus:border-amber-500 ${
                      isAdmin ? 'text-white' : 'text-slate-500 cursor-not-allowed opacity-75'
                    }`}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">Group Competition</span>
                  <span className="text-[11px] text-slate-400">
                    {formIsGroupEvent
                      ? 'Excluded from Pen of the Fest & Star of the Fest.'
                      : 'Individual competition (eligible for Pen/Star awards if Sub-Junior/Junior/Senior).'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsGroupEvent}
                  onChange={(e) => setFormIsGroupEvent(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-500 bg-slate-900 border-slate-700 cursor-pointer shrink-0"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Venue</label>
                <input
                  type="text"
                  value={formVenue}
                  onChange={(e) => setFormVenue(e.target.value)}
                  placeholder="Main Auditorium"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="Day 1 - March 18"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Time</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="10:00 AM - 12:00 PM"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Official Rules (One per line)</label>
                <textarea
                  rows={3}
                  value={formRules}
                  onChange={(e) => setFormRules(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  Save Competition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionError && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Competition Permanently"
        message={
          deleteTarget
            ? `Are you sure you want to permanently remove "${deleteTarget.title}" and clear its registrations and marks?`
            : ''
        }
        confirmText="Yes, Delete Competition"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {posterEvent && (
        <WinnerPosterModal
          isOpen={!!posterEvent}
          onClose={() => setPosterEvent(null)}
          event={posterEvent}
          settings={state.settings}
          isAdmin={isAdmin}
          initialPosition="All"
        />
      )}
    </div>
  );
};
