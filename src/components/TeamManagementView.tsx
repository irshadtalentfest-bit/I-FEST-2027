import React, { useState, useEffect } from 'react';
import { FestState, Participant, UserSession, Team, AgeCategory } from '../types/fest';
import { FestStorageService } from '../services/storage';
import { getAppLabel } from '../utils/labelHelper';
import { getParticipantJudgeCode } from '../utils/judgeCodeHelper';
import { ConfirmModal } from './ConfirmModal';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  Search,
  CheckCircle,
  X,
  ShieldCheck,
  Camera,
  Filter,
} from 'lucide-react';

interface TeamManagementViewProps {
  state: FestState;
  session: UserSession | null;
  onRefreshState: () => void;
  onOpenTimeLockConfig?: () => void;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  state,
  session,
  onRefreshState,
  onOpenTimeLockConfig,
}) => {
  const isAdmin = session?.role === 'admin';
  const isManager = session?.role === 'manager';
  const managerTeamId = session?.teamId;

  // Selected team & category filter
  const [activeTeamId, setActiveTeamId] = useState<string>(
    isManager && managerTeamId ? managerTeamId : 'all'
  );
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add/Edit Participant Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formChestNumber, setFormChestNumber] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
  const [formCategory, setFormCategory] = useState<AgeCategory>('Senior');
  const [formSelectedEvents, setFormSelectedEvents] = useState<string[]>([]);
  const [formPhone, setFormPhone] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const lockStatus = FestStorageService.isRosterLocked(session?.role || 'public');

  // Compute time remaining if deadline exists
  const getDeadlineText = () => {
    if (!state.timeLock.deadline) return 'No deadline set';
    const deadlineDate = new Date(state.timeLock.deadline);
    const diffMs = deadlineDate.getTime() - nowMs;
    if (diffMs <= 0) return 'Deadline expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining until lock`;
  };

  const handleOpenAddModal = (targetTeamId?: string) => {
    setEditingParticipant(null);
    const teamIdToUse = targetTeamId || (isManager && managerTeamId ? managerTeamId : state.teams[0]?.id);
    const team = state.teams.find((t) => t.id === teamIdToUse);
    const nextNumber = state.participants.filter((p) => p.teamId === teamIdToUse).length + 101;
    const suggestedCode = `${team ? team.codePrefix : 'X'}-${nextNumber}`;

    setFormName('');
    setFormCode(suggestedCode);
    setFormChestNumber(`${nextNumber}`);
    setFormTeamId(teamIdToUse);
    setFormCategory('Senior');
    setFormSelectedEvents([]);
    setFormPhone('');
    setFormPhotoUrl('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setFormName(p.name);
    setFormCode(p.code);
    setFormChestNumber(p.chestNumber || p.code.replace(/^[A-Z]-/, ''));
    setFormTeamId(p.teamId);
    setFormCategory(p.category);
    setFormSelectedEvents(p.registeredEventIds || []);
    setFormPhone(p.phone || '');
    setFormPhotoUrl(p.photoUrl || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImageFile } = await import('../utils/mediaStorage');
      const compressed = await compressImageFile(file, 800, 0.85);
      setFormPhotoUrl(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Please enter contestant full name.');
      return;
    }
    if (!formCode.trim()) {
      setFormError('Contestant code cannot be empty.');
      return;
    }

    const team = state.teams.find((t) => t.id === formTeamId);
    if (!team) {
      setFormError('Invalid team selected.');
      return;
    }

    const chestNum = formChestNumber.trim() || formCode.trim().replace(/^[A-Z]-/, '');

    // Pre-validate team member limit per event before saving
    for (const evId of formSelectedEvents) {
      const ev = state.events.find((item) => item.id === evId);
      if (!ev || !ev.maxParticipantsPerTeam) continue;
      const otherTeamCount = state.participants.filter(
        (p) =>
          p.id !== editingParticipant?.id &&
          p.teamId === team.id &&
          (p.registeredEventIds || []).includes(evId)
      ).length;
      if (otherTeamCount >= ev.maxParticipantsPerTeam) {
        setFormError(
          `Team limit exceeded for "${ev.title}": maximum ${ev.maxParticipantsPerTeam} participant(s) allowed per team (${team.name} already has ${otherTeamCount}/${ev.maxParticipantsPerTeam}).`
        );
        return;
      }
    }

    const participant: Participant = {
      id: editingParticipant ? editingParticipant.id : `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      chestNumber: chestNum,
      teamId: team.id,
      teamName: team.name,
      category: formCategory,
      registeredEventIds: formSelectedEvents,
      photoUrl: formPhotoUrl,
      phone: formPhone.trim(),
      createdAt: editingParticipant ? editingParticipant.createdAt : new Date().toISOString(),
    };

    const res = FestStorageService.saveParticipant(participant, session?.role || 'public');
    if (!res.success) {
      setFormError(res.error || 'Failed to save contestant.');
      return;
    }

    setIsModalOpen(false);
    onRefreshState();
  };

  const handleDeleteParticipant = (participantId: string, participantName: string) => {
    setDeleteTarget({ id: participantId, name: participantName });
  };

  const confirmDeleteParticipant = () => {
    if (!deleteTarget) return;
    const res = FestStorageService.deleteParticipant(deleteTarget.id, session?.role || 'public');
    setDeleteTarget(null);
    if (!res.success) {
      setActionError(res.error || 'Failed to delete participant.');
      setTimeout(() => setActionError(null), 4000);
      return;
    }
    onRefreshState();
  };

  // Filter participants
  const filteredParticipants = state.participants.filter((p) => {
    const matchesTeam = activeTeamId === 'all' || p.teamId === activeTeamId;
    const matchesCategory = activeCategoryFilter === 'All' || p.category === activeCategoryFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.chestNumber && p.chestNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.teamName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesCategory && matchesSearch;
  });

  const canEdit = isAdmin || (!lockStatus.locked && isManager);
  const categoriesList = ['All', 'Senior', 'Junior', 'Sub-Junior', 'General'];

  return (
    <div className="space-y-6">
      {/* SECTION HEADING */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400">
            Team Squads &amp; Chest Numbers
          </span>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">
            {getAppLabel(state.settings, 'teamsRosterHeading')}
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Total Registered: <strong className="text-white">{state.participants.length}</strong> Contestants
        </span>
      </div>

      {/* TIME-LOCK STATUS BAR */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
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
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {lockStatus.locked ? 'Roster Time-Lock Active' : 'Team Roster Window Open'}
              </span>
              {isAdmin && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> 24/7 Executive Override
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lockStatus.locked
                ? 'Modifications for team managers are locked to finalize master fest schedules.'
                : `Deadline: ${new Date(state.timeLock.deadline).toLocaleString()} (${getDeadlineText()}).`}
            </p>
          </div>
        </div>

        {isAdmin && onOpenTimeLockConfig && (
          <button
            onClick={onOpenTimeLockConfig}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-700 whitespace-nowrap shrink-0 transition-colors shadow-sm w-full sm:w-auto"
          >
            Configure Time Lock Window
          </button>
        )}
      </div>

      {/* TEAM SELECTOR TABS & SEARCH */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Team Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-touch p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            {!isManager && (
              <button
                onClick={() => setActiveTeamId('all')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTeamId === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Teams ({state.participants.length})
              </button>
            )}

            {state.teams.map((t) => {
              const count = state.participants.filter((p) => p.teamId === t.id).length;
              const isSelected = activeTeamId === t.id;
              const isUserTeam = isManager && managerTeamId === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTeamId(t.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-white text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span>{t.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">[{t.codePrefix}]</span>
                  <span className="text-[10px] font-mono">({count})</span>
                  {isUserTeam && <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded">My Team</span>}
                </button>
              );
            })}
          </div>

          {/* Search & Add Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, code, chest #..."
                className="w-full min-h-[42px] pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {canEdit && (
              <button
                onClick={() => handleOpenAddModal(activeTeamId !== 'all' ? activeTeamId : undefined)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-1.5 transition-all shadow-md whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contestant</span>
              </button>
            )}
          </div>
        </div>

        {/* REQUIREMENT 3: CATEGORY FILTERING (Senior, Junior, Sub-Junior, General) */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-touch text-xs py-1">
          <span className="text-[11px] font-mono text-slate-500 uppercase flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Division:
          </span>
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeCategoryFilter === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE CARD LIST (< md) */}
      <div className="md:hidden space-y-3">
        {filteredParticipants.length > 0 ? (
          filteredParticipants.map((p) => {
            const team = state.teams.find((t) => t.id === p.teamId);
            const isUserTeam = isManager && managerTeamId === p.teamId;
            const canModifyThisRow = isAdmin || (!lockStatus.locked && isUserTeam);

            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900/95 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm shrink-0">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          #{p.chestNumber || p.code.replace(/^[A-Z]-/, '')}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">[{p.code}]</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                          {p.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm truncate mt-0.5">{p.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: team?.color || '#cbd5e1' }}
                        />
                        <span className="truncate">{p.teamName}</span>
                        {p.phone && <span className="text-[10px] font-mono text-slate-500">· {p.phone}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {p.registeredEventIds && p.registeredEventIds.length > 0 ? (
                    p.registeredEventIds.map((evId) => {
                      const ev = state.events.find((e) => e.id === evId);
                      const judgeCode = isAdmin && ev ? getParticipantJudgeCode(ev, p.id) : null;
                      return (
                        <span
                          key={evId}
                          className="text-[10px] px-2 py-1 rounded-md bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          {ev?.title || evId}
                          {judgeCode ? ` [Judge: ${judgeCode}]` : ''}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No events registered</span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                  {canModifyThisRow ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(p)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteParticipant(p.id, p.name)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 py-1">
                      <Lock className="w-3.5 h-3.5" /> Roster Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 text-center py-10 px-4 text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
            <p className="text-xs">No contestants found matching criteria.</p>
          </div>
        )}
      </div>

      {/* PARTICIPANTS TABLE (>= md) */}
      <div className="hidden md:block rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto scroll-touch">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Chest # / Code</th>
                <th className="px-5 py-3.5">Contestant Profile</th>
                <th className="px-5 py-3.5">Team</th>
                <th className="px-5 py-3.5">Age Division</th>
                <th className="px-5 py-3.5">Registered Competitions</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map((p) => {
                  const team = state.teams.find((t) => t.id === p.teamId);
                  const isUserTeam = isManager && managerTeamId === p.teamId;
                  const canModifyThisRow = isAdmin || (!lockStatus.locked && isUserTeam);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Chest Number & Code */}
                      <td className="px-5 py-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 text-sm">
                            #{p.chestNumber || p.code.replace(/^[A-Z]-/, '')}
                          </span>
                          <span className="text-[10px] text-slate-500">[{p.code}]</span>
                        </div>
                      </td>

                      {/* Name & Photo */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {p.photoUrl ? (
                            <img
                              src={p.photoUrl}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                              {p.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <span className="font-semibold text-white block">{p.name}</span>
                            {p.phone && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {p.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Team */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team?.color || '#cbd5e1' }}
                          />
                          <span className="font-medium">{p.teamName}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                          {p.category}
                        </span>
                      </td>

                      {/* Events */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.registeredEventIds && p.registeredEventIds.length > 0 ? (
                            p.registeredEventIds.map((evId) => {
                              const ev = state.events.find((e) => e.id === evId);
                              const judgeCode = isAdmin && ev ? getParticipantJudgeCode(ev, p.id) : null;
                              return (
                                <span
                                  key={evId}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate"
                                  title={ev?.title}
                                >
                                  {ev?.title || evId}
                                  {judgeCode ? ` [Judge: ${judgeCode}]` : ''}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">None registered</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        {canModifyThisRow ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit contestant"
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteParticipant(p.id, p.name)}
                              title="Delete contestant"
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600 flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                    <p className="text-xs">No contestants found matching criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT CONTESTANT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92dvh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                {editingParticipant ? 'Edit Contestant Details' : 'Add New Contestant'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParticipant} className="p-4 sm:p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  {formError}
                </div>
              )}

              {/* Team selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Affiliated Team</label>
                <select
                  value={formTeamId}
                  onChange={(e) => {
                    const newTeamId = e.target.value;
                    setFormTeamId(newTeamId);
                    const t = state.teams.find((team) => team.id === newTeamId);
                    if (t && !editingParticipant) {
                      const count = state.participants.filter((p) => p.teamId === newTeamId).length + 101;
                      setFormCode(`${t.codePrefix}-${count}`);
                      setFormChestNumber(`${count}`);
                    }
                  }}
                  disabled={isManager && !isAdmin}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  {state.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Code Prefix: {t.codePrefix})
                    </option>
                  ))}
                </select>
              </div>

              {/* Contestant Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Contestant Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Maya Varma"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  required
                />
              </div>

              {/* Chest Number, Contestant Code & Division */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Chest Number</label>
                  <input
                    type="text"
                    value={formChestNumber}
                    onChange={(e) => setFormChestNumber(e.target.value)}
                    placeholder="e.g. 104"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. A-104"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Division</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AgeCategory)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Senior">Senior</option>
                    <option value="Junior">Junior</option>
                    <option value="Sub-Junior">Sub-Junior</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Contestant Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  {formPhotoUrl ? (
                    <img
                      src={formPhotoUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-amber-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Phone / Contact */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Contact Phone (Optional)</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Registered Competitions (Enforces Executive Admin Max Per Team Limit) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-300 font-medium">Registered Events</label>
                  <span className="text-[10px] font-mono text-slate-400">
                    Subject to per-event team limits
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  {state.events.map((ev) => {
                    const isChecked = formSelectedEvents.includes(ev.id);
                    const limit = ev.maxParticipantsPerTeam || 2;
                    const otherTeamCount = state.participants.filter(
                      (p) =>
                        p.id !== editingParticipant?.id &&
                        p.teamId === formTeamId &&
                        (p.registeredEventIds || []).includes(ev.id)
                    ).length;
                    const isFullForTeam = otherTeamCount >= limit;
                    const currentTotalCount = otherTeamCount + (isChecked ? 1 : 0);

                    return (
                      <label
                        key={ev.id}
                        className={`min-h-[44px] flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
                          isFullForTeam && !isChecked
                            ? 'opacity-50 cursor-not-allowed bg-slate-900/40'
                            : 'hover:bg-slate-900 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isFullForTeam && !isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (isFullForTeam) {
                                setFormError(
                                  `Cannot add "${ev.title}": team limit of ${limit} participant(s) reached.`
                                );
                                return;
                              }
                              setFormError(null);
                              setFormSelectedEvents([...formSelectedEvents, ev.id]);
                            } else {
                              setFormError(null);
                              setFormSelectedEvents(formSelectedEvents.filter((id) => id !== ev.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-white text-xs block truncate">{ev.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ev.stageType || 'On-Stage'} · {ev.targetCategory || ev.category}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold shrink-0 ${
                            isFullForTeam && !isChecked
                              ? 'text-rose-400'
                              : currentTotalCount >= limit
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {isFullForTeam && !isChecked
                            ? `Team Full (${otherTeamCount}/${limit})`
                            : `${currentTotalCount}/${limit} team quota`}
                        </span>
                      </label>
                    );
                  })}
                  {state.events.length === 0 && (
                    <p className="text-[11px] text-slate-500 text-center py-3">
                      No competitions created yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 transition-colors shadow-md"
                >
                  Save Contestant
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
        title="Remove Contestant Permanently"
        message={
          deleteTarget
            ? `Are you sure you want to permanently remove "${deleteTarget.name}" from the team roster and clear their event registrations and scores?`
            : ''
        }
        confirmText="Yes, Remove Contestant"
        onConfirm={confirmDeleteParticipant}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
