const ANALYSIS_INTERVAL_MINUTES = 5;
const ANALYSIS_INTERVAL_MS = ANALYSIS_INTERVAL_MINUTES * 60 * 1000;

export function getAnalysisSlotStart(date: Date): Date {
  const slotStart = new Date(date);
  slotStart.setSeconds(0, 0);

  const flooredMinutes = Math.floor(slotStart.getMinutes() / ANALYSIS_INTERVAL_MINUTES) * ANALYSIS_INTERVAL_MINUTES;
  slotStart.setMinutes(flooredMinutes, 0, 0);

  return slotStart;
}

export function getNextAnalysisTime(from = new Date()): Date {
  const slotStart = getAnalysisSlotStart(from);
  return new Date(slotStart.getTime() + ANALYSIS_INTERVAL_MS);
}

export function isAnalysisCurrentForActiveSlot(lastUpdate: Date | null | undefined, now = new Date()): boolean {
  if (!lastUpdate) return false;
  return getAnalysisSlotStart(lastUpdate).toISOString() === getAnalysisSlotStart(now).toISOString();
}