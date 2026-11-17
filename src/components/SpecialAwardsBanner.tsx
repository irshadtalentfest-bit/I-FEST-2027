import React from 'react';
import { FestState } from '../types/fest';
import { FestStorageService } from '../services/storage';
import { getAppLabel } from '../utils/labelHelper';
import { PenTool, Star, Trophy, Award, Sparkles, ShieldAlert } from 'lucide-react';

interface SpecialAwardsBannerProps {
  state: FestState;
  isAdmin?: boolean;
}

export const SpecialAwardsBanner: React.FC<SpecialAwardsBannerProps> = ({
  state,
  isAdmin = false,
}) => {
  const awards = FestStorageService.calculateSpecialAwards(state, isAdmin);
  const penWinner = awards.penOfTheFest;
  const starWinner = awards.starOfTheFest;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            {getAppLabel(state.settings, 'specialAwardsHeading')}
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {getAppLabel(state.settings, 'specialAwardsSubheading')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AWARD 1: PEN OF THE FEST (OFF-STAGE INDIVIDUAL, SUB-JUNIOR/JUNIOR/SENIOR, 1 WINNER) */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900/90 border border-amber-500/40 shadow-xl overflow-hidden flex flex-col justify-between space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <PenTool className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block truncate">
                    {getAppLabel(state.settings, 'penAwardBadge')}
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5 break-words">
                    {state.settings.penOfFestTitle || 'Pen of the Fest'}
                  </h4>
                </div>
              </div>

              {penWinner ? (
                <div className="text-right shrink-0">
                  <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tabular-nums">
                    {penWinner.totalOffStagePoints}
                  </span>
                  <span className="text-[10px] text-slate-400 block -mt-1 font-mono">Off-Stage Pts</span>
                </div>
              ) : null}
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              {state.settings.penOfFestSubtitle ||
                'Strictly 1 overall winner from Off-Stage individual competitions across Sub-Junior, Junior & Senior categories (General & Group events excluded).'}
            </p>

            {penWinner ? (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {penWinner.participant.photoUrl ? (
                    <img
                      src={penWinner.participant.photoUrl}
                      alt={penWinner.participant.name}
                      className="w-12 h-12 rounded-xl object-cover border border-amber-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-sm">
                      {penWinner.participant.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {penWinner.participant.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        Chest #{penWinner.participant.chestNumber || penWinner.participant.code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Team: <span className="text-amber-400 font-medium">{penWinner.participant.teamName}</span> · Division: <span className="text-slate-200 font-semibold">{penWinner.participant.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Awaiting eligible Off-Stage individual results (Sub-Junior / Junior / Senior).
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center justify-between">
            {penWinner && penWinner.eventsWon.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-mono text-slate-500">Victories:</span>
                {penWinner.eventsWon.map((e, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-amber-300 font-mono flex items-center gap-1"
                  >
                    <Award className="w-3 h-3 text-amber-400" />
                    {e.position} in {e.eventTitle} (+{e.points}pts)
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                <ShieldAlert className="w-3 h-3 text-amber-400/70" />
                General & Group items excluded
              </span>
            )}
          </div>
        </div>

        {/* AWARD 2: STAR OF THE FEST (INDIVIDUAL COMBINED, SUB-JUNIOR/JUNIOR/SENIOR, 1 WINNER) */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-900/90 border border-cyan-500/40 shadow-xl overflow-hidden flex flex-col justify-between space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-cyan-400/20" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block truncate">
                    {getAppLabel(state.settings, 'starAwardBadge')}
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5 break-words">
                    {state.settings.starOfFestTitle || 'Star of the Fest'}
                  </h4>
                </div>
              </div>

              {starWinner ? (
                <div className="text-right shrink-0">
                  <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono tabular-nums">
                    {starWinner.totalOverallPoints}
                  </span>
                  <span className="text-[10px] text-slate-400 block -mt-1 font-mono">Eligible Pts</span>
                </div>
              ) : null}
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              {state.settings.starOfFestSubtitle ||
                'Strictly 1 overall winner across individual competitions combined in Sub-Junior, Junior & Senior categories (General & Group events excluded).'}
            </p>

            {starWinner ? (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {starWinner.participant.photoUrl ? (
                    <img
                      src={starWinner.participant.photoUrl}
                      alt={starWinner.participant.name}
                      className="w-12 h-12 rounded-xl object-cover border border-cyan-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-slate-950 font-black text-sm">
                      {starWinner.participant.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {starWinner.participant.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                        Chest #{starWinner.participant.chestNumber || starWinner.participant.code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Team: <span className="text-cyan-400 font-medium">{starWinner.participant.teamName}</span> · Division: <span className="text-slate-200 font-semibold">{starWinner.participant.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Awaiting eligible individual results (Sub-Junior / Junior / Senior).
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center justify-between">
            {starWinner && starWinner.eventsWon.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-mono text-slate-500">Victories:</span>
                {starWinner.eventsWon.map((e, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-cyan-300 font-mono flex items-center gap-1"
                  >
                    <Trophy className="w-3 h-3 text-cyan-400" />
                    {e.position} in {e.eventTitle} ({e.stageType})
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                <ShieldAlert className="w-3 h-3 text-cyan-400/70" />
                General & Group items excluded
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
