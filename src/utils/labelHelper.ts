import { AppCustomLabels, FestSettings } from '../types/fest';

export const DEFAULT_CUSTOM_LABELS: AppCustomLabels = {
  // Navigation labels
  navLeaderboard: 'Live Leaderboard',
  navEvents: 'Competitions & Results',
  navTeams: 'Team Rosters & Codes',
  navGallery: 'Gallery & Downloads',
  navJudging: 'Judges Scoring',
  navAdmin: 'Executive Controls',
  signInButton: 'Sign In / Role Portal',
  switchRoleButton: 'Switch Role',
  guestVisitorLabel: 'Guest Visitor',

  // Hero & Access Portals
  currentAccessHeading: 'Current Access',
  openPortalButton: 'Open 4-Tier Login Portal',
  portalsSectionTitle: 'Four-Tier Authentication Portals:',
  portalAdminTitle: '1. Executive Admin',
  portalAdminBadge: 'Secured',
  portalAdminDesc: 'Secured master login. Absolute 24/7 control over passwords, time-lock, & resets.',
  portalManagerTitle: '2. Team Managers',
  portalManagerBadge: '3 Teams',
  portalManagerDesc: 'Individual team logins. Manage rosters & competitions before time-lock expires.',
  portalJudgeTitle: '3. Judges Panel',
  portalJudgeBadge: 'Official',
  portalJudgeDesc: 'Secure login for jury members to submit live scores for assigned events.',
  portalPublicTitle: '4. Participants / Public',
  portalPublicBadge: 'Without Login',
  portalPublicDesc: 'Direct browse mode: live leaderboards, winner poster downloads, & media gallery.',

  // Special Awards & Leaderboard
  specialAwardsHeading: 'Special Fest Honors · Real-Time Dynamic Titles',
  specialAwardsSubheading: 'Single fest winner across Sub-Junior, Junior & Senior (General & Group excluded)',
  penAwardBadge: 'Single Overall Recipient · Off-Stage Individual',
  starAwardBadge: 'Single Overall Recipient · All-Round Individual',
  teamLeaderboardKicker: 'Live Standings',
  eventsResultsKicker: 'Event Declarations',
  eventsResultsHeading: 'Event Results & Automated Winner Posters',
  firstPositionLabel: 'First Position',
  secondPositionLabel: 'Second Position',
  thirdPositionLabel: 'Third Position',
  totalPointsLabel: 'Total Points',
  combinedPosterButton: '1st/2nd/3rd Poster',

  // Gallery, Teams, Competitions, Judging & Donation headings
  galleryFreeBadge: 'Free Public Download',
  teamsRosterHeading: 'Team Rosters & Contestant Codes',
  eventsScheduleHeading: 'Competitions Schedule & Rules',
  eventsScheduleSubtitle: 'Browse stage timetables, rules, divisions, and time-locked program updates.',
  judgesDeskHeading: 'Official Judges Marking Desk',
  judgesDeskSubtitle: 'Score contestants across standardized criteria. Standings and rankings update dynamically.',
  navDonate: 'Support / Donate',
  donateButtonLabel: 'Support Fest Fund',
  donateSectionHeading: 'I-FEST 2027 Support & Fund Contributions',
  donateSectionSubtitle: 'Transparent contributions from alumni, well-wishers, and patrons empowering student cultural & literary excellence.',
  footerSignInLink: 'Sign In / Access Roles',
};

export function getAppLabel(settings: FestSettings | undefined, key: keyof AppCustomLabels): string {
  const val = settings?.customLabels?.[key];
  if (val !== undefined && val !== '') {
    return val;
  }
  return DEFAULT_CUSTOM_LABELS[key];
}
