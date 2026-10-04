export type Area =
	| 'geral'
	| 'financas'
	| 'saude'
	| 'leitura'
	| 'projetos'
	| 'conteudo'

export const AREAS: { value: Area; label: string }[] = [
	{ value: 'geral', label: 'Geral' },
	{ value: 'financas', label: 'Finanças' },
	{ value: 'saude', label: 'Saúde' },
	{ value: 'leitura', label: 'Leitura' },
	{ value: 'projetos', label: 'Projetos' },
	{ value: 'conteudo', label: 'Conteúdo' },
]

export interface LogEntry {
	id: string
	date: string
	time: string
	area: Area
	text: string
}

export interface Tx {
	id: string
	date: string
	type: 'gasto' | 'receita'
	category: string
	desc: string
	amount: number
}

export interface Workout {
	id: string
	date: string
	group: string
	minutes: number
	notes: string
	weight: number
}

export interface Book {
	id: string
	title: string
	total: number
	status: 'Quero ler' | 'Lendo' | 'Terminado'
}

export interface Reading {
	id: string
	date: string
	bookId: string
	pages: number
}

export interface Project {
	id: string
	name: string
	status: 'Ideia' | 'Ativo' | 'Pausado' | 'Concluído'
	deadline: string
}

export interface Task {
	id: string
	projectId: string
	text: string
	done: boolean
	doneAt: string
}

export interface Post {
	id: string
	date: string
	platform: string
	title: string
	status: 'Ideia' | 'Produzindo' | 'Postado'
}

export type MetricId =
	| 'diary_days'
	| 'workouts'
	| 'pages'
	| 'tasks_done'
	| 'posts'
	| 'expenses'
	| 'balance'

export interface Goal {
	id: string
	title: string
	area: Area
	metric: MetricId
	period: 'week' | 'month'
	target: number
	/** `min`: reach at least the target. `max`: stay at or under it. */
	dir: 'min' | 'max'
	reward: string
	penalty: string
	xpWin: number
	xpLose: number
	active: boolean
	createdAt: string
}

/** A closed goal period: a reward earned or a penalty owed. */
export interface Settlement {
	/** `${goalId}:${period start}` */
	id: string
	goalId: string
	goalTitle: string
	date: string
	result: 'won' | 'lost'
	text: string
	xp: number
	/** Reward used, or penalty paid. */
	resolved: boolean
}

export interface AppState {
	ready: boolean
	logs: LogEntry[]
	txs: Tx[]
	workouts: Workout[]
	books: Book[]
	readings: Reading[]
	projects: Project[]
	tasks: Task[]
	posts: Post[]
	goals: Goal[]
	settlements: Settlement[]
	/** Achievement id to the date it was unlocked. */
	unlocked: Record<string, string>
	/** Dashboard widget order. */
	layout: string[]
}

export type CollKey =
	| 'logs'
	| 'txs'
	| 'workouts'
	| 'books'
	| 'readings'
	| 'projects'
	| 'tasks'
	| 'posts'
	| 'goals'
