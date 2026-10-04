import { addDays, addMonths, monthStart, today, weekStart } from './dates'

/** First day of each of the last `n` months, oldest first. */
export const lastMonths = (n: number, now = today()) =>
	Array.from({ length: n }, (_, i) => addMonths(monthStart(now), i - (n - 1)))

/** Monday of each of the last `n` weeks, oldest first. */
export const lastWeeks = (n: number, now = today()) =>
	Array.from({ length: n }, (_, i) => addDays(weekStart(now), (i - (n - 1)) * 7))

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
export const monthLabel = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1]
