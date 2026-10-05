import { today } from './dates'
import { ACHIEVEMENTS, diaryStreak, levelInfo, rankFor, seasonRange, xpBreakdown } from './game'
import { getSupabase } from './supabase'
import type { AppState } from './types'

let lastSent = ''

/** The only numbers that leave the private data: level, monthly rank, streak. */
export async function publishStats(userId: string, s: AppState) {
	const sb = getSupabase()
	if (!sb) return
	const monthXp = xpBreakdown(s, seasonRange()).total
	const lifetime = xpBreakdown(s).total
	const row = {
		user_id: userId,
		month: today().slice(0, 7),
		month_xp: monthXp,
		lifetime_xp: lifetime,
		level: levelInfo(lifetime).level,
		rank_index: rankFor(monthXp).index,
		streak: diaryStreak(s).current,
		achievements: ACHIEVEMENTS.filter((a) => s.unlocked[a.id]).length,
	}
	const key = JSON.stringify(row)
	if (key === lastSent) return
	const { error } = await sb.from('stats').upsert({ ...row, updated_at: new Date().toISOString() })
	if (!error) lastSent = key
}

export const resetStatsCache = () => {
	lastSent = ''
}
