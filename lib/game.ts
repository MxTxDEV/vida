import {
	addDays,
	addMonths,
	inRange,
	monthEnd,
	monthStart,
	today,
	weekStart,
	type Range,
} from './dates'
import type { AppState, Area, Goal, MetricId, Settlement } from './types'

/* ------------------------------------------------------------------ *
 * Metrics
 * ------------------------------------------------------------------ */

export const METRICS: Record<
	MetricId,
	{ label: string; unit: string; money?: boolean; dir: 'min' | 'max' }
> = {
	diary_days: { label: 'Dias com diário', unit: 'dias', dir: 'min' },
	workouts: { label: 'Treinos', unit: 'treinos', dir: 'min' },
	pages: { label: 'Páginas lidas', unit: 'págs', dir: 'min' },
	tasks_done: { label: 'Tarefas concluídas', unit: 'tarefas', dir: 'min' },
	posts: { label: 'Conteúdos postados', unit: 'posts', dir: 'min' },
	expenses: { label: 'Gastos', unit: 'R$', money: true, dir: 'max' },
	balance: { label: 'Saldo (receitas − gastos)', unit: 'R$', money: true, dir: 'min' },
}

export function metricValue(id: MetricId, s: AppState, r: Range): number {
	switch (id) {
		case 'diary_days':
			return new Set(s.logs.filter((l) => inRange(l.date, r)).map((l) => l.date))
				.size
		case 'workouts':
			return s.workouts.filter((w) => inRange(w.date, r)).length
		case 'pages':
			return s.readings
				.filter((x) => inRange(x.date, r))
				.reduce((n, x) => n + x.pages, 0)
		case 'tasks_done':
			return s.tasks.filter((t) => t.done && t.doneAt && inRange(t.doneAt, r))
				.length
		case 'posts':
			return s.posts.filter((p) => p.status === 'Postado' && inRange(p.date, r))
				.length
		case 'expenses':
			return s.txs
				.filter((t) => t.type === 'gasto' && inRange(t.date, r))
				.reduce((n, t) => n + t.amount, 0)
		case 'balance':
			return s.txs
				.filter((t) => inRange(t.date, r))
				.reduce((n, t) => n + (t.type === 'receita' ? t.amount : -t.amount), 0)
	}
}

/* ------------------------------------------------------------------ *
 * Goals: periods, progress, settlement
 * ------------------------------------------------------------------ */

export const periodStart = (p: Goal['period'], d: string) =>
	p === 'week' ? weekStart(d) : monthStart(d)

const nextStart = (p: Goal['period'], start: string) =>
	p === 'week' ? addDays(start, 7) : addMonths(start, 1)

export const periodRange = (p: Goal['period'], d: string): Range => {
	const from = periodStart(p, d)
	return { from, to: p === 'week' ? addDays(from, 6) : monthEnd(from) }
}

export const meets = (g: Goal, value: number) =>
	g.dir === 'min' ? value >= g.target : value <= g.target

export function goalProgress(g: Goal, s: AppState, now = today()) {
	const range = periodRange(g.period, now)
	const value = metricValue(g.metric, s, range)
	const settled = s.settlements.find((x) => x.id === `${g.id}:${range.from}`)
	return {
		range,
		value,
		met: meets(g, value),
		pct: g.target > 0 ? Math.min(1, value / g.target) : 0,
		settled,
		/** A `min` goal that is already reached can be claimed early. */
		claimable: g.dir === 'min' && meets(g, value) && !settled,
		daysLeft: Math.max(
			0,
			Math.round(
				(new Date(range.to).getTime() - new Date(now).getTime()) / 86400000,
			),
		),
	}
}

const AREA_LABEL: Record<Area, string> = {
	geral: 'Geral',
	financas: 'Finanças',
	saude: 'Saúde',
	leitura: 'Leitura',
	projetos: 'Projetos',
	conteudo: 'Conteúdo',
}
export const areaLabel = (a: Area) => AREA_LABEL[a]

