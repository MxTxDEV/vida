'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import DraggableWidgetGrid from '@/components/ui/draggable-widget-grid'
import { Bar, HEAT, Ready, brl, heatLevel, num, TONE_TEXT } from './bits'
import { Icon, LevelRing, RankBadge } from './badges'
import {
	addDays,
	fmtShort,
	inRange,
	lastDays,
	monthEnd,
	monthStart,
	nowTime,
	today,
	weekStart,
	type Range,
} from '@/lib/dates'
import {
	diaryStreak,
	goalProgress,
	levelInfo,
	METRICS,
	QUEST_MIN,
	questsOn,
	rankFor,
	seasonRange,
	xpBreakdown,
} from '@/lib/game'
import { RULES } from '@/lib/rules'
import { addItem, mutate, useApp } from '@/lib/store'
import { AREAS, type AppState, type Area } from '@/lib/types'
import { WIDGETS } from '@/lib/widgets'

function Tile({
	title,
	href,
	meta,
	children,
}: {
	title: string
	href: string
	meta?: ReactNode
	children: ReactNode
}) {
	return (
		<section className="@container flex h-full flex-col gap-3 p-3 sm:p-4">
			<header className="flex items-center justify-between gap-2 leading-none">
				<h3 className="px-label truncate !text-[11px]">{title}</h3>
				<Link href={href} className="shrink-0 text-[13px] text-muted-foreground hover:text-primary">
					{meta ?? '▶'}
				</Link>
			</header>
			<div className="flex min-h-0 flex-1 flex-col">{children}</div>
		</section>
	)
}

const Big = ({ children, unit }: { children: ReactNode; unit?: string }) => (
	<p className="text-[32px] leading-none tabular-nums">
		{children}
		{unit && <span className="text-[14px] text-muted-foreground">{' '}{unit}</span>}
	</p>
)

const Line = ({ label, value }: { label: ReactNode; value: ReactNode }) => (
	<div className="flex items-center gap-2 text-[14px]">
		<span className="min-w-0 truncate">{label}</span>
		<span className="ml-auto text-muted-foreground tabular-nums">{value}</span>
	</div>
)

function activityByDay(s: AppState) {
	const m = new Map<string, number>()
	const bump = (d: string) => d && m.set(d, (m.get(d) ?? 0) + 1)
	s.logs.forEach((x) => bump(x.date))
	s.workouts.forEach((x) => bump(x.date))
	s.readings.forEach((x) => bump(x.date))
	s.txs.forEach((x) => bump(x.date))
	s.tasks.forEach((x) => x.done && bump(x.doneAt))
	s.posts.forEach((x) => x.status === 'Postado' && bump(x.date))
	return m
}

