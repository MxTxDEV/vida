'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import DraggableWidgetGrid, {
	type WidgetItem,
} from '@/components/ui/draggable-widget-grid'
import { Bar, HEAT, Ready, brl, button, buttonPrimary, field, heatLevel, num } from './bits'
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
import { goalProgress, levelInfo, METRICS, diaryStreak, xpBreakdown } from '@/lib/game'
import { addItem, mutate, useApp } from '@/lib/store'
import { AREAS, type AppState, type Area } from '@/lib/types'

const DEFAULT: WidgetItem[] = [
	{ id: 'nivel', size: 'wide', label: 'Nível e XP' },
	{ id: 'dias', size: 'wide', label: 'Últimos 30 dias' },
	{ id: 'metas', size: 'lg', label: 'Metas do período' },
	{ id: 'financas', size: 'wide', label: 'Finanças do mês' },
	{ id: 'academia', size: 'sm', label: 'Academia' },
	{ id: 'leitura', size: 'sm', label: 'Leitura' },
	{ id: 'projetos', size: 'sm', label: 'Projetos' },
	{ id: 'conteudo', size: 'sm', label: 'Conteúdo' },
	{ id: 'premios', size: 'wide', label: 'Recompensas e penalidades' },
]

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
		<section className="@container flex h-full flex-col gap-3 p-4 sm:p-[20px]">
			<header className="flex items-center justify-between gap-3 leading-none">
				<h3 className="truncate text-[12px] tracking-[0.1em] text-muted-foreground uppercase">
					{title}
				</h3>
				<Link
					href={href}
					className="shrink-0 text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
					{meta ?? 'abrir →'}
				</Link>
			</header>
			<div className="flex min-h-0 flex-1 flex-col">{children}</div>
		</section>
	)
}

const Big = ({ children, unit }: { children: ReactNode; unit?: string }) => (
	<p className="text-[28px] leading-none tracking-tight tabular-nums @[240px]:text-[30px]">
		{children}
		{unit && <span className="text-[13px] text-muted-foreground">{' '}{unit}</span>}
	</p>
)