const settlementFor = (
	g: Goal,
	start: string,
	won: boolean,
	date: string,
): Settlement => ({
	id: `${g.id}:${start}`,
	goalId: g.id,
	goalTitle: g.title,
	date,
	result: won ? 'won' : 'lost',
	text: won ? g.reward : g.penalty,
	xp: won ? g.xpWin : -g.xpLose,
	resolved: false,
})

/** Closes every finished period that has not been settled yet. */
function settlePast(s: AppState, now: string): AppState {
	const add: Settlement[] = []
	for (const g of s.goals) {
		if (!g.active) continue
		const first = periodStart(g.period, g.createdAt)
		// A period that began before the goal existed is not held against it.
		let start = g.createdAt === first ? first : nextStart(g.period, first)
		const current = periodStart(g.period, now)
		for (let i = 0; start < current && i < 120; i++) {
			const id = `${g.id}:${start}`
			if (!s.settlements.some((x) => x.id === id)) {
				const r = periodRange(g.period, start)
				add.push(settlementFor(g, start, meets(g, metricValue(g.metric, s, r)), r.to))
			}
			start = nextStart(g.period, start)
		}
	}
	return add.length ? { ...s, settlements: [...s.settlements, ...add] } : s
}

export function claimGoal(s: AppState, goalId: string, now = today()): AppState {
	const g = s.goals.find((x) => x.id === goalId)
	if (!g) return s
	const p = goalProgress(g, s, now)
	if (!p.claimable) return s
	return {
		...s,
		settlements: [...s.settlements, settlementFor(g, p.range.from, true, now)],
	}
}

/* ------------------------------------------------------------------ *
 * Achievements
 * ------------------------------------------------------------------ */

function streaks(dates: string[], now: string) {
	const days = [...new Set(dates)].sort()
	let best = 0
	let run = 0
	let prev = ''
	for (const d of days) {
		run = prev && addDays(prev, 1) === d ? run + 1 : 1
		best = Math.max(best, run)
		prev = d
	}
	// The current streak survives until the end of today.
	let current = 0
	const set = new Set(days)
	let d = set.has(now) ? now : addDays(now, -1)
	while (set.has(d)) {
		current++
		d = addDays(d, -1)
	}
	return { best, current }
}

export const diaryStreak = (s: AppState, now = today()) =>
	streaks(s.logs.map((l) => l.date), now)

export interface Achievement {
	id: string
	icon: string
	title: string
	desc: string
	xp: number
	check: (s: AppState) => boolean
}

const totalPages = (s: AppState) => s.readings.reduce((n, r) => n + r.pages, 0)
const postedCount = (s: AppState) =>
	s.posts.filter((p) => p.status === 'Postado').length
const doneTasks = (s: AppState) => s.tasks.filter((t) => t.done).length
const wonCount = (s: AppState) =>
	s.settlements.filter((x) => x.result === 'won').length
const savings = (s: AppState) =>
	s.txs.reduce((n, t) => n + (t.type === 'receita' ? t.amount : -t.amount), 0)

