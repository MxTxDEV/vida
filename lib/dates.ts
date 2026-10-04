export interface Range {
	from: string
	to: string
}

export const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) =>
	`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toISO(new Date())
export const nowTime = () => {
	const d = new Date()
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const parseISO = (s: string) => {
	const [y, m, d] = s.split('-').map(Number)
	return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
	const d = parseISO(s)
	d.setDate(d.getDate() + n)
	return toISO(d)
}
/** Monday of the week containing `s`. */
export const weekStart = (s: string) => addDays(s, -((parseISO(s).getDay() + 6) % 7))
export const monthStart = (s: string) => `${s.slice(0, 7)}-01`
export const addMonths = (s: string, n: number) => {
	const d = parseISO(monthStart(s))
	d.setMonth(d.getMonth() + n)
	return toISO(d)
}
export const monthEnd = (s: string) => addDays(addMonths(s, 1), -1)
export const inRange = (s: string, r: Range) => s >= r.from && s <= r.to
/** The last `n` days, oldest first, ending at `end`. */
export const lastDays = (n: number, end = today()) =>
	Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)))
export const fmtShort = (s: string) => {
	const [, m, d] = s.split('-')
	return `${d}/${m}`
}
export const fmtDay = (s: string) =>
	parseISO(s).toLocaleDateString('pt-BR', {
		weekday: 'short',
		day: '2-digit',
		month: '2-digit',
	})
export const uid = () =>
	Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
