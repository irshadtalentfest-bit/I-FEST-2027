import {
  FestState,
  UserSession,
  UserRole,
  TeamScoreSummary,
  Participant,
  FestEvent,
  MarkEntry,
  Judge,
  Team,
  WinnerDetail,
  SpecialAwardsSummary,
  FestPhoto,
  StageType,
  DonationRecord,
} from '../types/fest';
import { getInitialFestData, ADMIN_MASTER_PASSWORD } from '../data/initialData';
import { deleteMediaDataUrl, clearAllMediaBlobs } from '../utils/mediaStorage';
import { syncAllEventsJudgeCodeLetters, pickRandomAlphabetCode } from '../utils/judgeCodeHelper';

const STORAGE_KEY = 'ifest_2027_database_v2';
const SESSION_KEY = 'ifest_2027_active_session_v2';

// Custom event name for cross-tab and reactive updates
export const FEST_DATA_CHANGED_EVENT = 'ifest_data_changed';

export class FestStorageService {
  /**
   * Load entire fest state safely without ever overwriting intentionally cleared collections
   */
  static loadState(): FestState {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        const initial = getInitialFestData();
        syncAllEventsJudgeCodeLetters(initial);
        this.saveState(initial);
        return initial;
      }
      const parsed = JSON.parse(serialized) as FestState;
      if (!parsed.settings || !Array.isArray(parsed.teams)) {
        const initial = getInitialFestData();
        syncAllEventsJudgeCodeLetters(initial);
        this.saveState(initial);
        return initial;
      }
      // Preserve empty arrays so deleted/cleared data never comes back
      if (!Array.isArray(parsed.events)) parsed.events = [];
      if (!Array.isArray(parsed.participants)) parsed.participants = [];
      if (!Array.isArray(parsed.judges)) parsed.judges = [];
      if (!Array.isArray(parsed.marks)) parsed.marks = [];
      if (!Array.isArray(parsed.photos)) parsed.photos = [];
      if (!Array.isArray(parsed.donations)) parsed.donations = [];
      const codesUpdated = syncAllEventsJudgeCodeLetters(parsed);
      if (codesUpdated) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          // ignore silent backfill failure
        }
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse fest state from storage, loading defaults:', e);
      const initial = getInitialFestData();
      syncAllEventsJudgeCodeLetters(initial);
      this.saveState(initial);
      return initial;
    }
  }

  /**
   * Persist state safely and broadcast change
   */
  static saveState(state: FestState): { success: boolean; error?: string } {
    state.lastUpdated = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent(FEST_DATA_CHANGED_EVENT, { detail: state }));
      return { success: true };
    } catch (err) {
      console.error('Storage save failed:', err);
      return {
        success: false,
        error: 'Browser storage limit reached. Large media files are stored in IndexedDB automatically—try clearing unused items.',
      };
    }
  }

  /**
   * Session Management
   */
  static getSession(): UserSession | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static setSession(session: UserSession | null): void {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  /**
   * Authenticate role
   */
  static authenticate(
    role: UserRole,
    passwordOrCode: string,
    usernameOrTeamId?: string
  ): { success: boolean; session?: UserSession; error?: string } {
    const state = this.loadState();

    if (role === 'admin') {
      if (passwordOrCode === ADMIN_MASTER_PASSWORD) {
        const session: UserSession = {
          role: 'admin',
          username: 'executive_admin',
          name: 'Executive Committee Admin',
        };
        this.setSession(session);
        return { success: true, session };
      }
      return { success: false, error: 'Invalid Executive Master Password. Please check your credentials.' };
    }

    if (role === 'manager') {
      const team = state.teams.find(
        (t) =>
          t.id === usernameOrTeamId ||
          t.managerUsername.toLowerCase() === (usernameOrTeamId || '').toLowerCase()
      );
      if (!team) {
        return { success: false, error: 'Team manager not found.' };
      }
      if (team.managerPassword === passwordOrCode) {
        const session: UserSession = {
          role: 'manager',
          username: team.managerUsername,
          name: team.managerName,
          teamId: team.id,
        };
        this.setSession(session);
        return { success: true, session };
      }
      return { success: false, error: 'Incorrect password for this team manager.' };
    }

    if (role === 'judge') {
      const judge = state.judges.find(
        (j) => j.username.toLowerCase() === (usernameOrTeamId || '').toLowerCase()
      );
      if (!judge) {
        return { success: false, error: 'Judge username not found.' };
      }
      if (judge.password === passwordOrCode) {
        const session: UserSession = {
          role: 'judge',
          username: judge.username,
          name: judge.name,
          judgeId: judge.id,
        };
        this.setSession(session);
        return { success: true, session };
      }
      return { success: false, error: 'Incorrect password for judge account.' };
    }

    if (role === 'public') {
      const session: UserSession = {
        role: 'public',
        username: 'guest_visitor',
        name: 'Fest Visitor / Participant',
      };
      this.setSession(session);
      return { success: true, session };
    }

    return { success: false, error: 'Unknown authentication tier.' };
  }

  /**
   * Time-Lock Evaluation
   */
  static isRosterLocked(role: UserRole): { locked: boolean; reason: string; deadlineDate?: Date } {
    if (role === 'admin') {
      return { locked: false, reason: 'Executive Admin retains 24/7 override permission.' };
    }

    const state = this.loadState();
    const lock = state.timeLock;

    if (!lock) {
      return { locked: false, reason: 'Unlocked' };
    }

    const deadlineDate = new Date(lock.deadline);
    const hasDeadlinePassed = deadlineDate.getTime() <= Date.now();

    if (lock.enabled || hasDeadlinePassed) {
      return {
        locked: true,
        reason: lock.reason || 'Team roster modification window is currently closed.',
        deadlineDate,
      };
    }

    return { locked: false, reason: 'Open for modifications', deadlineDate };
  }

  /**
   * Update Team Manager Credentials
   */
  static updateTeamManager(
    teamId: string,
    updates: Partial<Pick<Team, 'name' | 'codePrefix' | 'managerUsername' | 'managerPassword' | 'managerName' | 'contactPhone' | 'color'>>
  ): void {
    const state = this.loadState();
    state.teams = state.teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t));
    this.saveState(state);
  }

  /**
   * Participants Operations
   */
  static saveParticipant(participant: Participant, role: UserRole): { success: boolean; error?: string } {
    const lockStatus = this.isRosterLocked(role);
    if (lockStatus.locked) {
      return { success: false, error: `Action blocked: ${lockStatus.reason}` };
    }

    const state = this.loadState();

    // Enforce Admin-configured Team Member Limit per competition
    const registeredIds = participant.registeredEventIds || [];
    for (const evId of registeredIds) {
      const ev = state.events.find((e) => e.id === evId);
      if (!ev) continue;
      const limit = ev.maxParticipantsPerTeam;
      if (limit && limit > 0) {
        const otherTeamCount = state.participants.filter(
          (p) =>
            p.id !== participant.id &&
            p.teamId === participant.teamId &&
            (p.registeredEventIds || []).includes(evId)
        ).length;

        if (otherTeamCount >= limit) {
          return {
            success: false,
            error: `Team limit reached for "${ev.title}": maximum ${limit} participant${
              limit === 1 ? '' : 's'
            } allowed per team (${participant.teamName} already has ${otherTeamCount}/${limit}).`,
          };
        }
      }
    }

    const exists = state.participants.findIndex((p) => p.id === participant.id);

    if (exists >= 0) {
      state.participants[exists] = participant;
    } else {
      state.participants.push(participant);
    }

    // Automatically generate random English alphabet code letters for newly registered competitions
    syncAllEventsJudgeCodeLetters(state);

    return this.saveState(state);
  }

  static deleteParticipant(participantId: string, role: UserRole): { success: boolean; error?: string } {
    const lockStatus = this.isRosterLocked(role);
    if (lockStatus.locked) {
      return { success: false, error: `Action blocked: ${lockStatus.reason}` };
    }

    const state = this.loadState();
    state.participants = state.participants.filter((p) => p.id !== participantId);
    state.marks = state.marks.filter((m) => m.participantId !== participantId);

    state.events.forEach((ev) => {
      if (ev.winners) {
        if (ev.winners.first?.participantId === participantId) ev.winners.first = undefined;
        if (ev.winners.second?.participantId === participantId) ev.winners.second = undefined;
        if (ev.winners.third?.participantId === participantId) ev.winners.third = undefined;
      }
    });

    syncAllEventsJudgeCodeLetters(state);

    return this.saveState(state);
  }

  static saveEvent(event: FestEvent, role: UserRole): { success: boolean; error?: string } {
    const lockStatus = this.isRosterLocked(role);
    if (lockStatus.locked) {
      return { success: false, error: `Action blocked: ${lockStatus.reason}` };
    }
    if (role !== 'admin' && role !== 'manager') {
      return { success: false, error: 'Only Executive Admins or Team Managers can modify competitions.' };
    }

    const state = this.loadState();
    const existingIdx = state.events.findIndex((e) => e.id === event.id);

    if (existingIdx >= 0) {
      const prev = state.events[existingIdx];
      // Team Managers can edit competition details before time-lock, while preserving admin-configured team limits & judge codes
      if (role !== 'admin') {
        state.events[existingIdx] = {
          ...prev,
          title: event.title,
          category: event.category,
          stageType: event.stageType,
          targetCategory: event.targetCategory,
          isGroupEvent: event.isGroupEvent,
          venue: event.venue,
          date: event.date,
          time: event.time,
          rules: event.rules,
        };
      } else {
        state.events[existingIdx] = {
          ...event,
          judgeCodeLetters: event.judgeCodeLetters || prev.judgeCodeLetters,
        };
      }
    } else {
      state.events.push(event);
    }

    syncAllEventsJudgeCodeLetters(state);

    return this.saveState(state);
  }

  static updateEventTeamLimit(
    eventId: string,
    maxParticipantsPerTeam: number
  ): { success: boolean; error?: string } {
    const state = this.loadState();
    const ev = state.events.find((e) => e.id === eventId);
    if (!ev) return { success: false, error: 'Competition not found.' };
    ev.maxParticipantsPerTeam = Math.max(1, Math.min(50, Math.round(maxParticipantsPerTeam || 1)));
    return this.saveState(state);
  }

  static reshuffleEventJudgeCodes(eventId: string): { success: boolean; error?: string } {
    const state = this.loadState();
    const ev = state.events.find((e) => e.id === eventId);
    if (!ev) return { success: false, error: 'Competition not found.' };

    const registeredIds = state.participants
      .filter((p) => (p.registeredEventIds || []).includes(eventId))
      .map((p) => p.id);

    const newMap: Record<string, string> = {};
    const used = new Set<string>();
    for (const pid of registeredIds) {
      const code = pickRandomAlphabetCode(used);
      newMap[pid] = code;
      used.add(code);
    }
    ev.judgeCodeLetters = newMap;
    return this.saveState(state);
  }

  static deleteEvent(eventId: string, role: UserRole = 'admin'): { success: boolean; error?: string } {
    const lockStatus = this.isRosterLocked(role);
    if (lockStatus.locked) {
      return { success: false, error: `Action blocked: ${lockStatus.reason}` };
    }
    if (role !== 'admin' && role !== 'manager') {
      return { success: false, error: 'Only Executive Admins or Team Managers can delete competitions.' };
    }

    const state = this.loadState();
    const target = state.events.find((e) => e.id === eventId);
    if (target?.customPosterTemplateUrl) {
      void deleteMediaDataUrl(target.customPosterTemplateUrl);
    }

    state.events = state.events.filter((e) => e.id !== eventId);
    state.marks = state.marks.filter((m) => m.eventId !== eventId);

    state.participants.forEach((p) => {
      p.registeredEventIds = (p.registeredEventIds || []).filter((id) => id !== eventId);
    });

    state.judges.forEach((j) => {
      j.assignedEventIds = (j.assignedEventIds || []).filter((id) => id !== eventId);
    });

    return this.saveState(state);
  }

  static clearAllEvents(): { success: boolean; error?: string } {
    const state = this.loadState();
    state.events.forEach((ev) => {
      if (ev.customPosterTemplateUrl) void deleteMediaDataUrl(ev.customPosterTemplateUrl);
    });
    state.events = [];
    state.marks = [];
    state.participants.forEach((p) => {
      p.registeredEventIds = [];
    });
    state.judges.forEach((j) => {
      j.assignedEventIds = [];
    });
    return this.saveState(state);
  }

  static deleteJudge(judgeId: string): { success: boolean; error?: string } {
    const state = this.loadState();
    state.judges = state.judges.filter((j) => j.id !== judgeId);
    state.marks = state.marks.filter((m) => m.judgeId !== judgeId);

    state.events.forEach((ev) => {
      ev.assignedJudgeIds = (ev.assignedJudgeIds || []).filter((id) => id !== judgeId);
    });

    return this.saveState(state);
  }

  static clearAllJudges(): { success: boolean; error?: string } {
    const state = this.loadState();
    state.judges = [];
    state.events.forEach((ev) => {
      ev.assignedJudgeIds = [];
    });
    return this.saveState(state);
  }

  static clearAllParticipants(): { success: boolean; error?: string } {
    const state = this.loadState();
    state.participants = [];
    state.marks = [];
    state.events.forEach((ev) => {
      ev.winners = undefined;
      if (ev.status === 'Results Published' || ev.status === 'Under Review (Admin Only)') {
        ev.status = 'Upcoming';
        ev.isPublishedToPublic = false;
      }
    });
    return this.saveState(state);
  }

  static setEventPosterTemplate(eventId: string, templateDataUrl: string): void {
    const state = this.loadState();
    const ev = state.events.find((e) => e.id === eventId);
    if (ev) {
      if (ev.customPosterTemplateUrl && ev.customPosterTemplateUrl !== templateDataUrl) {
        void deleteMediaDataUrl(ev.customPosterTemplateUrl);
      }
      ev.customPosterTemplateUrl = templateDataUrl;
      this.saveState(state);
    }
  }

  /**
   * Clear All Initial Dummy / Sample Data cleanly (keeps teams & branding settings)
   */
  static clearAllInitialDummyData(): { success: boolean; message: string } {
    const state = this.loadState();
    state.participants = [];
    state.marks = [];
    state.events = [];
    state.judges = [];
    state.photos = [];
    state.donations = [];
    void clearAllMediaBlobs();
    this.saveState(state);
    return { success: true, message: 'All dummy/sample data cleared cleanly. Only newly added entries will exist.' };
  }

  /**
   * Dynamic Score Calculation & Team Leaderboard
   */
  static calculateTeamScores(state: FestState, includeUnpublishedForAdmin = false): TeamScoreSummary[] {
    const scheme = state.settings.pointsScheme;

    const summaryMap = new Map<string, { first: number; second: number; third: number; total: number }>();
    state.teams.forEach((t) => {
      summaryMap.set(t.id, { first: 0, second: 0, third: 0, total: 0 });
    });

    state.events.forEach((ev) => {
      const isVisible = includeUnpublishedForAdmin || ev.isPublishedToPublic;
      if (isVisible && ev.winners) {
        if (ev.winners.first?.teamId && summaryMap.has(ev.winners.first.teamId)) {
          const entry = summaryMap.get(ev.winners.first.teamId)!;
          entry.first += 1;
          entry.total += scheme.first;
        }
        if (ev.winners.second?.teamId && summaryMap.has(ev.winners.second.teamId)) {
          const entry = summaryMap.get(ev.winners.second.teamId)!;
          entry.second += 1;
          entry.total += scheme.second;
        }
        if (ev.winners.third?.teamId && summaryMap.has(ev.winners.third.teamId)) {
          const entry = summaryMap.get(ev.winners.third.teamId)!;
          entry.third += 1;
          entry.total += scheme.third;
        }
      }
    });

    const summaries: TeamScoreSummary[] = state.teams.map((t) => {
      const stats = summaryMap.get(t.id) || { first: 0, second: 0, third: 0, total: 0 };
      return {
        team: t,
        firstCount: stats.first,
        secondCount: stats.second,
        thirdCount: stats.third,
        totalPoints: stats.total,
        rank: 1,
      };
    });

    summaries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
      return b.secondCount - a.secondCount;
    });

    summaries.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    return summaries;
  }

  /**
   * REFINED DYNAMIC CALCULATION: 'Pen of the Fest' & 'Star of the Fest'
   * Rules enforced:
   * 1. Categories Eligible: ONLY Sub-Junior, Junior, and Senior combined across the entire I-FEST.
   * 2. Exclusions: General category competitions, General category participants, and ALL Group competitions are strictly excluded.
   * 3. Pen of the Fest: Highest individual points earned strictly from Off-Stage individual competitions -> ONLY 1 overall winner.
   * 4. Star of the Fest: Highest individual points earned across individual competitions combined (default On-Stage + Off-Stage combined; admin-configurable) -> ONLY 1 overall winner.
   */
  static calculateSpecialAwards(state: FestState, includeUnpublished = false): SpecialAwardsSummary {
    const scheme = state.settings.pointsScheme;
    const starStageScope = state.settings.starOfFestStageScope || 'combined';
    const ELIGIBLE_CATEGORIES = new Set(['Sub-Junior', 'Junior', 'Senior']);

    interface AwardTally {
      participant: Participant;
      points: number;
      firstCount: number;
      secondCount: number;
      thirdCount: number;
      scoreSum: number;
      eventsWon: Array<{
        eventId: string;
        eventTitle: string;
        category: FestEvent['targetCategory'];
        position: 'First' | 'Second' | 'Third';
        points: number;
        stageType: StageType;
      }>;
    }

    const penMap = new Map<string, AwardTally>();
    const starMap = new Map<string, AwardTally>();

    state.participants.forEach((p) => {
      // Strictly exclude General category participants
      if (!ELIGIBLE_CATEGORIES.has(p.category)) return;

      penMap.set(p.id, {
        participant: p,
        points: 0,
        firstCount: 0,
        secondCount: 0,
        thirdCount: 0,
        scoreSum: 0,
        eventsWon: [],
      });
      starMap.set(p.id, {
        participant: p,
        points: 0,
        firstCount: 0,
        secondCount: 0,
        thirdCount: 0,
        scoreSum: 0,
        eventsWon: [],
      });
    });

    const addAwardWin = (
      map: Map<string, AwardTally>,
      detail: WinnerDetail | undefined,
      position: 'First' | 'Second' | 'Third',
      pts: number,
      ev: FestEvent,
      stageType: StageType
    ) => {
      if (!detail?.participantId || !map.has(detail.participantId)) return;
      const item = map.get(detail.participantId)!;
      item.points += pts;
      item.scoreSum += detail.score || 0;
      if (position === 'First') item.firstCount += 1;
      else if (position === 'Second') item.secondCount += 1;
      else item.thirdCount += 1;

      item.eventsWon.push({
        eventId: ev.id,
        eventTitle: ev.title,
        category: ev.targetCategory,
        position,
        points: pts,
        stageType,
      });
    };

    state.events.forEach((ev) => {
      const isVisible = includeUnpublished || ev.isPublishedToPublic;
      // Strictly exclude unpublished, group events, and General division events
      if (!isVisible || !ev.winners || ev.isGroupEvent || ev.targetCategory === 'General') {
        return;
      }

      const stageType: StageType =
        ev.stageType ||
        (ev.category === 'Literary' || ev.category === 'Fine Arts' || ev.category === 'Tech & Coding'
          ? 'Off-Stage'
          : 'On-Stage');

      // 1. Pen of the Fest -> Strictly Off-Stage Individual competitions
      if (stageType === 'Off-Stage') {
        addAwardWin(penMap, ev.winners.first, 'First', scheme.first, ev, stageType);
        addAwardWin(penMap, ev.winners.second, 'Second', scheme.second, ev, stageType);
        addAwardWin(penMap, ev.winners.third, 'Third', scheme.third, ev, stageType);
      }

      // 2. Star of the Fest -> Combined On-Stage + Off-Stage (or configured stage scope)
      const matchesStarScope =
        starStageScope === 'combined' ||
        (starStageScope === 'offstage' && stageType === 'Off-Stage') ||
        (starStageScope === 'onstage' && stageType === 'On-Stage');

      if (matchesStarScope) {
        addAwardWin(starMap, ev.winners.first, 'First', scheme.first, ev, stageType);
        addAwardWin(starMap, ev.winners.second, 'Second', scheme.second, ev, stageType);
        addAwardWin(starMap, ev.winners.third, 'Third', scheme.third, ev, stageType);
      }
    });

    const pickSingleTopWinner = (map: Map<string, AwardTally>): AwardTally | null => {
      const candidates = Array.from(map.values()).filter((t) => t.points > 0);
      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
        if (b.secondCount !== a.secondCount) return b.secondCount - a.secondCount;
        if (b.thirdCount !== a.thirdCount) return b.thirdCount - a.thirdCount;
        if (b.scoreSum !== a.scoreSum) return b.scoreSum - a.scoreSum;
        return a.participant.code.localeCompare(b.participant.code);
      });

      return candidates[0];
    };

    const penWinner = pickSingleTopWinner(penMap);
    const starWinner = pickSingleTopWinner(starMap);

    return {
      penOfTheFest: penWinner
        ? {
            participant: penWinner.participant,
            totalPoints: penWinner.points,
            totalOffStagePoints: penWinner.points,
            firstCount: penWinner.firstCount,
            secondCount: penWinner.secondCount,
            thirdCount: penWinner.thirdCount,
            eventsWon: penWinner.eventsWon,
          }
        : null,
      starOfTheFest: starWinner
        ? {
            participant: starWinner.participant,
            totalPoints: starWinner.points,
            totalOverallPoints: starWinner.points,
            firstCount: starWinner.firstCount,
            secondCount: starWinner.secondCount,
            thirdCount: starWinner.thirdCount,
            eventsWon: starWinner.eventsWon,
          }
        : null,
    };
  }

  /**
   * Compute Participant Average Score for an Event across all judges
   */
  static getEventContestantRankings(
    eventId: string,
    state: FestState
  ): Array<{
    participant: Participant;
    totalAverageScore: number;
    judgeSubmissions: MarkEntry[];
    calculatedRank: number;
  }> {
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return [];

    const participants = state.participants.filter((p) => p.registeredEventIds.includes(eventId));
    const eventMarks = state.marks.filter((m) => m.eventId === eventId);

    const results = participants.map((p) => {
      const pMarks = eventMarks.filter((m) => m.participantId === p.id);
      const totalScoreSum = pMarks.reduce((acc, curr) => acc + curr.totalScore, 0);
      const avgScore = pMarks.length > 0 ? parseFloat((totalScoreSum / pMarks.length).toFixed(1)) : 0;
      return {
        participant: p,
        totalAverageScore: avgScore,
        judgeSubmissions: pMarks,
        calculatedRank: 0,
      };
    });

    results.sort((a, b) => b.totalAverageScore - a.totalAverageScore);
    results.forEach((r, idx) => {
      r.calculatedRank = idx + 1;
    });

    return results;
  }

  /**
   * Submit or update Judge Marks
   */
  static submitMark(entry: Omit<MarkEntry, 'id' | 'updatedAt'>): void {
    const state = this.loadState();
    const existingIdx = state.marks.findIndex(
      (m) =>
        m.eventId === entry.eventId &&
        m.participantId === entry.participantId &&
        m.judgeId === entry.judgeId
    );

    const updatedEntry: MarkEntry = {
      ...entry,
      id: existingIdx >= 0 ? state.marks[existingIdx].id : `mark-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      state.marks[existingIdx] = updatedEntry;
    } else {
      state.marks.push(updatedEntry);
    }

    const ev = state.events.find((e) => e.id === entry.eventId);
    if (ev && ev.status === 'Upcoming') {
      ev.status = 'Judging';
    }

    this.saveState(state);
  }

  /**
   * Declare Event Results (Privacy protected unless publishImmediately = true)
   */
  static declareEventResults(
    eventId: string,
    winners: {
      first?: WinnerDetail;
      second?: WinnerDetail;
      third?: WinnerDetail;
      notes?: string;
    },
    publishedBy: string,
    publishImmediately = false
  ): void {
    const state = this.loadState();
    const ev = state.events.find((e) => e.id === eventId);
    if (!ev) return;

    ev.status = publishImmediately ? 'Results Published' : 'Under Review (Admin Only)';
    ev.isPublishedToPublic = publishImmediately;
    ev.winners = {
      ...winners,
      publishedAt: new Date().toISOString(),
      publishedBy,
    };

    this.saveState(state);
  }

  /**
   * Executive Admin Toggle: Publish or Unpublish competition results to public
   */
  static toggleEventPublicPublish(eventId: string, isPublished?: boolean): boolean {
    const state = this.loadState();
    const ev = state.events.find((e) => e.id === eventId);
    if (!ev) return false;

    const targetVal = isPublished !== undefined ? isPublished : !ev.isPublishedToPublic;
    ev.isPublishedToPublic = targetVal;
    if (targetVal) {
      ev.status = 'Results Published';
    } else if (ev.winners) {
      ev.status = 'Under Review (Admin Only)';
    }

    this.saveState(state);
    return targetVal;
  }

  /**
   * Executive Admin: Publish all events currently under review in one click
   */
  static publishAllReviewedEvents(): number {
    const state = this.loadState();
    let count = 0;
    state.events.forEach((ev) => {
      if (ev.winners && (!ev.isPublishedToPublic || ev.status === 'Under Review (Admin Only)')) {
        ev.isPublishedToPublic = true;
        ev.status = 'Results Published';
        count++;
      }
    });
    this.saveState(state);
    return count;
  }

  /**
   * Media (Photos & Videos) Management
   */
  static addPhoto(photo: Omit<FestPhoto, 'id' | 'uploadedAt'>): { success: boolean; error?: string } {
    const state = this.loadState();
    if (!state.photos) state.photos = [];
    const newPhoto: FestPhoto = {
      ...photo,
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      uploadedAt: new Date().toISOString(),
    };
    state.photos.unshift(newPhoto);

    // Map portrait photo back to participant when uploading a photo
    if ((photo.mediaType || 'photo') === 'photo' && photo.photoUrl) {
      if (photo.participantId) {
        const p = state.participants.find((part) => part.id === photo.participantId);
        if (p) p.photoUrl = photo.photoUrl;
      } else if (photo.chestNumber) {
        const p = state.participants.find(
          (part) => part.chestNumber === photo.chestNumber || part.code === photo.chestNumber
        );
        if (p) p.photoUrl = photo.photoUrl;
      }
    }

    return this.saveState(state);
  }

  static deletePhoto(photoId: string): void {
    const state = this.loadState();
    if (!state.photos) return;
    const target = state.photos.find((p) => p.id === photoId);
    if (target) {
      void deleteMediaDataUrl(target.photoUrl);
      void deleteMediaDataUrl(target.videoUrl);
    }
    state.photos = state.photos.filter((p) => p.id !== photoId);
    this.saveState(state);
  }

  static updateParticipantPhoto(participantId: string, photoUrl: string): void {
    const state = this.loadState();
    const p = state.participants.find((part) => part.id === participantId);
    if (p) {
      p.photoUrl = photoUrl;
      if (!state.photos) state.photos = [];
      state.photos.unshift({
        id: `photo-part-${Date.now()}`,
        title: `${p.name} [Chest #${p.chestNumber}]`,
        category: 'Participant',
        mediaType: 'photo',
        participantId: p.id,
        chestNumber: p.chestNumber,
        participantName: p.name,
        photoUrl,
        uploadedAt: new Date().toISOString(),
        description: `Official portrait of ${p.name} (${p.teamName})`,
      });
      this.saveState(state);
    }
  }

  /**
   * Donations & Transparent Fest Contributions
   */
  static addDonation(
    entry: Omit<DonationRecord, 'id' | 'createdAt' | 'status' | 'verifiedBy'>,
    role: UserRole = 'public'
  ): { success: boolean; record?: DonationRecord; error?: string } {
    const state = this.loadState();
    if (!Array.isArray(state.donations)) state.donations = [];

    const newRecord: DonationRecord = {
      ...entry,
      id: `don-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: role === 'admin' ? 'Verified' : 'Pending Verification',
      verifiedBy: role === 'admin' ? 'Executive Committee Admin' : undefined,
      createdAt: new Date().toISOString(),
    };

    state.donations.unshift(newRecord);
    const saveRes = this.saveState(state);
    return saveRes.success ? { success: true, record: newRecord } : { success: false, error: saveRes.error };
  }

  static verifyDonation(
    donationId: string,
    status: 'Verified' | 'Pending Verification'
  ): { success: boolean } {
    const state = this.loadState();
    if (!Array.isArray(state.donations)) return { success: false };
    state.donations = state.donations.map((d) =>
      d.id === donationId
        ? {
            ...d,
            status,
            verifiedBy: status === 'Verified' ? 'Executive Committee Admin' : undefined,
          }
        : d
    );
    return this.saveState(state);
  }

  static deleteDonation(donationId: string): { success: boolean } {
    const state = this.loadState();
    if (!Array.isArray(state.donations)) return { success: false };
    state.donations = state.donations.filter((d) => d.id !== donationId);
    return this.saveState(state);
  }

  static clearAllDonations(): { success: boolean } {
    const state = this.loadState();
    state.donations = [];
    return this.saveState(state);
  }

  /**
   * Reset All Scores & Live Statuses
   */
  static resetAllScoresAndStatuses(): void {
    const state = this.loadState();
    state.marks = [];
    state.events = state.events.map((ev) => ({
      ...ev,
      status: 'Upcoming',
      isPublishedToPublic: false,
      winners: undefined,
    }));
    this.saveState(state);
  }

  /**
   * Reset Database to Fresh Default
   */
  static factoryReset(): void {
    void clearAllMediaBlobs();
    const initial = getInitialFestData();
    syncAllEventsJudgeCodeLetters(initial);
    this.saveState(initial);
  }

  /**
   * Export Entire Fest State as Downloadable JSON
   */
  static exportDatabaseJSON(): string {
    const state = this.loadState();
    return JSON.stringify(state, null, 2);
  }

  /**
   * Import Fest State from JSON
   */
  static importDatabaseJSON(jsonStr: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr) as FestState;
      if (!parsed.settings || !parsed.teams || !parsed.events) {
        return { success: false, error: 'Invalid file format: missing essential fest keys.' };
      }
      syncAllEventsJudgeCodeLetters(parsed);
      const saveRes = this.saveState(parsed);
      return saveRes.success ? { success: true } : { success: false, error: saveRes.error };
    } catch (e) {
      return { success: false, error: `Invalid JSON syntax: ${(e as Error).message}` };
    }
  }
}