export const ACHIEVEMENTS: Achievement[] = [
	{ id: 'first_log', icon: '📝', title: 'Primeira anotação', desc: 'Registre algo no diário.', xp: 20, check: (s) => s.logs.length >= 1 },
	{ id: 'streak7', icon: '🔥', title: 'Semana em chamas', desc: '7 dias seguidos anotando o diário.', xp: 100, check: (s) => diaryStreak(s).best >= 7 },
	{ id: 'days30', icon: '📅', title: 'Mês documentado', desc: '30 dias diferentes no diário.', xp: 250, check: (s) => new Set(s.logs.map((l) => l.date)).size >= 30 },
	{ id: 'first_workout', icon: '💪', title: 'Primeiro treino', desc: 'Registre um treino.', xp: 30, check: (s) => s.workouts.length >= 1 },
	{ id: 'workouts12', icon: '🏋️', title: 'Rato de academia', desc: '12 treinos registrados.', xp: 150, check: (s) => s.workouts.length >= 12 },
	{ id: 'workouts50', icon: '🦍', title: 'Monstro', desc: '50 treinos registrados.', xp: 500, check: (s) => s.workouts.length >= 50 },
	{ id: 'pages300', icon: '📖', title: 'Leitor', desc: 'Leia 300 páginas no total.', xp: 80, check: (s) => totalPages(s) >= 300 },
	{ id: 'book_done', icon: '📚', title: 'Livro finalizado', desc: 'Termine um livro.', xp: 150, check: (s) => s.books.some((b) => b.status === 'Terminado') },
	{ id: 'pages2000', icon: '🧠', title: 'Devorador', desc: 'Leia 2.000 páginas no total.', xp: 400, check: (s) => totalPages(s) >= 2000 },
	{ id: 'tasks10', icon: '✅', title: 'Mão na massa', desc: 'Conclua 10 tarefas de projetos.', xp: 100, check: (s) => doneTasks(s) >= 10 },
	{ id: 'project_done', icon: '🚀', title: 'Projeto entregue', desc: 'Conclua um projeto.', xp: 300, check: (s) => s.projects.some((p) => p.status === 'Concluído') },
	{ id: 'first_post', icon: '📣', title: 'No ar', desc: 'Poste seu primeiro conteúdo.', xp: 50, check: (s) => postedCount(s) >= 1 },
	{ id: 'posts10', icon: '🎬', title: 'Criador', desc: '10 conteúdos postados.', xp: 250, check: (s) => postedCount(s) >= 10 },
	{ id: 'posts30', icon: '🌟', title: 'Máquina de conteúdo', desc: '30 conteúdos postados.', xp: 600, check: (s) => postedCount(s) >= 30 },
	{ id: 'tx30', icon: '🧾', title: 'Contas em dia', desc: '30 lançamentos financeiros.', xp: 100, check: (s) => s.txs.length >= 30 },
	{ id: 'saver1000', icon: '💰', title: 'Reserva de R$ 1.000', desc: 'Saldo acumulado de pelo menos R$ 1.000.', xp: 300, check: (s) => savings(s) >= 1000 },
	{ id: 'win1', icon: '🏆', title: 'Primeira conquista', desc: 'Ganhe sua primeira meta.', xp: 50, check: (s) => wonCount(s) >= 1 },
	{ id: 'win10', icon: '👑', title: 'Imparável', desc: 'Ganhe 10 metas.', xp: 400, check: (s) => wonCount(s) >= 10 },
]

/* ------------------------------------------------------------------ *
 * Daily missions
 * ------------------------------------------------------------------ */

export const QUESTS = [
	{ id: 'diary', label: 'Anotar no diário' },
	{ id: 'body', label: 'Treinar' },
	{ id: 'read', label: 'Ler 10 páginas' },
	{ id: 'work', label: 'Concluir uma tarefa' },
	{ id: 'create', label: 'Postar conteúdo' },
	{ id: 'money', label: 'Lançar uma finança' },
] as const

/** Missions needed in one day to earn the daily bonus. */
export const QUEST_MIN = 3

function questDays(s: AppState) {
	const days = new Map<string, Set<string>>()
	const add = (d: string, q: string) => {
		if (!d) return
		let set = days.get(d)
		if (!set) days.set(d, (set = new Set()))
		set.add(q)
	}
	s.logs.forEach((x) => add(x.date, 'diary'))
	s.workouts.forEach((x) => add(x.date, 'body'))
	const pages = new Map<string, number>()
	s.readings.forEach((r) => pages.set(r.date, (pages.get(r.date) ?? 0) + r.pages))
	pages.forEach((n, d) => n >= 10 && add(d, 'read'))
	s.tasks.forEach((t) => t.done && add(t.doneAt, 'work'))
	s.posts.forEach((p) => p.status === 'Postado' && add(p.date, 'create'))
	s.txs.forEach((t) => add(t.date, 'money'))
	return days
}

