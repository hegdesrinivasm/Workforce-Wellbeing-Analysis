/**
 * Generate consistent dummy/placeholder values based on email hash
 * This ensures the same email always gets the same values across all views
 */

export const generateConsistentValue = (email: string, seed: number, min: number, max: number): number => {
  let hash = 0;
  const str = email + seed.toString();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return min + (Math.abs(hash) % (max - min + 1));
};

export const getConsistentStressLevel = (email: string): 'low' | 'medium' | 'high' => {
  const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  const index = generateConsistentValue(email, 999, 0, 2);
  return levels[index];
};

export const getConsistentTrend = (email: string): 'up' | 'down' | 'stable' => {
  const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
  const index = generateConsistentValue(email, 888, 0, 2);
  return trends[index];
};

export const getConsistentLastActive = (email: string): string => {
  const times = ['Just now', '15 minutes ago', '1 hour ago', '2 hours ago'];
  const index = generateConsistentValue(email, 777, 0, 3);
  return times[index];
};

/**
 * Seed values for consistent generation across application
 * Using different seeds ensures different metrics have different values
 */
export const SEEDS = {
  TASK_COMPLETION: 1,
  LOGGED_HOURS: 2,
  WELLBEING_SCORE: 3,
  IS_EXHAUSTED: 4,
  MEETING_HOURS: 5,
  MEETING_COUNT: 6,
  MESSAGES_SENT: 7,
  MESSAGES_RECEIVED: 8,
  EARLY_STARTS: 9,
  LATE_EXITS: 10,
  LATE_STARTS: 11,
  EARLY_EXITS: 12,
};