const Line = ({ label, value }: { label: ReactNode; value: ReactNode }) => (
	<div className="flex items-center gap-2 text-[13px]">
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
		case 'nivel': {
			const { total } = xpBreakdown(s)
			const lv = levelInfo(total)
			const streak = diaryStreak(s, now)
			return (
				<Tile title="Nível" href="/metas" meta="conquistas →">
					<Big unit={lv.title}>Nv {lv.level}</Big>
					<div className="mt-auto space-y-2">
						<Bar pct={lv.pct} />
						<Line label={`${lv.into} / ${lv.span} XP para o próximo nível`} value={`${total} XP`} />
						<Line label="Sequência no diário" value={`${streak.current} dia${streak.current === 1 ? '' : 's'} 🔥`} />
					</div>
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
									className={`h-3.5 rounded-[3px] ${d === now ? 'ring-1 ring-foreground/50' : ''} ${HEAT[heatLevel(by.get(d) ?? 0)]}`}
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
					{goals.length === 0 && (
						<p className="text-[13px] text-muted-foreground">Nenhuma meta ativa.</p>
					)}
					<ul className="flex flex-1 flex-col justify-between gap-2">
						{goals.map((g) => {
							const p = goalProgress(g, s, now)
							const bad = g.dir === 'max' && !p.met
							return (
								<li key={g.id} className="space-y-1">
									<Line
										label={g.title}
										value={
											METRICS[g.metric].money
												? `${brl(p.value)}`
												: `${num(p.value)}/${num(g.target)}`
										}
									/>
									<Bar
										pct={g.dir === 'max' ? (g.target ? p.value / g.target : 0) : p.pct}
										tone={bad ? 'err' : p.settled ? 'ok' : p.met ? 'ok' : g.dir === 'max' && p.value / g.target > 0.8 ? 'warn' : 'blue'}
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
			const bal = inc - out
			const budget = s.goals.find((g) => g.active && g.metric === 'expenses')
			return (
				<Tile title="Finanças do mês" href="/financas">
					<Big>{brl(bal)}</Big>
					<div className="mt-auto space-y-2">
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
				<Tile title="Academia" href="/academia" meta="→">
					<Big unit={goal ? `/ ${goal.target}` : 'na semana'}>{n}</Big>
					<div className="mt-auto flex gap-[3px]">
						{Array.from({ length: 7 }, (_, i) => addDays(week.from, i)).map((d) => (
							<span
								key={d}
								title={fmtShort(d)}
								className={`h-5 flex-1 rounded-[3px] ${s.workouts.some((w) => w.date === d) ? 'bg-blue-500 dark:bg-blue-400' : 'bg-foreground/10'}`}
							/>
						))}
					</div>
				</Tile>
			)
		}
		case 'leitura': {
			const pages = s.readings.filter((r) => inRange(r.date, week)).reduce((n, r) => n + r.pages, 0)
			const book = s.books.find((b) => b.status === 'Lendo')
			return (
				<Tile title="Leitura" href="/leitura" meta="→">
					<Big unit="págs">{num(pages)}</Big>
					<p className="mt-auto truncate text-[13px] text-muted-foreground">
						{book ? `Lendo: ${book.title}` : 'esta semana'}
					</p>
				</Tile>
			)
		}
		case 'projetos': {
			const done = s.tasks.filter((t) => t.done && t.doneAt && inRange(t.doneAt, week)).length
			const active = s.projects.filter((p) => p.status === 'Ativo').length
			return (
				<Tile title="Projetos" href="/projetos" meta="→">
					<Big unit="tarefas">{done}</Big>
					<p className="mt-auto text-[13px] text-muted-foreground">
						{active} projeto{active === 1 ? '' : 's'} ativo{active === 1 ? '' : 's'}
					</p>
				</Tile>
			)
		}
		case 'conteudo': {
			const posted = s.posts.filter((p) => p.status === 'Postado' && inRange(p.date, week)).length
			const ideas = s.posts.filter((p) => p.status === 'Ideia').length
			return (
				<Tile title="Conteúdo" href="/conteudo" meta="→">
					<Big unit="posts">{posted}</Big>
					<p className="mt-auto text-[13px] text-muted-foreground">
						{ideas} ideia{ideas === 1 ? '' : 's'} na fila
					</p>
				</Tile>
			)
		}
		case 'premios': {
			const rewards = s.settlements.filter((x) => x.result === 'won' && !x.resolved)
			const penalties = s.settlements.filter((x) => x.result === 'lost' && !x.resolved)
			return (
				<Tile title="Prêmios e penalidades" href="/metas">
					<div className="flex gap-6">
						<Big unit="prêmios">{rewards.length}</Big>
						<Big unit="a pagar">{penalties.length}</Big>
					</div>
					<ul className="mt-auto space-y-1.5">
						{[...penalties.map((x) => ({ x, tag: '⚠️' })), ...rewards.map((x) => ({ x, tag: '🎁' }))]
							.slice(0, 3)
							.map(({ x, tag }) => (
								<li key={x.id} className="truncate text-[13px]">
									{tag} {x.text || x.goalTitle}
								</li>
							))}
						{rewards.length + penalties.length === 0 && (
							<li className="text-[13px] text-muted-foreground">Cumpra metas para ganhar prêmios.</li>
						)}
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
			className="mb-4 flex flex-wrap gap-2">
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="O que você fez agora? (Enter para anotar)"
				aria-label="O que você fez agora"
				className={`${field} h-10 min-w-[220px] flex-1 text-[14px]`}
			/>
			<select
				value={area}
				onChange={(e) => setArea(e.target.value as Area)}
				aria-label="Área"
				className={`${field} h-10 bg-card`}>
				{AREAS.map((a) => (
					<option key={a.value} value={a.value}>
						{a.label}
					</option>
				))}
			</select>
			<button type="submit" className={`${buttonPrimary} h-10`}>
				Anotar
			</button>
		</form>
	)
}

function Board() {
	const s = useApp()
	const [editable, setEditable] = useState(false)
	// The grid keeps its own order after mount; start from the saved one.
	const [items] = useState(() => {
		const rank = (id: string) => {
			const i = s.layout.indexOf(id)
			return i < 0 ? 999 : i
		}
		return s.layout.length ? [...DEFAULT].sort((a, b) => rank(a.id) - rank(b.id)) : DEFAULT
	})

	return (
		<>
			<QuickLog />
			<div className="mb-4 flex items-center justify-between gap-3">
				<p className="text-[13px] text-muted-foreground">
					{editable
						? 'Arraste os blocos para reorganizar. Alt + setas no teclado.'
						: 'Seu painel em tempo real. Clique em um bloco para abrir a seção.'}
				</p>
				<button className={button} onClick={() => setEditable((v) => !v)}>
					{editable ? 'Concluir' : 'Reorganizar'}
				</button>
			</div>
			<DraggableWidgetGrid
				items={items}
				editable={editable}
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
