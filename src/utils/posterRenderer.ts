import { WinnerDetail, FestEvent, FestSettings } from '../types/fest';
import { getAppLabel } from './labelHelper';
import { getMediaDataUrl } from './mediaStorage';

export interface PosterOptions {
  position: 'First' | 'Second' | 'Third';
  winner: WinnerDetail;
  event: FestEvent;
  settings: FestSettings;
  customBgDataUrl?: string;
  themeStyle?: 'royal' | 'cyber' | 'minimal';
}

export interface UnifiedPosterOptions {
  event: FestEvent;
  settings: FestSettings;
  customBgDataUrl?: string;
  themeStyle?: 'royal' | 'cyber' | 'minimal';
}

async function loadImageSafe(url: string): Promise<HTMLImageElement | null> {
  try {
    const resolved = await getMediaDataUrl(url);
    if (!resolved) return null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = resolved;
    });
    return img;
  } catch {
    return null;
  }
}

async function drawBackgroundAndFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgUrl: string | undefined,
  themeStyle: 'royal' | 'cyber' | 'minimal'
) {
  let bgLoaded = false;

  if (bgUrl) {
    const img = await loadImageSafe(bgUrl);
    if (img) {
      ctx.drawImage(img, 0, 0, width, height);
      bgLoaded = true;
    }
  }

  if (!bgLoaded) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (themeStyle === 'cyber') {
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#082f49');
    } else {
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#1e1b4b');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 6;
    ctx.strokeRect(46, 46, width - 92, height - 92);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, width - 120, height - 120);
  }
}

/**
 * Draws a single unified certificate poster containing First, Second, and Third position winners
 * merged onto one admin-uploaded poster template (or festive default).
 */