function Widgets({ s, kind }: { s: AppState; kind: string }) {
	const now = today()
	const week: Range = { from: weekStart(now), to: addDays(weekStart(now), 6) }
	const month: Range = { from: monthStart(now), to: monthEnd(now) }

	switch (kind) {
		case 'rank': {
			const xp = xpBreakdown(s, seasonRange(now)).total
			const r = rankFor(xp)
			const left = Math.max(0, Math.round((new Date(month.to).getTime() - new Date(now).getTime()) / 86400000))
			return (
				<Tile title="Ranking do mês" href="/metas" meta="temporada ▶">
					<div className="flex items-center gap-4">
						<RankBadge index={r.index} size={4} />
						<div className="min-w-0">
							<p className="font-display text-[20px] font-semibold">{r.rank.label}</p>
							<p className="mt-1 text-[26px] leading-none tabular-nums">{num(xp)} XP</p>
						</div>
					</div>
					<div className="mt-auto space-y-1.5">
						<Bar pct={r.pct} tone="warn" />
						<Line
							label={r.next ? `Faltam ${num(r.next.at - xp)} XP p/ ${r.next.rank.label}` : 'Rank máximo!'}
							value={`${left}d p/ virar`}
						/>
					</div>
				</Tile>
			)
		}
		case 'nivel': {
			const lv = levelInfo(xpBreakdown(s).total)
			return (
				<Tile title="Nível" href="/metas">
					<div className="flex items-end gap-3">
						<LevelRing level={lv.level} pct={lv.pct} size={68} />
						<div className="min-w-0">
							<p className="truncate text-[15px]">{lv.title}</p>
						</div>
					</div>
					<div className="mt-auto space-y-1">
						<Bar pct={lv.pct} tone="blue" />
						<p className="text-[13px] text-muted-foreground tabular-nums">{lv.maxed ? 'Nível máximo' : `${lv.into}/${lv.span} XP`}</p>
					</div>
				</Tile>
			)
		}
		case 'streak': {
			const st = diaryStreak(s, now)
			return (
				<Tile title="Sequência" href="/diario">
					<div className="flex items-center gap-3 text-px-red">
						<Icon name="fogo" size={36} />
						<span className="text-[40px] leading-none text-foreground tabular-nums">{st.current}</span>
					</div>
					<p className="mt-auto text-[13px] text-muted-foreground">
						dias seguidos · melhor {st.best}
					</p>
				</Tile>
			)
		}
		case 'missoes': {
			const q = questsOn(s, now)
			const done = q.filter((x) => x.done).length
			return (
				<Tile title="Missões do dia" href="/metas" meta={`${done}/${q.length}`}>
					<ul className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-1.5">
						{q.map((x) => (
							<li key={x.id} className="flex items-center gap-2 text-[14px]">
								<span className={`inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-border ${x.done ? 'bg-px-green text-background' : ''}`}>
									{x.done && <Icon name="check" size={12} />}
								</span>
								<span className={`truncate ${x.done ? 'text-muted-foreground line-through' : ''}`}>{x.label}</span>
							</li>
						))}
					</ul>
					<p className={`text-[13px] ${done >= QUEST_MIN ? 'text-px-green' : 'text-muted-foreground'}`}>
						{done >= QUEST_MIN ? `★ Bônus de +${RULES.quest.bonus} XP garantido!` : `Faça ${QUEST_MIN} para ganhar +${RULES.quest.bonus} XP`}
					</p>
				</Tile>
			)
		}
		case 'dias': {
			const by = activityByDay(s)
			const days = lastDays(30, now)
			const active = days.filter((d) => by.get(d)).length
			const last = [...s.logs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0]
			return (
				<Tile title="Últimos 30 dias" href="/diario">
					<Big unit="dias ativos">{active}/30</Big>
					<div className="mt-auto space-y-2">
						<div
							role="img"
							aria-label={`${active} de 30 dias com atividade registrada.`}
							className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]">
							{days.map((d) => (
								<span
									key={d}
									title={`${fmtShort(d)} · ${by.get(d) ?? 0} registros`}
									className={`h-3.5 rounded-[3px] ${d === now ? 'outline-2 outline-foreground' : ''} ${HEAT[heatLevel(by.get(d) ?? 0)]}`}
								/>
							))}
						</div>
						<p className="truncate text-[13px] text-muted-foreground">
							{last ? `${fmtShort(last.date)} ${last.time} · ${last.text}` : 'Nenhuma anotação ainda.'}
						</p>
					</div>
				</Tile>
			)
		}
		case 'metas': {
			const goals = s.goals.filter((g) => g.active).slice(0, 7)
			return (
				<Tile title="Metas" href="/metas">
					{goals.length === 0 && <p className="text-[14px] text-muted-foreground">Nenhuma meta ativa.</p>}
					<ul className="flex flex-1 flex-col justify-between gap-2">
						{goals.map((g) => {
							const p = goalProgress(g, s, now)
							const over = g.dir === 'max' && !p.met
							return (
								<li key={g.id} className="space-y-1">
									<Line label={g.title} value={METRICS[g.metric].money ? brl(p.value) : `${num(p.value)}/${num(g.target)}`} />
									<Bar
										pct={g.dir === 'max' ? (g.target ? p.value / g.target : 0) : p.pct}
										tone={over ? 'err' : p.met ? 'ok' : g.dir === 'max' && p.value / g.target > 0.8 ? 'warn' : 'blue'}
									/>
								</li>
							)
						})}
					</ul>
				</Tile>
			)
		}
		case 'financas': {
			const inc = s.txs.filter((t) => t.type === 'receita' && inRange(t.date, month)).reduce((n, t) => n + t.amount, 0)
			const out = s.txs.filter((t) => t.type === 'gasto' && inRange(t.date, month)).reduce((n, t) => n + t.amount, 0)
			const budget = s.goals.find((g) => g.active && g.metric === 'expenses')
			return (
				<Tile title="Finanças do mês" href="/financas">
					<p className={`text-[32px] leading-none tabular-nums ${inc - out < 0 ? TONE_TEXT.err : ''}`}>{brl(inc - out)}</p>
					<div className="mt-auto space-y-1.5">
						<Line label="Receitas" value={brl(inc)} />
						<Line label="Gastos" value={brl(out)} />
						{budget && <Bar pct={out / budget.target} tone={out > budget.target ? 'err' : out / budget.target > 0.8 ? 'warn' : 'blue'} />}
					</div>
				</Tile>
			)
		}
		case 'academia': {
			const n = s.workouts.filter((w) => inRange(w.date, week)).length
			const goal = s.goals.find((g) => g.active && g.metric === 'workouts')
			return (
				<Tile title="Academia" href="/academia">
					<Big unit={goal ? `/ ${goal.target}` : 'na semana'}>{n}</Big>
					<div className="mt-auto flex gap-[3px]">
						{Array.from({ length: 7 }, (_, i) => addDays(week.from, i)).map((d) => (
							<span key={d} title={fmtShort(d)} className={`h-5 flex-1 rounded-[3px] ${s.workouts.some((w) => w.date === d) ? 'bg-px-blue' : 'bg-foreground/10'}`} />
						))}
					</div>
				</Tile>
			)
		}
		case 'leitura': {
			const pages = s.readings.filter((r) => inRange(r.date, week)).reduce((n, r) => n + r.pages, 0)
			const book = s.books.find((b) => b.status === 'Lendo')
			return (
				<Tile title="Leitura" href="/leitura">
					<Big unit="págs">{num(pages)}</Big>
					<p className="mt-auto truncate text-[13px] text-muted-foreground">{book ? `Lendo: ${book.title}` : 'esta semana'}</p>
				</Tile>
			)
		}
		case 'projetos': {
			const done = s.tasks.filter((t) => t.done && t.doneAt && inRange(t.doneAt, week)).length
			const active = s.projects.filter((p) => p.status === 'Ativo').length
			return (
				<Tile title="Projetos" href="/projetos">
					<Big unit="tarefas">{done}</Big>
					<p className="mt-auto text-[13px] text-muted-foreground">{active} ativo{active === 1 ? '' : 's'}</p>
				</Tile>
			)
		}
		case 'conteudo': {
			const posted = s.posts.filter((p) => p.status === 'Postado' && inRange(p.date, week)).length
			const ideas = s.posts.filter((p) => p.status === 'Ideia').length
			return (
				<Tile title="Conteúdo" href="/conteudo">
					<Big unit="posts">{posted}</Big>
					<p className="mt-auto text-[13px] text-muted-foreground">{ideas} ideia{ideas === 1 ? '' : 's'} na fila</p>
				</Tile>
			)
		}
		case 'premios': {
			const rewards = s.settlements.filter((x) => x.result === 'won' && !x.resolved)
			const penalties = s.settlements.filter((x) => x.result === 'lost' && !x.resolved)
			const rows = [...penalties.map((x) => ({ x, tag: '⚠' })), ...rewards.map((x) => ({ x, tag: '★' }))].slice(0, 3)
			return (
				<Tile title="Prêmios e penalidades" href="/metas">
					<div className="flex gap-6">
						<Big unit="prêmios">{rewards.length}</Big>
						<Big unit="a pagar">{penalties.length}</Big>
					</div>
					<ul className="mt-auto space-y-1">
						{rows.map(({ x, tag }) => (
							<li key={x.id} className="truncate text-[14px]">
								<span className={tag === '★' ? 'text-px-yellow' : 'text-px-red'}>{tag}</span> {x.text || x.goalTitle}
							</li>
						))}
						{rows.length === 0 && <li className="text-[14px] text-muted-foreground">Cumpra metas para ganhar prêmios.</li>}
					</ul>
				</Tile>
			)
		}
	}
	return null
}

