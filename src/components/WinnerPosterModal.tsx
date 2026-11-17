import React, { useRef, useEffect, useState, useId } from 'react';
import { FestEvent, FestSettings, WinnerDetail } from '../types/fest';
import { renderWinnerPoster, renderUnifiedWinnerPoster, downloadCanvasImage } from '../utils/posterRenderer';
import { FestStorageService } from '../services/storage';
import { Download, X, Award, Image as ImageIcon, CheckCircle, RefreshCw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WinnerPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: FestEvent;
  settings: FestSettings;
  isAdmin: boolean;
  onUpdateCustomBg?: (dataUrl: string) => void;
  initialPosition?: 'All' | 'First' | 'Second' | 'Third';
}

export const WinnerPosterModal: React.FC<WinnerPosterModalProps> = ({
  isOpen,
  onClose,
  event,
  settings,
  isAdmin,
  onUpdateCustomBg,
  initialPosition = 'All',
}) => {
  const [selectedPosition, setSelectedPosition] = useState<'All' | 'First' | 'Second' | 'Third'>(initialPosition);
  const [themeStyle, setThemeStyle] = useState<'royal' | 'cyber' | 'minimal'>('royal');
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [uploadedBg, setUploadedBg] = useState<string | null>(event.customPosterTemplateUrl || null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();

  const winners = event.winners;
  const hasAnyWinner = !!(winners?.first || winners?.second || winners?.third);
  const currentWinner: WinnerDetail | undefined =
    selectedPosition === 'First'
      ? winners?.first
      : selectedPosition === 'Second'
      ? winners?.second
      : selectedPosition === 'Third'
      ? winners?.third
      : undefined;

  useEffect(() => {
    if (initialPosition) {
      setSelectedPosition(initialPosition);
    }
  }, [initialPosition]);

  useEffect(() => {
    setUploadedBg(event.customPosterTemplateUrl || null);
  }, [event.id, event.customPosterTemplateUrl]);

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#38bdf8', '#ec4899', '#ffffff'],
        });
      } catch {
        // Safe fallback
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    if (selectedPosition === 'All' && !hasAnyWinner) return;
    if (selectedPosition !== 'All' && !currentWinner) return;

    let isMounted = true;
    setIsRendering(true);

    const renderPromise =
      selectedPosition === 'All'
        ? renderUnifiedWinnerPoster(canvasRef.current, {
            event,
            settings,
            customBgDataUrl: uploadedBg || event.customPosterTemplateUrl || settings.unifiedPosterTemplateUrl || settings.customPosterBgUrl,
            themeStyle,
          })
        : renderWinnerPoster(canvasRef.current, {
            position: selectedPosition,
            winner: currentWinner!,
            event,
            settings,
            customBgDataUrl: uploadedBg || event.customPosterTemplateUrl || settings.customPosterBgUrl,
            themeStyle,
          });

    renderPromise.finally(() => {
      if (isMounted) setIsRendering(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedPosition, currentWinner, hasAnyWinner, event, settings, uploadedBg, themeStyle]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const safeTitle = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (selectedPosition === 'All') {
      const filename = `${settings.festName}_${safeTitle}_all_winners_poster.png`;
      downloadCanvasImage(canvasRef.current, filename);
    } else if (currentWinner) {
      const safeName = currentWinner.participantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${settings.festName}_${safeTitle}_${selectedPosition}_${safeName}.png`;
      downloadCanvasImage(canvasRef.current, filename);
    }
  };

  const handleCustomBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImageFile, saveMediaDataUrl } = await import('../utils/mediaStorage');
      const compressed = await compressImageFile(file, 1600, 0.88);
      const ref = compressed.length > 250 * 1024
        ? await saveMediaDataUrl(`poster-tpl-${event.id}-${Date.now()}`, compressed)
        : compressed;
      setUploadedBg(ref);
      FestStorageService.setEventPosterTemplate(event.id, ref);
      if (onUpdateCustomBg) {
        onUpdateCustomBg(ref);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          setUploadedBg(dataUrl);
          FestStorageService.setEventPosterTemplate(event.id, dataUrl);
          if (onUpdateCustomBg) {
            onUpdateCustomBg(dataUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const canRender = selectedPosition === 'All' ? hasAnyWinner : !!currentWinner;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col my-auto">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
                <span className="truncate">Unified Winner Poster Generator</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono shrink-0">HD 1200x1600</span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {event.title} · {event.category}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close poster modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout Mode Selector Tabs */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scroll-touch pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedPosition('All')}
              disabled={!hasAnyWinner}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                selectedPosition === 'All'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : hasAnyWinner
                  ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-600 bg-slate-900 cursor-not-allowed'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Combined 1st, 2nd & 3rd Poster</span>
            </button>

            {(['First', 'Second', 'Third'] as const).map((pos) => {
              const detail = pos === 'First' ? winners?.first : pos === 'Second' ? winners?.second : winners?.third;
              const isSelected = selectedPosition === pos;

              return (
                <button
                  type="button"
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  disabled={!detail}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                    isSelected
                      ? pos === 'First'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : pos === 'Second'
                        ? 'bg-slate-200 text-slate-950 shadow-md font-bold'
                        : 'bg-orange-500 text-slate-950 shadow-md font-bold'
                      : detail
                      ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-600 bg-slate-900 cursor-not-allowed'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{pos} Only</span>
                </button>
              );
            })}
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <span>Style:</span>
            <button
              type="button"
              onClick={() => setThemeStyle('royal')}
              className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs ${
                themeStyle === 'royal' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Royal Festive
            </button>
            <button
              type="button"
              onClick={() => setThemeStyle('cyber')}
              className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs ${
                themeStyle === 'cyber' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cyber Stage
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
          {/* Canvas Preview Viewport */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800/80 relative min-h-[280px] sm:min-h-[380px]">
            {isRendering && canRender && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/70 rounded-xl">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                <span className="text-xs text-slate-300">Rendering high-res unified winner poster...</span>
              </div>
            )}

            {canRender ? (
              <div className="max-w-[280px] sm:max-w-[340px] shadow-2xl rounded-lg overflow-hidden border border-amber-500/30">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto block rounded-lg"
                  style={{ aspectRatio: '3/4' }}
                />
              </div>
            ) : (
              <div className="text-center py-12 px-4 text-slate-500">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                <p className="text-sm font-medium">No results declared yet for this selection.</p>
                <p className="text-xs text-slate-600 mt-1">Judges and Admins must submit and publish results first.</p>
              </div>
            )}
          </div>

          {/* Details & Download Sidebar */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                {selectedPosition === 'All' ? 'Unified Winners Card' : 'Individual Merit Certificate'}
              </span>
              <h4 className="text-xl font-bold text-white mt-1">
                {selectedPosition === 'All'
                  ? '1st, 2nd & 3rd Official Poster'
                  : `${selectedPosition} Position Certificate`}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Auto-merged with contestant names, chest numbers, teams, and single event poster template.
              </p>

              {selectedPosition === 'All' ? (
                <div className="mt-4 space-y-2 text-xs">
                  {winners?.first && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 font-bold block">1ST POSITION</span>
                        <span className="font-bold text-white">{winners.first.participantName}</span>
                        <span className="text-slate-400 block text-[11px]">Chest #{winners.first.chestNumber || winners.first.code} · {winners.first.teamName}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-300">{winners.first.score} pts</span>
                    </div>
                  )}
                  {winners?.second && (
                    <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono text-slate-300 font-bold block">2ND POSITION</span>
                        <span className="font-bold text-white">{winners.second.participantName}</span>
                        <span className="text-slate-400 block text-[11px]">Chest #{winners.second.chestNumber || winners.second.code} · {winners.second.teamName}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-200">{winners.second.score} pts</span>
                    </div>
                  )}
                  {winners?.third && (
                    <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono text-orange-400 font-bold block">3RD POSITION</span>
                        <span className="font-bold text-white">{winners.third.participantName}</span>
                        <span className="text-slate-400 block text-[11px]">Chest #{winners.third.chestNumber || winners.third.code} · {winners.third.teamName}</span>
                      </div>
                      <span className="font-mono font-bold text-orange-300">{winners.third.score} pts</span>
                    </div>
                  )}
                </div>
              ) : currentWinner ? (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Winner:</span>
                    <span className="text-slate-100 font-bold">{currentWinner.participantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Team:</span>
                    <span className="text-amber-400 font-semibold">{currentWinner.teamName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chest Number:</span>
                    <span className="text-slate-200 font-mono font-medium">{currentWinner.chestNumber || currentWinner.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Final Mark:</span>
                    <span className="text-emerald-400 font-bold font-mono">{currentWinner.score} / 100</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Admin Single-Template Upload Per Event */}
            {isAdmin && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Single Template for This Event
                  </span>
                  <span className="text-[10px] text-slate-400">3:4 Ratio</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Upload 1 template image for <strong>{event.title}</strong>. All 1st, 2nd & 3rd winners merge into this poster automatically.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    id={fileInputId}
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleCustomBgUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor={fileInputId}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <ImageIcon className="w-3 h-3 text-amber-400" />
                    Upload Event Poster Template
                  </label>
                  {uploadedBg && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Direct Download Button (No Login Required) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!canRender}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>
                  {selectedPosition === 'All'
                    ? 'Download Combined Winners Poster (PNG)'
                    : 'Download Certificate (PNG)'}
                </span>
              </button>
              <p className="text-[11px] text-center text-slate-500 mt-2">
                Free public download enabled · Ready to share on WhatsApp & Instagram.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
