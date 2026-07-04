export interface BracketMatch {
  round: number;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
}

export interface BracketRound {
  round: number;
  matches: BracketMatch[];
}

export function generateSingleElimination(playerIds: string[]): BracketRound[] {
  const n = playerIds.length;
  if (n < 2) return [];

  const size = Math.pow(2, Math.ceil(Math.log2(n)));
  const seeds = new Array<string | null>(size);

  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (let i = 0; i < n; i++) {
    seeds[i] = shuffled[i];
  }

  const rounds: BracketRound[] = [];
  let currentRound: (string | null)[] = seeds;
  let roundNum = 1;

  while (currentRound.length > 1) {
    const matches: BracketMatch[] = [];
    const nextRound: (string | null)[] = [];

    for (let i = 0; i < currentRound.length; i += 2) {
      const p1 = currentRound[i];
      const p2 = currentRound[i + 1] ?? null;
      matches.push({
        round: roundNum,
        matchIndex: i / 2,
        player1Id: p1,
        player2Id: p2,
      });
      nextRound.push(p1 && p2 ? null : (p1 ?? p2));
    }

    rounds.push({ round: roundNum, matches });
    currentRound = nextRound;
    roundNum++;
  }

  return rounds;
}

export function generateRoundRobin(playerIds: string[]): BracketRound[] {
  const n = playerIds.length;
  if (n < 2) return [];

  const ids = [...playerIds];
  const isOdd = n % 2 !== 0;
  if (isOdd) ids.push('__BYE__');

  const totalRounds = ids.length - 1;
  const rounds: BracketRound[] = [];

  for (let round = 0; round < totalRounds; round++) {
    const matches: BracketMatch[] = [];

    for (let i = 0; i < ids.length / 2; i++) {
      const p1 = ids[i];
      const p2 = ids[ids.length - 1 - i];

      if (p1 !== '__BYE__' && p2 !== '__BYE__') {
        matches.push({
          round: round + 1,
          matchIndex: matches.length,
          player1Id: p1,
          player2Id: p2,
        });
      }
    }

    rounds.push({ round: round + 1, matches });

    // Rotate: keep first fixed, shift rest clockwise
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }

  return rounds;
}