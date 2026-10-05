/**
 * Official rules. They are the same for everyone and cannot be edited in the
 * app, so nobody reaches a high level or rank by changing the numbers.
 *
 * The same numbers are enforced on the server in supabase/limits.sql.
 * Change both together.
 */

export const RULES = {
	/** XP per action, and how much of it counts per day. */
	diary: { xp: 5, perDay: 3 },
	tx: { xp: 3, perDay: 3 },
	/** One workout a day counts, and only if it lasted this long. */
	workout: { xp: 30, perDay: 1, minMinutes: 20 },
	reading: { pagesPerXp: 5, maxXpPerDay: 20 },
	task: { xp: 10, perDay: 3 },
	post: { xp: 25, perDay: 2 },
	/** Bonus for finishing this many daily missions. */
	quest: { bonus: 20, min: 3, readPages: 10 },
	goals: { maxActive: 8, maxXpPerGoal: 100, maxXpPerMonth: 300 },
	/** Most XP a person can possibly earn in a day from activity: 15+9+30+20+30+50+20. */
	maxDaily: 174,
	/** Monthly XP needed for Prata, Ouro, Platina and Diamante. */
	tiers: [500, 1200, 2200, 3400],
	level: { divisor: 250, max: 50 },
	/** Lifetime XP from achievements counts for the level only, never for the monthly rank. */
	achievementsInRank: false,
} as const

/** Posts per hour, comments per hour, and so on: enforced by the database. */
export const LIMITS_TEXT = [
	'Até 10 publicações por hora e 30 por dia',
	'Até 40 comentários por hora',
	'Até 10 fotos por dia',
	'Até 60 novos seguidos por hora e 500 no total',
	'Nome de usuário só pode mudar a cada 14 dias',
]
