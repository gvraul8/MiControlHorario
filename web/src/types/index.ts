export interface WorkEntry {
  job: string;
  hours: number;
}

export interface JobData {
  rate: number;
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface UserDocument {
  profile: UserProfile;
  jobs: Record<string, JobData>;
  entries: Record<string, WorkEntry[]>;
}

export interface JobInfo extends JobData {
  color: string;
}

export interface WorkEntryWithDate extends WorkEntry {
  date: string;
  id: string;
}

export type StatsTab = 'weekly' | 'monthly' | 'daily' | 'byJob';
export type DisplayMode = 'hours' | 'money';
export type FilterMode = 'week' | 'month' | 'range';

export const BRAND_NAVY = '#1a3d52';
export const BRAND_GREEN = '#8fbf5a';

/** Paleta para varios trabajos (navy/verde del logo + variaciones) */
export const JOB_COLORS = [
  BRAND_NAVY,
  BRAND_GREEN,
  '#2d5a73',
  '#6fa048',
  '#4a8066',
  '#a8d080',
];

export function createEmptyUserDocument(email: string, name = ''): UserDocument {
  return {
    profile: { name, email },
    jobs: {},
    entries: {},
  };
}