export function questsOn(s: AppState, date = today()) {
	const done = questDays(s).get(date) ?? new Set<string>()
	return QUESTS.map((q) => ({ ...q, done: done.has(q.id) }))
}

/* ------------------------------------------------------------------ *
 * XP and levels
 * ------------------------------------------------------------------ */

function perDayCapped(dates: string[], cap: number) {
	const per = new Map<string, number>()
	for (const d of dates) per.set(d, (per.get(d) ?? 0) + 1)
	let n = 0
	for (const v of per.values()) n += Math.min(v, cap)
	return n
}

/**
 * XP earned, either for a whole lifetime (no range) or inside a range, such
 * as the current month. Everything is derived from dated records, so a month
 * resets by itself and lifetime XP never does.
 */
export function xpBreakdown(s: AppState, r?: Range) {
	const ok = (d: string) => !r || inRange(d, r)
	const x = s.settings.xp
	const pages = s.readings.filter((p) => ok(p.date)).reduce((n, p) => n + p.pages, 0)
	let questDaysDone = 0
	questDays(s).forEach((set, d) => {
		if (ok(d) && set.size >= QUEST_MIN) questDaysDone++
	})
	const rows = [
		{ label: 'Diário (até 3/dia)', xp: perDayCapped(s.logs.filter((l) => ok(l.date)).map((l) => l.date), 3) * x.diary },
		{ label: 'Lançamentos (até 3/dia)', xp: perDayCapped(s.txs.filter((t) => ok(t.date)).map((t) => t.date), 3) * x.tx },
		{ label: 'Treinos', xp: s.workouts.filter((w) => ok(w.date)).length * x.workout },
		{ label: 'Leitura', xp: x.pagesPerXp > 0 ? Math.floor(pages / x.pagesPerXp) : 0 },
		{ label: 'Tarefas concluídas', xp: s.tasks.filter((t) => t.done && ok(t.doneAt)).length * x.task },
		{ label: 'Conteúdos postados', xp: s.posts.filter((p) => p.status === 'Postado' && ok(p.date)).length * x.post },
		{ label: 'Bônus de missões do dia', xp: questDaysDone * x.quest },
		{ label: 'Metas (ganhos e perdas)', xp: s.settlements.filter((y) => ok(y.date)).reduce((n, y) => n + y.xp, 0) },
		{
			label: 'Conquistas',
			xp: ACHIEVEMENTS.filter((a) => s.unlocked[a.id] && ok(s.unlocked[a.id])).reduce((n, a) => n + a.xp, 0),
		},
	]
	return { rows, total: Math.max(0, rows.reduce((n, r2) => n + r2.xp, 0)) }
}

export const LEVEL_TITLES = [
	'Novato',
	'Aprendiz',
	'Aventureiro',
	'Veterano',
	'Mestre',
	'Campeão',
	'Lenda',
]

/** Lifetime level. It only ever goes up. */
export function levelInfo(xp: number) {
	const level = Math.floor(Math.sqrt(xp / 100)) + 1
	const floor = 100 * (level - 1) ** 2
	const ceil = 100 * level ** 2
	return {
		level,
		title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
		into: xp - floor,
		span: ceil - floor,
		pct: (xp - floor) / (ceil - floor),
	}
}

/* ------------------------------------------------------------------ *
 * Monthly ranking ("season"): resets every month
 * ------------------------------------------------------------------ */

export const RANKS = [
	{ id: 'bronze', label: 'Bronze' },
	{ id: 'prata', label: 'Prata' },
	{ id: 'ouro', label: 'Ouro' },
	{ id: 'platina', label: 'Platina' },
	{ id: 'diamante', label: 'Diamante' },
] as const

export function rankFor(xp: number, tiers: number[]) {
	const floors = [0, ...tiers]
	let index = 0
	floors.forEach((f, k) => {
		if (xp >= f) index = k
	})
	const nextAt = floors[index + 1]
	return {
		index,
		rank: RANKS[index],
		next: nextAt === undefined ? null : { rank: RANKS[index + 1], at: nextAt },
		pct: nextAt === undefined ? 1 : (xp - floors[index]) / (nextAt - floors[index]),
	}
}

