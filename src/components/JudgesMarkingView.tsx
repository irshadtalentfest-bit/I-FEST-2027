import React, { useState, useEffect } from 'react';
import { FestState, Participant, UserSession, WinnerDetail } from '../types/fest';
import { FestStorageService } from '../services/storage';
import { getAppLabel } from '../utils/labelHelper';
import { getParticipantJudgeCode } from '../utils/judgeCodeHelper';
import {
  Scale,
  Award,
  CheckCircle,
  FileCheck,
  Trophy,
  Save,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface JudgesMarkingViewProps {
  state: FestState;
  session: UserSession | null;
  onRefreshState: () => void;
}

export const JudgesMarkingView: React.FC<JudgesMarkingViewProps> = ({
  state,
  session,
  onRefreshState,
}) => {
  const isAdmin = session?.role === 'admin';
  const isJudge = session?.role === 'judge';
  const judgeId = session?.judgeId;

  const accessibleEvents = state.events.filter((ev) => {
    if (isAdmin) return true;
    if (isJudge && judgeId) {
      return ev.assignedJudgeIds.length === 0 || ev.assignedJudgeIds.includes(judgeId);
    }
    return false;
  });

  const [selectedEventId, setSelectedEventId] = useState<string>(
    accessibleEvents[0]?.id || ''
  );

  useEffect(() => {
    if (accessibleEvents.length === 0) {
      setSelectedEventId('');
    } else if (!accessibleEvents.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(accessibleEvents[0].id);
    }
  }, [accessibleEvents, selectedEventId]);

  const selectedEvent = state.events.find((e) => e.id === selectedEventId);

  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Declare Winners Modal state
  const [isDeclareModalOpen, setIsDeclareModalOpen] = useState(false);
  const [firstWinnerId, setFirstWinnerId] = useState<string>('');
  const [secondWinnerId, setSecondWinnerId] = useState<string>('');
  const [thirdWinnerId, setThirdWinnerId] = useState<string>('');
  const [declareNotes, setDeclareNotes] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Sort contestants alphabetically by anonymous code letter so team insertion order never leaks
  const registeredParticipants = state.participants
    .filter((p) => selectedEvent && p.registeredEventIds.includes(selectedEvent.id))
    .sort((a, b) => {
      const codeA = getParticipantJudgeCode(selectedEvent, a.id);
      const codeB = getParticipantJudgeCode(selectedEvent, b.id);
      return codeA.localeCompare(codeB);
    });

  const rankings = selectedEvent
    ? FestStorageService.getEventContestantRankings(selectedEvent.id, state)
    : [];

  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipantId(participant.id);
    setSaveSuccessMsg(null);

    const currentJudgeId = judgeId || 'judge-admin';
    const existingMark = state.marks.find(
      (m) =>
        m.eventId === selectedEvent?.id &&
        m.participantId === participant.id &&
        (isAdmin ? true : m.judgeId === currentJudgeId)
    );

    if (existingMark) {
      setCriteriaScores(existingMark.criteriaScores || {});
      setRemarks(existingMark.remarks || '');
    } else {
      const initial: Record<string, number> = {};
      selectedEvent?.criteria.forEach((c) => {
        initial[c.id] = Math.round(c.maxMarks * 0.8);
      });
      setCriteriaScores(initial);
      setRemarks('');
    }
  };

  const handleScoreChange = (criteriaId: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    setCriteriaScores((prev) => ({
      ...prev,
      [criteriaId]: clamped,
    }));
  };

  const totalCalculatedScore = Object.values(criteriaScores).reduce((acc, curr) => acc + (curr || 0), 0);
  const maxPossibleScore = selectedEvent?.criteria.reduce((acc, curr) => acc + curr.maxMarks, 0) || 100;

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedParticipantId) return;

    const currentJudge = state.judges.find((j) => j.id === judgeId);
    const judgeName = currentJudge ? currentJudge.name : session?.name || 'Jury Panel';

    FestStorageService.submitMark({
      eventId: selectedEvent.id,
      participantId: selectedParticipantId,
      judgeId: judgeId || 'jury-admin',
      judgeName,
      criteriaScores,
      totalScore: totalCalculatedScore,
      remarks,
    });

    setSaveSuccessMsg('Official marks submitted and saved successfully in real-time!');
    onRefreshState();
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleOpenDeclareModal = () => {
    if (!selectedEvent) return;
    setFirstWinnerId(rankings[0]?.participant.id || '');
    setSecondWinnerId(rankings[1]?.participant.id || '');
    setThirdWinnerId(rankings[2]?.participant.id || '');
    setDeclareNotes('Jury validated results and official declarations confirmed.');
    setIsDeclareModalOpen(true);
  };

  const handleConfirmDeclare = () => {
    if (!selectedEvent) return;

    const p1 = state.participants.find((p) => p.id === firstWinnerId);
    const p2 = state.participants.find((p) => p.id === secondWinnerId);
    const p3 = state.participants.find((p) => p.id === thirdWinnerId);

    const r1 = rankings.find((r) => r.participant.id === firstWinnerId);
    const r2 = rankings.find((r) => r.participant.id === secondWinnerId);
    const r3 = rankings.find((r) => r.participant.id === thirdWinnerId);

    const winners: { first?: WinnerDetail; second?: WinnerDetail; third?: WinnerDetail; notes?: string } = {};

    if (p1) {
      winners.first = {
        participantId: p1.id,
        participantName: p1.name,
        teamId: p1.teamId,
        teamName: p1.teamName,
        code: p1.code,
        chestNumber: p1.chestNumber,
        score: r1?.totalAverageScore || 95,
      };
    }

    if (p2) {
      winners.second = {
        participantId: p2.id,
        participantName: p2.name,
        teamId: p2.teamId,
        teamName: p2.teamName,
        code: p2.code,
        chestNumber: p2.chestNumber,
        score: r2?.totalAverageScore || 90,
      };
    }

    if (p3) {
      winners.third = {
        participantId: p3.id,
        participantName: p3.name,
        teamId: p3.teamId,
        teamName: p3.teamName,
        code: p3.code,
        chestNumber: p3.chestNumber,
        score: r3?.totalAverageScore || 85,
      };
    }

    const shouldPublishNow = isAdmin && publishImmediately;
    FestStorageService.declareEventResults(
      selectedEvent.id,
      winners,
      session?.name || 'Central Jury',
      shouldPublishNow
    );
    setIsDeclareModalOpen(false);
    onRefreshState();
  };

  const selectedParticipant = registeredParticipants.find((p) => p.id === selectedParticipantId);
  const selectedCodeLetter = selectedParticipant
    ? getParticipantJudgeCode(selectedEvent, selectedParticipant.id)
    : '';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
              {getAppLabel(state.settings, 'judgesDeskHeading')}
              {isJudge && !isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  Blind Evaluation Mode ({session?.name})
                </span>
              )}
              {isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Executive Chief Jury Mode
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {isJudge && !isAdmin
                ? 'Identity protection active: contestant names, teams, and institutions are masked. Score entries strictly by anonymous Code Letter.'
                : getAppLabel(state.settings, 'judgesDeskSubtitle')}
            </p>
          </div>
        </div>

        {selectedEvent && (isAdmin || isJudge) && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenDeclareModal}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-1.5 transition-all shadow-md whitespace-nowrap shrink-0"
            >
              <Trophy className="w-4 h-4" />
              <span>Declare Official Results</span>
            </button>
          </div>
        )}
      </div>

      {/* Blind Judging Privacy Notice for Judges */}
      {isJudge && !isAdmin && (
        <div className="px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Unbiased Anonymous Judging:</strong> Participant names, teams, chest numbers, and institutions are completely hidden. Evaluate performances solely using each entry&apos;s randomized alphabet Code Letter.
          </span>
        </div>
      )}

      {/* EVENT SELECTOR TABS */}
      <div>
        <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
          Select Competition Event
        </label>
        <div className="flex items-center gap-2 overflow-x-auto scroll-touch pb-1.5 text-xs">
          {accessibleEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => {
                setSelectedEventId(ev.id);
                setSelectedParticipantId('');
                setSaveSuccessMsg(null);
              }}
              className={`min-h-[48px] p-3 rounded-xl border text-left whitespace-nowrap transition-all shrink-0 ${
                selectedEventId === ev.id
                  ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-md'
                  : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold">{ev.title}</div>
              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                <span className="font-mono text-emerald-400">{ev.category}</span>
                <span>·</span>
                <span>{ev.stageType || 'On-Stage'}</span>
                <span>·</span>
                <span>{ev.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedEvent ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CONTESTANT CODE LIST */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {isAdmin ? `Registered Contestants (${registeredParticipants.length})` : `Anonymous Entries (${registeredParticipants.length})`}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Click code to score</span>
              </div>

              <div className="space-y-2 max-h-[380px] lg:max-h-[500px] overflow-y-auto pr-0.5">
                {registeredParticipants.length > 0 ? (
                  registeredParticipants.map((p) => {
                    const isSelected = selectedParticipantId === p.id;
                    const r = rankings.find((rank) => rank.participant.id === p.id);
                    const hasSubmitted = r && r.judgeSubmissions.length > 0;
                    const codeLetter = getParticipantJudgeCode(selectedEvent, p.id);

                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectParticipant(p)}
                        className={`w-full min-h-[58px] p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/20 text-white ring-1 ring-emerald-500'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-black text-base flex items-center justify-center shrink-0">
                            {codeLetter}
                          </div>
                          <div>
                            {isAdmin ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-white">{p.name}</span>
                                  <span className="font-mono text-[11px] text-slate-400">[{p.code}]</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Team: {p.teamName} · {p.category} · Judge Code: {codeLetter}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-bold text-xs text-white font-mono">
                                  Code Letter {codeLetter}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {selectedEvent.stageType || 'On-Stage'} · {selectedEvent.targetCategory === 'All' ? p.category : selectedEvent.targetCategory} Division · {selectedEvent.isGroupEvent ? 'Group Entry' : 'Individual Entry'}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {hasSubmitted ? (
                            <div>
                              <span className="text-xs font-bold font-mono text-emerald-400">
                                {r.totalAverageScore} pts
                              </span>
                              <span className="block text-[9px] text-slate-400">
                                Rank #{r.calculatedRank}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Unscored</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No participants currently registered for this event.
                  </div>
                )}
              </div>
            </div>

            {/* EVENT LIVE RANKINGS PREVIEW */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2">
                Real-Time Performance Standings
              </h4>
              <div className="space-y-1.5 text-xs">
                {rankings.map((r, idx) => {
                  const codeLetter = getParticipantJudgeCode(selectedEvent, r.participant.id);
                  return (
                    <div
                      key={r.participant.id}
                      className="p-2 rounded-lg bg-slate-950 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[10px]">
                          {idx + 1}
                        </span>
                        {isAdmin ? (
                          <>
                            <span className="font-mono font-bold text-amber-400">[{codeLetter}]</span>
                            <span className="font-semibold text-white">{r.participant.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">[{r.participant.code}]</span>
                          </>
                        ) : (
                          <span className="font-mono font-bold text-white">Code Letter {codeLetter}</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-400 tabular-nums">
                        {r.totalAverageScore} / {maxPossibleScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: SCORING DESK FORM */}
          <div className="lg:col-span-7">
            {selectedParticipant ? (
              <form
                onSubmit={handleSubmitScore}
                className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Anonymous Evaluation Sheet
                    </span>
                    {isAdmin ? (
                      <>
                        <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5 break-words">
                          Code {selectedCodeLetter} · {selectedParticipant.name}
                        </h3>
                        <p className="text-xs text-slate-400 break-words">
                          Reg Code: <span className="font-mono text-amber-400 font-bold">{selectedParticipant.code}</span> · {selectedParticipant.teamName} · {selectedEvent.title}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
                          Code Letter {selectedCodeLetter}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {selectedEvent.title} · {selectedEvent.category} · {selectedEvent.stageType || 'On-Stage'} · {selectedEvent.targetCategory === 'All' ? selectedParticipant.category : selectedEvent.targetCategory} Division · {selectedEvent.isGroupEvent ? 'Group Performance' : 'Individual Performance'}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0 p-2.5 sm:p-0 rounded-xl bg-slate-950 sm:bg-transparent border sm:border-0 border-slate-800 inline-flex sm:block items-baseline gap-2 self-start sm:self-auto">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono-num tabular-nums">
                      {totalCalculatedScore}
                    </span>
                    <span className="text-xs text-slate-400 sm:block sm:-mt-1 font-mono">/ {maxPossibleScore} Total</span>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Criteria Sliders / Inputs */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-300">Performance Rubrics</h4>
                  {selectedEvent.criteria.map((c) => {
                    const currentVal = criteriaScores[c.id] || 0;

                    return (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-200">{c.name}</span>
                          <div className="flex items-center gap-1.5 font-mono shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={c.maxMarks}
                              value={currentVal}
                              onChange={(e) =>
                                handleScoreChange(c.id, parseInt(e.target.value, 10) || 0, c.maxMarks)
                              }
                              className="w-20 min-h-[42px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 text-center font-bold text-sm"
                            />
                            <span className="text-slate-500">/ {c.maxMarks}</span>
                          </div>
                        </div>

                        <div className="py-1.5">
                          <input
                            type="range"
                            min={0}
                            max={c.maxMarks}
                            value={currentVal}
                            onChange={(e) =>
                              handleScoreChange(c.id, parseInt(e.target.value, 10) || 0, c.maxMarks)
                            }
                            className="w-full accent-emerald-500 cursor-pointer h-2.5 bg-slate-800 rounded-lg"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Judge Remarks */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Judges Remarks / Performance Observations
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Provide constructive feedback on technique, precision, delivery, timing..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Submit Official Marks for Code {selectedCodeLetter}</span>
                </button>
              </form>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-slate-500 text-center">
                <FileCheck className="w-12 h-12 mb-3 text-emerald-500/40" />
                <h4 className="text-sm font-semibold text-slate-300">No Code Letter Selected</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Select an anonymous Code Letter from the left panel to evaluate performance criteria and submit marks.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-2">
          <Scale className="w-8 h-8 mx-auto text-emerald-500/40" />
          <p className="font-semibold text-slate-300">No Competitions Assigned or Created Yet</p>
          <p className="text-slate-500">
            Executive Admins can add new competitions and assign jury members inside Executive Controls.
          </p>
        </div>
      )}

      {/* DECLARE RESULTS MODAL */}
      {isDeclareModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-5 my-auto max-h-[92dvh] overflow-y-auto">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Official Validation
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Submit Result Positions: {selectedEvent.title}
              </h3>
              <p className="text-xs text-slate-400">
                Confirming will submit First ({state.settings.pointsScheme.first}pts), Second ({state.settings.pointsScheme.second}pts), and Third ({state.settings.pointsScheme.third}pts) positions based on anonymous evaluations.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* First Position */}
              <div>
                <label className="block text-amber-300 font-bold mb-1 flex items-center gap-1.5 font-mono">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  First Position Winner
                </label>
                <select
                  value={firstWinnerId}
                  onChange={(e) => setFirstWinnerId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select First Position Code</option>
                  {registeredParticipants.map((p) => {
                    const codeLetter = getParticipantJudgeCode(selectedEvent, p.id);
                    const avg = rankings.find((r) => r.participant.id === p.id)?.totalAverageScore;
                    return (
                      <option key={p.id} value={p.id}>
                        {isAdmin
                          ? `Code ${codeLetter} — ${p.name} (${p.code} · ${p.teamName})`
                          : `Code Letter ${codeLetter}${avg ? ` (Avg: ${avg} pts)` : ''}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Second Position */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5 font-mono">
                  <Award className="w-3.5 h-3.5 text-slate-300" />
                  Second Position Winner
                </label>
                <select
                  value={secondWinnerId}
                  onChange={(e) => setSecondWinnerId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-slate-400"
                >
                  <option value="">Select Second Position Code</option>
                  {registeredParticipants.map((p) => {
                    const codeLetter = getParticipantJudgeCode(selectedEvent, p.id);
                    const avg = rankings.find((r) => r.participant.id === p.id)?.totalAverageScore;
                    return (
                      <option key={p.id} value={p.id}>
                        {isAdmin
                          ? `Code ${codeLetter} — ${p.name} (${p.code} · ${p.teamName})`
                          : `Code Letter ${codeLetter}${avg ? ` (Avg: ${avg} pts)` : ''}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Third Position */}
              <div>
                <label className="block text-orange-400 font-bold mb-1 flex items-center gap-1.5 font-mono">
                  <Award className="w-3.5 h-3.5 text-orange-400" />
                  Third Position Winner
                </label>
                <select
                  value={thirdWinnerId}
                  onChange={(e) => setThirdWinnerId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select Third Position Code</option>
                  {registeredParticipants.map((p) => {
                    const codeLetter = getParticipantJudgeCode(selectedEvent, p.id);
                    const avg = rankings.find((r) => r.participant.id === p.id)?.totalAverageScore;
                    return (
                      <option key={p.id} value={p.id}>
                        {isAdmin
                          ? `Code ${codeLetter} — ${p.name} (${p.code} · ${p.teamName})`
                          : `Code Letter ${codeLetter}${avg ? ` (Avg: ${avg} pts)` : ''}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Jury Citation / Notes</label>
                <input
                  type="text"
                  value={declareNotes}
                  onChange={(e) => setDeclareNotes(e.target.value)}
                  placeholder="Official comments..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {isAdmin ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <label className="min-h-[36px] flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span className="font-bold text-white text-xs">
                      Release &amp; Publish Results to Public Immediately
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    {publishImmediately
                      ? 'Results will immediately appear on the live leaderboard and enable winner poster downloads.'
                      : 'Results will be saved in "Under Review (Admin Only)" state. You can release them manually at any scheduled time.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
                  <span className="font-bold block text-amber-300 mb-0.5">Anonymous Review &amp; Privacy Active:</span>
                  Anonymous code selections are mapped securely and sent directly for Executive Committee review. Results stay confidential until published by the Executive Admin.
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsDeclareModalOpen(false)}
                className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeclare}
                className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                {isAdmin && publishImmediately ? 'Publish to Public Now' : 'Submit for Executive Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