function QuickLog() {
	const [text, setText] = useState('')
	const [area, setArea] = useState<Area>('geral')
	const submit = () => {
		const t = text.trim()
		if (!t) return
		addItem('logs', { date: today(), time: nowTime(), area, text: t })
		setText('')
	}
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				submit()
			}}
			className="mb-3 flex flex-wrap gap-2">
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="O que você fez agora? (Enter para anotar)"
				aria-label="O que você fez agora"
				className="px-input h-11 min-w-[220px] flex-1 text-[16px]"
			/>
			<select value={area} onChange={(e) => setArea(e.target.value as Area)} aria-label="Área" className="px-input h-11">
				{AREAS.map((a) => (
					<option key={a.value} value={a.value}>
						{a.label}
					</option>
				))}
			</select>
			<button type="submit" className="px-btn-primary h-11">
				Anotar
			</button>
		</form>
	)
}

/** One-tap buttons for the things you log most. */
function QuickActions({ s }: { s: AppState }) {
	const ask = (msg: string, def = '') => window.prompt(msg, def)
	const book = s.books.find((b) => b.status === 'Lendo')
	return (
		<div className="mb-4 flex flex-wrap gap-2">
			<button
				className="px-btn"
				onClick={() => {
					const m = Number(ask('Quantos minutos de treino?', '60'))
					if (m > 0) addItem('workouts', { date: today(), group: s.settings.workoutGroups[0] ?? 'Treino', minutes: m, notes: '', weight: 0 })
				}}>
				<Icon name="academia" /> Treinei
			</button>
			<button
				className="px-btn"
				onClick={() => {
					if (!book) return window.alert('Marque um livro como "Lendo" na aba Leitura primeiro.')
					const p = Number(ask(`Páginas lidas de "${book.title}"?`, '10'))
					if (p > 0) addItem('readings', { date: today(), bookId: book.id, pages: p })
				}}>
				<Icon name="leitura" /> Li páginas
			</button>
			<button
				className="px-btn"
				onClick={() => {
					const v = Number((ask('Valor do gasto (R$)?') ?? '').replace(',', '.'))
					if (v > 0) addItem('txs', { date: today(), type: 'gasto', category: s.settings.financeCategories[0] ?? 'Outros', desc: ask('Descrição?') ?? '', amount: v })
				}}>
				<Icon name="financas" /> Gasto
			</button>
			<button
				className="px-btn"
				onClick={() => {
					const t = ask('Título do conteúdo postado?')
					if (t?.trim()) addItem('posts', { date: today(), platform: s.settings.platforms[0] ?? 'Outro', title: t.trim(), status: 'Postado' })
				}}>
				<Icon name="conteudo" /> Postei
			</button>
		</div>
	)
}

