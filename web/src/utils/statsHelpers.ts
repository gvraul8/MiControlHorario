import { getWeek } from './dateHelpers';
import type { JobInfo, WorkEntryWithDate } from '../types';

export type ChartRow = Record<string, string | number>;

export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function flattenEntriesInRange(
  entries: Record<string, { job: string; hours: number }[]>,
  startDate: string,
  endDate: string,
): WorkEntryWithDate[] {
  if (!startDate || !endDate) return [];

  return Object.entries(entries)
    .filter(([date]) => date >= startDate && date <= endDate)
    .flatMap(([date, dayEntries]) =>
      dayEntries.map((entry, index) => ({
        ...entry,
        date,
        id: `${date}-${index}`,
      })),
    );
}

export function getEntryValue(
  entry: WorkEntryWithDate,
  displayMode: 'hours' | 'money',
  jobInfo: Record<string, JobInfo>,
): number {
  return displayMode === 'hours'
    ? entry.hours
    : entry.hours * (jobInfo[entry.job]?.rate || 0);
}

export function sumEntryValues(
  list: WorkEntryWithDate[],
  displayMode: 'hours' | 'money',
  jobInfo: Record<string, JobInfo>,
): number {
  return list.reduce((acc, entry) => acc + getEntryValue(entry, displayMode, jobInfo), 0);
}

export function formatStatValue(value: number, displayMode: 'hours' | 'money'): string {
  if (displayMode === 'money') return `${value.toFixed(2)} €`;
  return `${value.toFixed(2)} h`;
}

export function buildWeeklyChartData(
  filteredEntries: WorkEntryWithDate[],
  jobs: string[],
  displayMode: 'hours' | 'money',
  jobInfo: Record<string, JobInfo>,
): ChartRow[] {
  const weekData: Record<number, Record<string, number>> = {};

  filteredEntries.forEach((entry) => {
    let dayIndex = new Date(`${entry.date}T12:00:00`).getDay() - 1;
    if (dayIndex === -1) dayIndex = 6;
    if (!weekData[dayIndex]) weekData[dayIndex] = {};
    const value = getEntryValue(entry, displayMode, jobInfo);
    weekData[dayIndex][entry.job] = (weekData[dayIndex][entry.job] || 0) + value;
  });

  return DAY_LABELS.map((label, index) => {
    const row: ChartRow = { label };
    jobs.forEach((job) => {
      row[job] = weekData[index]?.[job] || 0;
    });
    return row;
  });
}

export function buildMonthlyChartData(
  filteredEntries: WorkEntryWithDate[],
  jobs: string[],
  displayMode: 'hours' | 'money',
  jobInfo: Record<string, JobInfo>,
): ChartRow[] {
  const monthData: Record<number, Record<string, number>> = {};

  filteredEntries.forEach((entry) => {
    const weekNum = getWeek(new Date(`${entry.date}T12:00:00`));
    if (!monthData[weekNum]) monthData[weekNum] = {};
    const value = getEntryValue(entry, displayMode, jobInfo);
    monthData[weekNum][entry.job] = (monthData[weekNum][entry.job] || 0) + value;
  });

  return Object.keys(monthData)
    .map(Number)
    .sort((a, b) => a - b)
    .map((weekNum) => {
      const row: ChartRow = { label: `S${weekNum}` };
      jobs.forEach((job) => {
        row[job] = monthData[weekNum]?.[job] || 0;
      });
      return row;
    });
}

export function buildPieChartData(
  filteredEntries: WorkEntryWithDate[],
  jobs: string[],
  displayMode: 'hours' | 'money',
  jobInfo: Record<string, JobInfo>,
) {
  const totals: Record<string, number> = {};
  filteredEntries.forEach((entry) => {
    totals[entry.job] = (totals[entry.job] || 0) + getEntryValue(entry, displayMode, jobInfo);
  });

  return jobs
    .map((job) => ({
      name: job,
      value: totals[job] || 0,
      color: jobInfo[job]?.color || '#ccc',
    }))
    .filter((item) => item.value > 0);
}

export function chartHasData(data: ChartRow[], jobs: string[]): boolean {
  return data.some((row) => jobs.some((job) => Number(row[job]) > 0));
}

export function sortEntriesByDateDesc(entries: WorkEntryWithDate[]): WorkEntryWithDate[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}
