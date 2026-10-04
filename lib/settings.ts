import type { Settings } from './types'

export const THEMES: { id: Settings['theme']; label: string }[] = [
	{ id: 'noite', label: 'Noite' },
	{ id: 'gameboy', label: 'Game Boy' },
	{ id: 'arcade', label: 'Arcade' },
]

export const defaultSettings = (): Settings => ({
	theme: 'noite',
	financeCategories: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Estudos', 'Assinaturas', 'Compras', 'Investimento', 'Salário', 'Freelas', 'Outros'],
	workoutGroups: ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Cardio', 'Full body'],
	platforms: ['Instagram', 'TikTok', 'YouTube', 'X / Twitter', 'LinkedIn', 'Blog', 'Outro'],
	xp: { diary: 5, tx: 3, workout: 30, pagesPerXp: 10, task: 15, post: 40, quest: 25 },
	tiers: [400, 900, 1500, 2300],
	hiddenWidgets: [],
})

const strings = (v: unknown, fallback: string[]) =>
	Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : fallback

/** Reads saved settings, filling anything missing with the defaults. */
export function mergeSettings(raw: unknown): Settings {
	const d = defaultSettings()
	if (!raw || typeof raw !== 'object') return d
	const r = raw as Partial<Settings>
	const xp = { ...d.xp }
	if (r.xp && typeof r.xp === 'object')
		for (const k of Object.keys(xp) as (keyof Settings['xp'])[])
			if (typeof r.xp[k] === 'number' && r.xp[k] >= 0) xp[k] = r.xp[k]
	return {
		theme: THEMES.some((t) => t.id === r.theme) ? (r.theme as Settings['theme']) : d.theme,
		financeCategories: strings(r.financeCategories, d.financeCategories),
		workoutGroups: strings(r.workoutGroups, d.workoutGroups),
		platforms: strings(r.platforms, d.platforms),
		xp,
		tiers:
			Array.isArray(r.tiers) && r.tiers.length === 4 && r.tiers.every((n) => typeof n === 'number')
				? r.tiers
				: d.tiers,
		hiddenWidgets: strings(r.hiddenWidgets, []),
	}
}