function Board() {
	const s = useApp()
	const [editable, setEditable] = useState(false)
	const hidden = s.settings.hiddenWidgets
	// The grid keeps its own order after mount; start from the saved one.
	const [order] = useState(() => s.layout)
	const items = WIDGETS.filter((w) => !hidden.includes(w.id)).sort((a, b) => {
		const rank = (id: string) => (order.indexOf(id) < 0 ? 999 : order.indexOf(id))
		return order.length ? rank(a.id) - rank(b.id) : 0
	})

	return (
		<>
			<QuickLog />
			<QuickActions s={s} />
			<div className="mb-4 flex items-center justify-between gap-3">
				<p className="text-[14px] text-muted-foreground">
					{editable ? 'Arraste os blocos para reorganizar. Alt + setas no teclado.' : 'Clique no ▶ de um bloco para abrir a seção.'}
				</p>
				<button className={editable ? 'px-btn-primary' : 'px-btn'} onClick={() => setEditable((v) => !v)}>
					{editable ? 'Concluir' : 'Reorganizar'}
				</button>
			</div>
			<DraggableWidgetGrid
				key={hidden.join(',')}
				items={items}
				editable={editable}
				radius={20}
				gap={16}
				onChange={(next) => mutate((st) => ({ ...st, layout: next.map((i) => i.id) }))}
				renderItem={(item) => <Widgets s={s} kind={item.id} />}
			/>
		</>
	)
}

export default function Dashboard() {
	return (
		<Ready>
			<Board />
		</Ready>
	)
}
