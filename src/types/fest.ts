/**
 * Types and Data Contracts for I-FEST 2027 Platform
 */

export type UserRole = 'admin' | 'manager' | 'judge' | 'public';

export type AgeCategory = 'Sub-Junior' | 'Junior' | 'Senior' | 'General';

export type StageType = 'On-Stage' | 'Off-Stage';

export interface UserSession {
  role: UserRole;
  username: string;
  name: string;
  teamId?: string; // For team managers
  judgeId?: string; // For judges
}

export interface Team {
  id: string;
  name: string;
  codePrefix: string; // e.g. 'A', 'B', 'C'
  color: string; // Tailwind hex color
  managerUsername: string;
  managerPassword: string; // Dynamically editable by Executive Admin
  managerName: string;
  contactPhone: string;
}

export interface Participant {
  id: string;
  code: string; // e.g. "A-101", "B-204"
  chestNumber: string; // e.g. "101", "204"
  name: string;
  teamId: string;
  teamName: string;
  category: AgeCategory; // Sub-Junior, Junior, Senior, General
  registeredEventIds: string[];
  photoUrl?: string; // Mapped participant profile picture
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface ScoreCriteria {
  id: string;
  name: string;
  maxMarks: number;
}

export interface WinnerDetail {
  participantId: string;
  participantName: string;
  teamId: string;
  teamName: string;
  code: string;
  chestNumber?: string;
  score: number;
  photoUrl?: string;
}

export interface EventWinners {
  first?: WinnerDetail;
  second?: WinnerDetail;
  third?: WinnerDetail;
  publishedAt?: string;
  publishedBy?: string;
  notes?: string;
}

export interface FestEvent {
  id: string;
  title: string;
  category: 'Stage' | 'Off-Stage' | 'Literary' | 'Fine Arts' | 'Music & Dance' | 'Tech & Coding' | 'Gaming';
  stageType: StageType; // 'On-Stage' vs 'Off-Stage'
  targetCategory: AgeCategory | 'All'; // Senior, Junior, Sub-Junior, General, or All
  venue: string;
  date: string;
  time: string;
  rules: string[];
  status: 'Upcoming' | 'Ongoing' | 'Judging' | 'Under Review (Admin Only)' | 'Results Published';
  isPublishedToPublic: boolean; // Privacy control: false = Executive Admin Review only
  isGroupEvent: boolean; // True = group competition (strictly excluded from Pen & Star of the Fest)
  maxParticipantsPerTeam: number;
  criteria: ScoreCriteria[];
  assignedJudgeIds: string[];
  winners?: EventWinners;
  customPosterTemplateUrl?: string; // Per-event single poster template (for 1st, 2nd & 3rd)
  judgeCodeLetters?: Record<string, string>; // Anonymous random alphabet codes (e.g. A, B, C) per participantId
}

export interface MarkEntry {
  id: string;
  eventId: string;
  participantId: string;
  judgeId: string;
  judgeName: string;
  criteriaScores: Record<string, number>;
  totalScore: number;
  remarks?: string;
  updatedAt: string;
}

export interface Judge {
  id: string;
  username: string;
  password: string;
  name: string;
  designation: string;
  assignedEventIds: string[];
  createdAt: string;
}

export interface TimeLockSettings {
  enabled: boolean;
  deadline: string; // ISO date-time string
  reason: string;
  allowTeamManagerAdd: boolean;
  allowTeamManagerEdit: boolean;
  allowTeamManagerDelete: boolean;
}

export interface FestPointsScheme {
  first: number;
  second: number;
  third: number;
  participation: number;
}

export interface AppCustomLabels {
  // Navigation labels
  navLeaderboard: string;
  navEvents: string;
  navTeams: string;
  navGallery: string;
  navJudging: string;
  navAdmin: string;
  signInButton: string;
  switchRoleButton: string;
  guestVisitorLabel: string;

