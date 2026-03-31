const ANALYSIS_INTERVAL_MINUTES = 15;
const ANALYSIS_INTERVAL_MS = ANALYSIS_INTERVAL_MINUTES * 60 * 1000;

const SLOTS = [1, 16, 31, 46];

export function getAnalysisSlotStart(date: Date): Date {
  const slotStart = new Date(date);
  slotStart.setSeconds(0, 0);
  const min = slotStart.getMinutes();
  const slot = [...SLOTS].reverse().find(s => s <= min) ?? SLOTS[SLOTS.length - 1];
  if (slot > min) {
    slotStart.setHours(slotStart.getHours() - 1);
  }
  slotStart.setMinutes(slot, 0, 0);
  return slotStart;
}

export function getNextAnalysisTime(from = new Date()): Date {
  const min = from.getMinutes();
  const nextSlot = SLOTS.find(s => s > min) ?? SLOTS[0];
  const nxt = new Date(from);
  if (nextSlot <= min) nxt.setHours(nxt.getHours() + 1);
  nxt.setMinutes(nextSlot, 0, 0);
  nxt.setSeconds(0, 0);
  return nxt;
}

export function isAnalysisCurrentForActiveSlot(lastUpdate: Date | null | undefined, now = new Date()): boolean {
  if (!lastUpdate) return false;
  return getAnalysisSlotStart(lastUpdate).toISOString() === getAnalysisSlotStart(now).toISOString();
}