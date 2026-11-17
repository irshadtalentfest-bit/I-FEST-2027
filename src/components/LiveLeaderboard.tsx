import React, { useState } from 'react';
import { FestState, TeamScoreSummary, FestEvent } from '../types/fest';
import { FestStorageService } from '../services/storage';
import { getAppLabel } from '../utils/labelHelper';
import { WinnerPosterModal } from './WinnerPosterModal';
import { SpecialAwardsBanner } from './SpecialAwardsBanner';
import {
  Award,
  Trophy,
  Sparkles,
  Download,
  Search,
  Calendar,
  MapPin,
  ChevronRight,
  EyeOff,
  Lock,
  Globe,
  CheckCircle,
  Filter,
} from 'lucide-react';

interface LiveLeaderboardProps {
  state: FestState;
  isAdmin: boolean;
  onOpenEventDetail?: (event: FestEvent) => void;
  onSwitchToJudging?: () => void;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  state,
  isAdmin,
  onSwitchToJudging,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedStageType, setSelectedStageType] = useState<string>('All');
  const [posterModalEvent, setPosterModalEvent] = useState<FestEvent | null>(null);
  const [posterPosition, setPosterPosition] = useState<'All' | 'First' | 'Second' | 'Third'>('All');

  const teamSummaries: TeamScoreSummary[] = FestStorageService.calculateTeamScores(state, isAdmin);
  const s = state.settings;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs font-mono">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{getAppLabel(s, 'firstPositionLabel')}</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200/20 border border-slate-300/40 text-slate-200 font-bold text-xs font-mono">
            <Award className="w-3.5 h-3.5 text-slate-300" />
            <span>{getAppLabel(s, 'secondPositionLabel')}</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold text-xs font-mono">
            <Award className="w-3.5 h-3.5 text-orange-400" />
            <span>{getAppLabel(s, 'thirdPositionLabel')}</span>
          </div>
        );
      default:
        return (
          <div className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono">
            Rank #{rank}
          </div>
        );
    }
  };

  const categories = ['All', 'Music & Dance', 'Tech & Coding', 'Literary', 'Fine Arts', 'Stage', 'Gaming'];
  const ageDivisions = ['All', 'Senior', 'Junior', 'Sub-Junior', 'General'];

  const filteredEvents = state.events.filter((ev) => {
    const matchesCat = selectedCategory === 'All' || ev.category === selectedCategory;
    const matchesDivision =
      selectedDivision === 'All' ||
      ev.targetCategory === selectedDivision ||
      ev.targetCategory === 'All';
    const matchesStage = selectedStageType === 'All' || ev.stageType === selectedStageType;

    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.winners?.first?.participantName.toLowerCase().includes(searchQuery.toLowerCase()) && (isAdmin || ev.isPublishedToPublic)) ||
      (ev.winners?.second?.participantName.toLowerCase().includes(searchQuery.toLowerCase()) && (isAdmin || ev.isPublishedToPublic)) ||
      (ev.winners?.third?.participantName.toLowerCase().includes(searchQuery.toLowerCase()) && (isAdmin || ev.isPublishedToPublic));

    return matchesCat && matchesDivision && matchesStage && matchesSearch;
  });

  const publishedEventsCount = state.events.filter((e) => e.isPublishedToPublic).length;
  const underReviewCount = state.events.filter((e) => e.winners && !e.isPublishedToPublic).length;

  const handleTogglePublish = (eventId: string, currentStatus: boolean) => {
    FestStorageService.toggleEventPublicPublish(eventId, !currentStatus);
  };

  return (
    <div className="space-y-8">
      {/* Fest Announcement Banner */}
      {s.announcement && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{s.announcement}</span>
          </div>
          <span className="text-[11px] font-mono text-amber-400/80 shrink-0 hidden sm:inline">
            Points: 1st={s.pointsScheme.first}pts · 2nd={s.pointsScheme.second}pts · 3rd={s.pointsScheme.third}pts
          </span>
        </div>
      )}

      {/* 'PEN OF THE FEST' & 'STAR OF THE FEST' DYNAMIC HONORS */}
      <SpecialAwardsBanner state={state} isAdmin={isAdmin} />

      {/* SECTION 1: OVERALL TEAM POINTS LEADERBOARD */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              {getAppLabel(s, 'teamLeaderboardKicker')}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {s.leaderboardTitle || 'Overall Team Championship Leaderboard'}
            </h2>
            {s.leaderboardSubtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{s.leaderboardSubtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>
              {publishedEventsCount} of {state.events.length} competitions publicly declared
            </span>
            {isAdmin && underReviewCount > 0 && (
              <span className="text-amber-400 font-bold">
                ({underReviewCount} pending admin release)
              </span>
            )}
          </div>
        </div>

        {/* Top 3 Podium / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teamSummaries.slice(0, 3).map((summary) => {
            const isFirst = summary.rank === 1;

            return (
              <div
                key={summary.team.id}
                className={`relative p-5 rounded-2xl border transition-all ${
                  isFirst
                    ? 'bg-gradient-to-b from-amber-500/10 to-slate-900/90 border-amber-500/50 shadow-xl shadow-amber-500/5'
                    : summary.rank === 2
                    ? 'bg-slate-900/90 border-slate-700/80'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  {getRankBadge(summary.rank)}
                  <div className="text-right">
                    <span className="text-3xl font-black text-white font-mono-num tabular-nums tracking-tight">
                      {summary.totalPoints}
                    </span>
                    <span className="text-xs text-slate-400 block -mt-1 font-mono">
                      {getAppLabel(s, 'totalPointsLabel')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: summary.team.color }}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {summary.team.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Code Prefix: <span className="font-mono text-cyan-400 font-bold">{summary.team.codePrefix}</span> · Manager: {summary.team.managerName}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div>
                    <span className="text-slate-500">First: </span>
                    <span className="text-amber-400 font-bold">{summary.firstCount}</span>
                  </div>
                  <span className="text-slate-700" aria-hidden="true">·</span>
                  <div>
                    <span className="text-slate-500">Second: </span>
                    <span className="text-slate-200 font-bold">{summary.secondCount}</span>
                  </div>
                  <span className="text-slate-700" aria-hidden="true">·</span>
                  <div>
                    <span className="text-slate-500">Third: </span>
                    <span className="text-orange-400 font-bold">{summary.thirdCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: COMPETITIONS & WINNERS LIST WITH PRIVACY CONTROLS & POSTER DOWNLOAD */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              {getAppLabel(s, 'eventsResultsKicker')}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {getAppLabel(s, 'eventsResultsHeading')}
            </h2>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event, winner, chest #..."
              className="w-full min-h-[44px] sm:min-h-[40px] pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* MULTI-TIER FILTERS: Category, Age Division, Stage Type */}
        <div className="space-y-2.5">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-touch pb-1.5 text-xs">
            <span className="text-[11px] font-mono text-slate-500 uppercase mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Event:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition-colors font-medium ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Division (Senior, Junior, Sub-Junior, General) & Stage Type Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto scroll-touch pb-1 text-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase mr-1 shrink-0">Division:</span>
              {ageDivisions.map((div) => (
                <button
                  key={div}
                  type="button"
                  onClick={() => setSelectedDivision(div)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 font-medium transition-colors ${
                    selectedDivision === div
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scroll-touch pb-1 text-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase mr-1 shrink-0">Stage:</span>
              {['All', 'On-Stage', 'Off-Stage'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStageType(st)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 font-medium transition-colors ${
                    selectedStageType === st
                      ? 'bg-purple-500 text-white font-bold'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => {
            const hasWinners = !!ev.winners;
            const isPubliclyPublished = ev.isPublishedToPublic && ev.status === 'Results Published';
            const isUnderAdminReview = hasWinners && !ev.isPublishedToPublic;

            return (
              <div
                key={ev.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  isUnderAdminReview
                    ? 'bg-slate-900/90 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-amber-400 font-mono">
                        {ev.category}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {ev.stageType || 'On-Stage'}
                      </span>
                      {ev.targetCategory && ev.targetCategory !== 'All' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          {ev.targetCategory}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {isPubliclyPublished ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : isUnderAdminReview ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                          <Lock className="w-3 h-3" /> Admin Review Only
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {ev.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {ev.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {ev.date} · {ev.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {ev.venue}
                    </span>
                  </div>
                </div>

                {/* PRIVACY LOGIC: Show results only if published to public OR if viewer is Executive Admin */}
                {hasWinners && (isPubliclyPublished || isAdmin) ? (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5 text-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex flex-wrap items-center justify-between gap-2 pb-1">
                      <div className="flex items-center gap-1.5">
                        <span>{isPubliclyPublished ? 'Official Declared Results' : 'Draft Results (Admin Preview)'}</span>
                        {isPubliclyPublished && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPosterModalEvent(ev);
                            setPosterPosition('All');
                          }}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                          title="Download Single Poster with 1st, 2nd & 3rd Winners"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{getAppLabel(s, 'combinedPosterButton')}</span>
                        </button>

                        {/* Admin Privacy Toggle Button */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(ev.id, ev.isPublishedToPublic)}
                            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-colors ${
                              ev.isPublishedToPublic
                                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                            }`}
                            title={ev.isPublishedToPublic ? 'Click to withdraw from public' : 'Click to release to public now'}
                          >
                            {ev.isPublishedToPublic ? (
                              <>
                                <EyeOff className="w-3 h-3" /> Make Private
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3" /> Release to Public
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* First Position */}
                    {ev.winners?.first && (
                      <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-900">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px] font-mono shrink-0">
                            1st
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-white block sm:inline">{ev.winners.first.participantName}</span>
                            <span className="text-[11px] text-slate-400 sm:ml-1.5 font-mono block sm:inline">
                              [Chest #{ev.winners.first.chestNumber || ev.winners.first.code}] · {ev.winners.first.teamName}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPosterModalEvent(ev);
                            setPosterPosition('First');
                          }}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors border border-amber-500/20 shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          <span>Poster</span>
                        </button>
                      </div>
                    )}

                    {/* Second Position */}
                    {ev.winners?.second && (
                      <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-900">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold flex items-center justify-center text-[10px] font-mono shrink-0">
                            2nd
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-white block sm:inline">{ev.winners.second.participantName}</span>
                            <span className="text-[11px] text-slate-400 sm:ml-1.5 font-mono block sm:inline">
                              [Chest #{ev.winners.second.chestNumber || ev.winners.second.code}] · {ev.winners.second.teamName}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPosterModalEvent(ev);
                            setPosterPosition('Second');
                          }}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          <span>Poster</span>
                        </button>
                      </div>
                    )}

                    {/* Third Position */}
                    {ev.winners?.third && (
                      <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px] font-mono shrink-0">
                            3rd
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-white block sm:inline">{ev.winners.third.participantName}</span>
                            <span className="text-[11px] text-slate-400 sm:ml-1.5 font-mono block sm:inline">
                              [Chest #{ev.winners.third.chestNumber || ev.winners.third.code}] · {ev.winners.third.teamName}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPosterModalEvent(ev);
                            setPosterPosition('Third');
                          }}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          <span>Poster</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : isUnderAdminReview && !isAdmin ? (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300/80">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Judges marks submitted. Official public declaration scheduled shortly.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span>Results not yet compiled for this event.</span>
                    {isAdmin && (
                      <button
                        onClick={onSwitchToJudging}
                        className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                      >
                        Enter Marks
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="md:col-span-2 p-10 text-center rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-xs text-slate-500">
              No competitions or programs match your current filter criteria.
            </div>
          )}
        </div>
      </section>

      {/* Automated Winner Poster Modal */}
      {posterModalEvent && (
        <WinnerPosterModal
          isOpen={!!posterModalEvent}
          onClose={() => setPosterModalEvent(null)}
          event={posterModalEvent}
          settings={state.settings}
          isAdmin={isAdmin}
          initialPosition={posterPosition}
        />
      )}
    </div>
  );
};