  // Hero & Access Portals
  currentAccessHeading: string;
  openPortalButton: string;
  portalsSectionTitle: string;
  portalAdminTitle: string;
  portalAdminBadge: string;
  portalAdminDesc: string;
  portalManagerTitle: string;
  portalManagerBadge: string;
  portalManagerDesc: string;
  portalJudgeTitle: string;
  portalJudgeBadge: string;
  portalJudgeDesc: string;
  portalPublicTitle: string;
  portalPublicBadge: string;
  portalPublicDesc: string;

  // Special Awards & Leaderboard
  specialAwardsHeading: string;
  specialAwardsSubheading: string;
  penAwardBadge: string;
  starAwardBadge: string;
  teamLeaderboardKicker: string;
  eventsResultsKicker: string;
  eventsResultsHeading: string;
  firstPositionLabel: string;
  secondPositionLabel: string;
  thirdPositionLabel: string;
  totalPointsLabel: string;
  combinedPosterButton: string;

  // Gallery, Teams, Competitions, Judging & Donation headings
  galleryFreeBadge: string;
  teamsRosterHeading: string;
  eventsScheduleHeading: string;
  eventsScheduleSubtitle: string;
  judgesDeskHeading: string;
  judgesDeskSubtitle: string;
  navDonate: string;
  donateButtonLabel: string;
  donateSectionHeading: string;
  donateSectionSubtitle: string;
  footerSignInLink: string;
}

export interface DonationSettings {
  enabled: boolean;
  fundGoal: number;
  upiId: string;
  upiName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  donationNote: string;
}

export interface DonationRecord {
  id: string;
  donorName: string;
  donorRole: 'Alumni' | 'Well-Wisher' | 'Faculty' | 'Student' | 'Sponsor' | 'Public';
  amount: number;
  currency: string;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash Pledge' | 'Card';
  transactionRef?: string;
  purpose?: string;
  message?: string;
  status: 'Verified' | 'Pending Verification';
  createdAt: string;
  verifiedBy?: string;
}

export interface FestSettings {
  festName: string;
  tagline: string;
  collegeName: string;
  festDates: string;
  logoUrl: string;
  heroBannerUrl: string;
  posterTemplateUrl: string;
  customPosterBgUrl?: string;
  pointsScheme: FestPointsScheme;
  announcement: string;
  contestantCodePrefix: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  // Global customizable content dictionary
  heroKicker?: string;
  heroSubtitle?: string;
  leaderboardTitle?: string;
  leaderboardSubtitle?: string;
  penOfFestTitle?: string;
  penOfFestSubtitle?: string;
  starOfFestTitle?: string;
  starOfFestSubtitle?: string;
  starOfFestStageScope?: 'combined' | 'offstage' | 'onstage';
  galleryTitle?: string;
  gallerySubtitle?: string;
  footerCopyright?: string;
  unifiedPosterTemplateUrl?: string;
  donationSettings?: DonationSettings;
  customLabels?: Partial<AppCustomLabels>;
}

export interface FestPhoto {
  id: string;
  title: string;
  category: 'Participant' | 'Event' | 'Winners' | 'General';
  mediaType?: 'photo' | 'video';
  videoUrl?: string;
  participantId?: string;
  chestNumber?: string;
  participantName?: string;
  eventId?: string;
  eventName?: string;
  photoUrl: string;
  uploadedAt: string;
  uploadedBy?: string;
  description?: string;
}

export interface AwardWinnerSummary {
  participant: Participant;
  totalPoints: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  eventsWon: Array<{
    eventId: string;
    eventTitle: string;
    category: AgeCategory | 'All';
    position: 'First' | 'Second' | 'Third';
    points: number;
    stageType: StageType;
  }>;
}

export interface SpecialAwardsSummary {
  penOfTheFest: (AwardWinnerSummary & { totalOffStagePoints: number }) | null;
  starOfTheFest: (AwardWinnerSummary & { totalOverallPoints: number }) | null;
}

export interface FestState {
  settings: FestSettings;
  timeLock: TimeLockSettings;
  teams: Team[];
  participants: Participant[];
  events: FestEvent[];
  judges: Judge[];
  marks: MarkEntry[];
  photos: FestPhoto[];
  donations: DonationRecord[];
  lastUpdated: string;
}

export interface TeamScoreSummary {
  team: Team;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  totalPoints: number;
  rank: number;
}
