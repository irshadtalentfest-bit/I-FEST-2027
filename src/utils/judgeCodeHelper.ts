import { FestEvent, FestState, Participant } from '../types/fest';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Generates candidate alphabet identifiers:
 * First 26: A..Z
 * Next batches if >26 contestants: A1..Z1, A2..Z2, etc.
 */
function getCandidatePoolForSize(neededIndex: number): string[] {
  const batch = Math.floor(neededIndex / ALPHABET.length);
  if (batch === 0) return [...ALPHABET];
  return ALPHABET.map((letter) => `${letter}${batch}`);
}

/**
 * Picks a random unassigned English alphabet code letter not currently in `usedCodes`.
 */
export function pickRandomAlphabetCode(usedCodes: Set<string>): string {
  let batch = 0;
  while (batch < 20) {
    const pool = getCandidatePoolForSize(batch * ALPHABET.length).filter(
      (code) => !usedCodes.has(code)
    );
    if (pool.length > 0) {
      const randomIdx = Math.floor(Math.random() * pool.length);
      return pool[randomIdx];
    }
    batch++;
  }
  return `X${Date.now().toString().slice(-3)}`;
}

/**
 * Ensures every participant registered in `event` has a unique, random English alphabet code letter
 * stored in `event.judgeCodeLetters`, pruning unregistered participants.
 */
export function syncEventJudgeCodeLetters(
  event: FestEvent,
  participants: Participant[]
): { judgeCodeLetters: Record<string, string>; changed: boolean } {
  const registeredIds = participants
    .filter((p) => (p.registeredEventIds || []).includes(event.id))
    .map((p) => p.id);

  const existing = event.judgeCodeLetters || {};
  const nextMap: Record<string, string> = {};
  const usedCodes = new Set<string>();
  let changed = false;

  // Keep valid existing assignments for currently registered participants
  for (const pid of registeredIds) {
    const currentCode = existing[pid];
    if (currentCode && !usedCodes.has(currentCode)) {
      nextMap[pid] = currentCode;
      usedCodes.add(currentCode);
    }
  }

  // Detect removals
  for (const existingPid of Object.keys(existing)) {
    if (!registeredIds.includes(existingPid)) {
      changed = true;
    }
  }

  // Assign random unused English alphabet code letters to newly registered participants
  for (const pid of registeredIds) {
    if (!nextMap[pid]) {
      const generated = pickRandomAlphabetCode(usedCodes);
      nextMap[pid] = generated;
      usedCodes.add(generated);
      changed = true;
    }
  }

  if (!event.judgeCodeLetters && registeredIds.length === 0) {
    changed = true;
  }

  return { judgeCodeLetters: nextMap, changed };
}

/**
 * Synchronizes judge code letters across all events in FestState.
 */
export function syncAllEventsJudgeCodeLetters(state: FestState): boolean {
  let anyChanged = false;
  state.events = state.events.map((ev) => {
    const { judgeCodeLetters, changed } = syncEventJudgeCodeLetters(ev, state.participants);
    if (changed) {
      anyChanged = true;
      return { ...ev, judgeCodeLetters };
    }
    return ev;
  });
  return anyChanged;
}

/**
 * Returns the anonymous judge code letter for a participant in an event.
 */
export function getParticipantJudgeCode(event: FestEvent | undefined, participantId: string): string {
  if (!event) return '?';
  const assigned = event.judgeCodeLetters?.[participantId];
  if (assigned) return assigned;
  return 'PENDING';
}
