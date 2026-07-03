const K_FACTOR = 32;
const RATING_DIVISOR = 400;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / RATING_DIVISOR));
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  kFactor: number = K_FACTOR,
): { newRatingA: number; newRatingB: number } {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const newRatingA = Math.round(ratingA + kFactor * (scoreA - expectedA));
  const newRatingB = Math.round(ratingB + kFactor * (1 - scoreA - expectedB));
  return { newRatingA, newRatingB };
}

export function getWinScore(winValue: number): number {
  if (winValue === 1) return 1;
  if (winValue === 2) return 1.5;
  if (winValue === 3) return 2;
  return 1;
}