export async function renderUnifiedWinnerPoster(
  canvas: HTMLCanvasElement,
  options: UnifiedPosterOptions
): Promise<void> {
  const { event, settings, customBgDataUrl, themeStyle = 'royal' } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 1200;
  canvas.height = 1600;
  const width = canvas.width;
  const height = canvas.height;

  const bgUrl =
    customBgDataUrl ||
    event.customPosterTemplateUrl ||
    settings.unifiedPosterTemplateUrl ||
    settings.customPosterBgUrl ||
    settings.posterTemplateUrl;

  await drawBackgroundAndFrame(ctx, width, height, bgUrl, themeStyle);

  // Soft translucent card container for crisp typography over custom templates
  ctx.fillStyle = 'rgba(6, 10, 20, 0.78)';
  const boxX = 110;
  const boxY = 130;
  const boxW = width - 220;
  const boxH = height - 260;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 24);
  ctx.fill();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Official Logo Crest at top left inside header
  const logoImg = await loadImageSafe(settings.logoUrl || '/ifest-logo.svg');
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(150, 165, 96, 96, 16);
    ctx.clip();
    ctx.drawImage(logoImg, 150, 165, 96, 96);
    ctx.restore();
  }

  // Header Fest Info
  ctx.textAlign = 'center';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(settings.collegeName.toUpperCase(), width / 2, 200);

  ctx.font = '900 62px "Cinzel", Georgia, serif';
  const festGrad = ctx.createLinearGradient(width / 2 - 220, 0, width / 2 + 220, 0);
  festGrad.addColorStop(0, '#fef08a');
  festGrad.addColorStop(0.5, '#f59e0b');
  festGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = festGrad;
  ctx.fillText(settings.festName, width / 2, 275);

  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('OFFICIAL COMPETITION RESULTS & MERIT HONORS', width / 2, 322);

  // Divider
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 180, 348);
  ctx.lineTo(width / 2 + 180, 348);
  ctx.stroke();

  // Event Title & Division
  ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  const titleText = event.title.length > 32 ? `${event.title.substring(0, 30)}...` : event.title;
  ctx.fillText(titleText, width / 2, 410);

  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillStyle = '#fde047';
  const divLabel = event.targetCategory && event.targetCategory !== 'All' ? `${event.targetCategory.toUpperCase()} DIVISION · ` : '';
  ctx.fillText(`${divLabel}${event.category.toUpperCase()} · ${event.stageType?.toUpperCase() || 'ON-STAGE'}`, width / 2, 450);

  // Render 1st, 2nd, 3rd Winner Cards in Unified Layout
  const slots: Array<{
    pos: 'First' | 'Second' | 'Third';
    label: string;
    winner?: WinnerDetail;
    y: number;
    accent: string;
    bg: string;
  }> = [
    {
      pos: 'First',
      label: getAppLabel(settings, 'firstPositionLabel').toUpperCase(),
      winner: event.winners?.first,
      y: 495,
      accent: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.14)',
    },
    {
      pos: 'Second',
      label: getAppLabel(settings, 'secondPositionLabel').toUpperCase(),
      winner: event.winners?.second,
      y: 740,
      accent: '#e2e8f0',
      bg: 'rgba(148, 163, 184, 0.14)',
    },
    {
      pos: 'Third',
      label: getAppLabel(settings, 'thirdPositionLabel').toUpperCase(),
      winner: event.winners?.third,
      y: 985,
      accent: '#fb923c',
      bg: 'rgba(249, 115, 22, 0.14)',
    },
  ];

  slots.forEach((slot) => {
    const cardX = 165;
    const cardW = width - 330;
    const cardH = 215;

    ctx.fillStyle = slot.bg;
    ctx.beginPath();
    ctx.roundRect(cardX, slot.y, cardW, cardH, 16);
    ctx.fill();

    ctx.strokeStyle = slot.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rank Pill Banner inside slot
    ctx.fillStyle = slot.accent;
    ctx.beginPath();
    ctx.roundRect(cardX + 24, slot.y + 20, 220, 36, 8);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '800 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(slot.label, cardX + 134, slot.y + 44);

    if (slot.winner) {
      // Score badge on top right
      ctx.textAlign = 'right';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillStyle = slot.accent;
      ctx.fillText(`${slot.winner.score} PTS`, cardX + cardW - 28, slot.y + 46);

      // Winner Name
      ctx.textAlign = 'left';
      ctx.font = '800 38px "Cinzel", Georgia, serif';
      ctx.fillStyle = '#ffffff';
      const wName =
        slot.winner.participantName.length > 26
          ? `${slot.winner.participantName.substring(0, 24)}...`
          : slot.winner.participantName;
      ctx.fillText(wName, cardX + 28, slot.y + 115);

      // Chest # & Team Name
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#38bdf8';
      const chest = slot.winner.chestNumber ? `CHEST #${slot.winner.chestNumber}` : `CODE ${slot.winner.code}`;
      ctx.fillText(`TEAM ${slot.winner.teamName.toUpperCase()}  ·  ${chest}`, cardX + 28, slot.y + 165);
    } else {
      ctx.textAlign = 'left';
      ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Position Not Declared', cardX + 28, slot.y + 125);
    }
  });

  // Signatures & Official Seal Footer
  const sigY = 1320;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(220, sigY);
  ctx.lineTo(440, sigY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('CONVENER & JURY CHAIR', 330, sigY + 28);

  ctx.beginPath();
  ctx.moveTo(760, sigY);
  ctx.lineTo(980, sigY);
  ctx.stroke();

  ctx.fillText('EXECUTIVE COMMITTEE', 870, sigY + 28);

  // Center Seal
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, sigY - 12, 42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('VERIFIED', width / 2, sigY - 17);
  ctx.fillText('I-FEST 27', width / 2, sigY + 2);

  // Footer details
  ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${settings.festDates} · Venue: ${event.venue} · ${settings.collegeName}`, width / 2, 1410);
}

/**
 * Draws an individual position certificate poster on HTML5 Canvas
 */
export async function renderWinnerPoster(
  canvas: HTMLCanvasElement,
  options: PosterOptions
): Promise<void> {
  const { position, winner, event, settings, customBgDataUrl, themeStyle = 'royal' } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 1200;
  canvas.height = 1600;

  const width = canvas.width;
  const height = canvas.height;

  const bgUrl =
    customBgDataUrl ||
    event.customPosterTemplateUrl ||
    settings.unifiedPosterTemplateUrl ||
    settings.customPosterBgUrl ||
    settings.posterTemplateUrl;

  await drawBackgroundAndFrame(ctx, width, height, bgUrl, themeStyle);

  // Soft dark overlay in center to ensure text legibility
  ctx.fillStyle = 'rgba(7, 11, 22, 0.72)';
  const centerBoxX = 140;
  const centerBoxY = 280;
  const centerBoxW = width - 280;
  const centerBoxH = 1040;

  ctx.beginPath();
  ctx.roundRect(centerBoxX, centerBoxY, centerBoxW, centerBoxH, 20);
  ctx.fill();

  ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const logoImg = await loadImageSafe(settings.logoUrl || '/ifest-logo.svg');
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(175, 310, 84, 84, 14);
    ctx.clip();
    ctx.drawImage(logoImg, 175, 310, 84, 84);
    ctx.restore();
  }

  ctx.textAlign = 'center';

  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(settings.collegeName.toUpperCase(), width / 2, 350);

  ctx.font = '800 68px "Cinzel", Georgia, serif';
  const festGrad = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
  festGrad.addColorStop(0, '#fef08a');
  festGrad.addColorStop(0.5, '#f59e0b');
  festGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = festGrad;
  ctx.fillText(settings.festName, width / 2, 440);

  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('OFFICIAL MERIT CERTIFICATE OF EXCELLENCE', width / 2, 485);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 160, 515);
  ctx.lineTo(width / 2 + 160, 515);
  ctx.stroke();

  const positionLabel =
    position === 'First'
      ? getAppLabel(settings, 'firstPositionLabel').toUpperCase()
      : position === 'Second'
      ? getAppLabel(settings, 'secondPositionLabel').toUpperCase()
      : getAppLabel(settings, 'thirdPositionLabel').toUpperCase();
  let badgeColor1 = '#fbbf24';
  let badgeColor2 = '#b45309';
  if (position === 'Second') {
    badgeColor1 = '#e2e8f0';
    badgeColor2 = '#64748b';
  } else if (position === 'Third') {
    badgeColor1 = '#fdba74';
    badgeColor2 = '#9a3412';
  }

  const badgeW = 460;
  const badgeH = 72;
  const badgeX = (width - badgeW) / 2;
  const badgeY = 570;

  const ribbonGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  ribbonGrad.addColorStop(0, badgeColor2);
  ribbonGrad.addColorStop(0.5, badgeColor1);
  ribbonGrad.addColorStop(1, badgeColor2);

  ctx.fillStyle = ribbonGrad;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(positionLabel, width / 2, badgeY + 48);

  ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('THIS PRESTIGIOUS HONOR IS PROUDLY CONFERRED UPON', width / 2, 700);

  ctx.font = '800 58px "Cinzel", Georgia, serif';
  ctx.fillStyle = '#ffffff';
  const displayName = winner.participantName.length > 28 ? `${winner.participantName.substring(0, 26)}...` : winner.participantName;
  ctx.fillText(displayName, width / 2, 775);

  ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#38bdf8';
  const chestDisplay = winner.chestNumber ? `CHEST #${winner.chestNumber}` : `CODE: ${winner.code}`;
  ctx.fillText(`TEAM ${winner.teamName.toUpperCase()} · [${chestDisplay}]`, width / 2, 830);

  ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('FOR EXTRAORDINARY TALENT & VICTORY IN', width / 2, 910);

  ctx.font = '700 38px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText(event.title, width / 2, 970);

  ctx.font = '500 22px "JetBrains Mono", monospace';
  ctx.fillStyle = '#e2e8f0';
  const divisionText = event.targetCategory && event.targetCategory !== 'All' ? `[${event.targetCategory.toUpperCase()}] ` : '';
  ctx.fillText(`${divisionText}CATEGORY: ${event.category.toUpperCase()} | FINAL SCORE: ${winner.score} PTS`, width / 2, 1025);

  const sigY = 1170;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(260, sigY);
  ctx.lineTo(480, sigY);
  ctx.stroke();

  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('CONVENER & JURY CHAIR', 370, sigY + 30);
  ctx.font = '400 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('I-FEST Central Committee', 370, sigY + 52);

  ctx.beginPath();
  ctx.moveTo(720, sigY);
  ctx.lineTo(940, sigY);
  ctx.stroke();

  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('DEAN OF STUDENT AFFAIRS', 830, sigY + 30);
  ctx.font = '400 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(settings.collegeName, 830, sigY + 52);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, sigY - 20, 48, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('VERIFIED', width / 2, sigY - 26);
  ctx.fillText('I-FEST 27', width / 2, sigY - 6);

  ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Issued on ${settings.festDates} · Venue: ${event.venue}`, width / 2, 1260);
}

/**
 * Trigger browser file download from canvas
 */
export function downloadCanvasImage(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