export const seasonRange = (now = today()): Range => ({
	from: monthStart(now),
	to: monthEnd(now),
})

export function earliestDate(s: AppState): string | null {
	const dates = [
		...s.logs.map((x) => x.date),
		...s.txs.map((x) => x.date),
		...s.workouts.map((x) => x.date),
		...s.readings.map((x) => x.date),
		...s.posts.map((x) => x.date),
		...s.tasks.map((x) => x.doneAt),
		...s.settlements.map((x) => x.date),
		...Object.values(s.unlocked),
	].filter(Boolean)
	return dates.length ? dates.sort()[0] : null
}

/** Final XP and rank of every finished month, newest first. */
export function seasonHistory(s: AppState, now = today()) {
	const first = earliestDate(s)
	if (!first) return []
	const out: { month: string; xp: number; rank: ReturnType<typeof rankFor> }[] = []
	const current = monthStart(now)
	let m = monthStart(first)
	for (let i = 0; m < current && i < 60; i++) {
		const xp = xpBreakdown(s, { from: m, to: monthEnd(m) }).total
		out.push({ month: m, xp, rank: rankFor(xp, s.settings.tiers) })
		m = addMonths(m, 1)
	}
	return out.reverse()
}

/* ------------------------------------------------------------------ *
 * Sync: settle finished periods and unlock achievements
 * ------------------------------------------------------------------ */

export function syncGame(s: AppState, now = today()): AppState {
	let next = settlePast(s, now)
	const fresh = ACHIEVEMENTS.filter((a) => !next.unlocked[a.id] && a.check(next))
	if (fresh.length) {
		const unlocked = { ...next.unlocked }
		for (const a of fresh) unlocked[a.id] = now
		next = { ...next, unlocked }
	}
	return next
}

/* ------------------------------------------------------------------ *
 * Defaults
 * ------------------------------------------------------------------ */

export function defaultGoals(createdAt: string): Goal[] {
	const g = (
		id: string,
		title: string,
		area: Area,
		metric: MetricId,
		period: Goal['period'],
		target: number,
		reward: string,
		penalty: string,
		xpWin: number,
		xpLose: number,
	): Goal => ({
		id,
		title,
		area,
		metric,
		period,
		target,
		dir: METRICS[metric].dir,
		reward,
		penalty,
		xpWin,
		xpLose,
		active: true,
		createdAt,
	})
	return [
		g('g-treino', 'Treinar 4x na semana', 'saude', 'workouts', 'week', 4, 'Refeição livre, sem culpa', 'Treino extra de 40 min no domingo', 100, 50),
		g('g-leitura', 'Ler 100 páginas na semana', 'leitura', 'pages', 'week', 100, '1h de série ou jogo sem culpa', 'Um dia sem redes sociais', 80, 40),
		g('g-conteudo', 'Postar 3 conteúdos na semana', 'conteudo', 'posts', 'week', 3, 'Comprar algo pequeno (até R$ 30)', 'Gravar um conteúdo extra no fim de semana', 120, 60),
		g('g-projetos', 'Concluir 5 tarefas de projetos', 'projetos', 'tasks_done', 'week', 5, 'Um café ou saída especial', '1h extra de projeto no sábado', 100, 50),
		g('g-diario', 'Anotar o diário em 6 dias da semana', 'geral', 'diary_days', 'week', 6, '30 min de descanso livre', 'Escrever um resumo de 10 linhas da semana', 60, 30),
		g('g-gastos', 'Gastar no máximo R$ 2.000 no mês', 'financas', 'expenses', 'month', 2000, 'Presente de até R$ 50 para você', 'Uma semana sem gastos supérfluos', 150, 75),
		g('g-saldo', 'Sobrar pelo menos R$ 500 no mês', 'financas', 'balance', 'month', 500, 'Jantar fora para comemorar', 'Cancelar uma assinatura', 150, 75),
	]
}
