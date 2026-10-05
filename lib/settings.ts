import type { Settings } from './types'

export const THEMES: { id: Settings['theme']; label: string }[] = [
	{ id: 'escuro', label: 'Escuro' },
	{ id: 'claro', label: 'Claro' },
	{ id: 'aurora', label: 'Aurora' },
]

export const defaultSettings = (): Settings => ({
	theme: 'escuro',
	financeCategories: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Estudos', 'Assinaturas', 'Compras', 'Investimento', 'Salário', 'Freelas', 'Outros'],
	workoutGroups: ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Cardio', 'Full body'],
	platforms: ['Instagram', 'TikTok', 'YouTube', 'X / Twitter', 'LinkedIn', 'Blog', 'Outro'],
	hiddenWidgets: [],
})

const strings = (v: unknown, fallback: string[]) =>
	Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : fallback

/** Reads saved settings, filling anything missing with the defaults. */
export function mergeSettings(raw: unknown): Settings {
	const d = defaultSettings()
	if (!raw || typeof raw !== 'object') return d
	const r = raw as Partial<Settings>
	return {
		theme: THEMES.some((t) => t.id === r.theme) ? (r.theme as Settings['theme']) : d.theme,
		financeCategories: strings(r.financeCategories, d.financeCategories),
		workoutGroups: strings(r.workoutGroups, d.workoutGroups),
		platforms: strings(r.platforms, d.platforms),
		hiddenWidgets: strings(r.hiddenWidgets, []),
	}
}
