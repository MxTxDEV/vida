'use client'

import { useState } from 'react'
import { Bar, Bars, PageHeader, Panel, Ready, TONE_TEXT, brl, num } from '@/components/bits'
import { Icon, LevelRing, RankBadge } from '@/components/badges'
import { fmtShort, monthEnd, today } from '@/lib/dates'
import {
	ACHIEVEMENTS,
	areaLabel,
	claimGoal,
	goalProgress,
	levelInfo,
	METRICS,
	QUEST_MIN,
	questsOn,
	RANKS,
	rankFor,
	seasonHistory,
	seasonRange,
	xpBreakdown,
} from '@/lib/game'
import { lastMonths, monthLabel } from '@/lib/periods'
import { addItem, mutate, removeItem, updateItem, useApp } from '@/lib/store'
import { AREAS, type Area, type Goal, type MetricId } from '@/lib/types'

const fmtVal = (g: Goal, v: number) => (METRICS[g.metric].money ? brl(v) : `${num(v)} ${METRICS[g.metric].unit}`)

/** An input that saves when it loses focus. */
function Edit({ value, onSave, label, wide = false, numeric = false }: { value: string | number; onSave: (v: string) => void; label: string; wide?: boolean; numeric?: boolean }) {
	return (
		<input
			key={String(value)}
			defaultValue={value}
			aria-label={label}
			inputMode={numeric ? 'decimal' : undefined}
			onBlur={(e) => e.target.value !== String(value) && onSave(e.target.value)}
			onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
			className={`px-input ${wide ? 'w-full' : 'w-24 text-right tabular-nums'}`}
		/>
	)
}

const toNum = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0)

function GoalCard({ g }: { g: Goal }) {
	const s = useApp()
	const p = goalProgress(g, s)
	const over = g.dir === 'max' && !p.met
	const set = (patch: Partial<Goal>) => updateItem('goals', g.id, patch)
	return (
		<li className={`px-box p-3 ${g.active ? '' : 'opacity-50'}`}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="min-w-[200px] flex-1">
					<Edit wide label="Título da meta" value={g.title} onSave={(v) => v.trim() && set({ title: v.trim() })} />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{p.claimable && (
						<button className="px-btn-primary" onClick={() => mutate((st) => claimGoal(st, g.id))}>
							Resgatar +{g.xpWin} XP
						</button>
					)}
					<button className="px-btn" onClick={() => set({ active: !g.active })}>{g.active ? 'Pausar' : 'Ativar'}</button>
					<button
						className="px-btn text-px-red"
						aria-label="Remover meta"
						onClick={() => window.confirm(`Remover a meta "${g.title}"?`) && removeItem('goals', g.id)}>
						×
					</button>
				</div>
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]">
				<label className="flex items-center gap-2">
					<span className="text-muted-foreground">Área</span>
					<select className="px-input" value={g.area} onChange={(e) => set({ area: e.target.value as Area })}>
						{AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
					</select>
				</label>
				<label className="flex items-center gap-2">
					<span className="text-muted-foreground">Período</span>
					<select className="px-input" value={g.period} onChange={(e) => set({ period: e.target.value as Goal['period'] })}>
						<option value="week">Semanal</option>
						<option value="month">Mensal</option>
					</select>
				</label>
				<label className="flex items-center gap-2">
					<span className="text-muted-foreground">{METRICS[g.metric].label} {g.dir === 'min' ? '≥' : '≤'}</span>
					<Edit numeric label="Alvo" value={g.target} onSave={(v) => set({ target: toNum(v) })} />
				</label>
			</div>

			<div className="mt-3 space-y-1.5">
				<Bar pct={g.dir === 'max' ? (g.target ? p.value / g.target : 0) : p.pct} tone={over ? 'err' : p.met ? 'ok' : 'blue'} />
				<p className="flex flex-wrap justify-between gap-2 text-[13px] text-muted-foreground">
					<span>{fmtVal(g, p.value)} de {fmtVal(g, g.target)}</span>
					<span>
						{p.settled
							? p.settled.result === 'won' ? '★ resgatada neste período' : '✖ perdida'
							: g.dir === 'max'
								? over ? '⚠ limite estourado' : `dentro do limite · ${p.daysLeft}d restantes`
								: p.met ? '★ meta batida!' : `${p.daysLeft}d restantes`}
					</span>
				</p>
			</div>

			<div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
				<div className="grid gap-1">
					<span className="text-px-yellow">★ Se cumprir</span>
					<Edit wide label="Recompensa" value={g.reward} onSave={(v) => set({ reward: v })} />
					<label className="flex items-center gap-2 text-muted-foreground">+ XP <Edit numeric label="XP ao ganhar" value={g.xpWin} onSave={(v) => set({ xpWin: toNum(v) })} /></label>
				</div>
				<div className="grid gap-1">
					<span className="text-px-red">⚠ Se falhar</span>
					<Edit wide label="Penalidade" value={g.penalty} onSave={(v) => set({ penalty: v })} />
					<label className="flex items-center gap-2 text-muted-foreground">− XP <Edit numeric label="XP ao perder" value={g.xpLose} onSave={(v) => set({ xpLose: toNum(v) })} /></label>
				</div>
			</div>
		</li>
	)
}

function NewGoal() {
	const [open, setOpen] = useState(false)
	const [title, setTitle] = useState('')
	const [area, setArea] = useState<Area>('geral')
	const [metric, setMetric] = useState<MetricId>('workouts')
	const [period, setPeriod] = useState<Goal['period']>('week')
	const [target, setTarget] = useState('')
	const [reward, setReward] = useState('')
	const [penalty, setPenalty] = useState('')
	const t = Number(target.replace(',', '.'))
	const ok = title.trim() !== '' && t > 0

	if (!open) return <button className="px-btn" onClick={() => setOpen(true)}>+ Nova meta</button>
	return (
		<div className="grid gap-2 sm:grid-cols-2">
			<input className="px-input sm:col-span-2" placeholder="Título (ex.: Correr 3x na semana)" value={title} onChange={(e) => setTitle(e.target.value)} />
			<select className="px-input" value={area} onChange={(e) => setArea(e.target.value as Area)} aria-label="Área">
				{AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
			</select>
			<select className="px-input" value={metric} onChange={(e) => setMetric(e.target.value as MetricId)} aria-label="O que medir">
				{(Object.keys(METRICS) as MetricId[]).map((m) => <option key={m} value={m}>{METRICS[m].label} ({METRICS[m].dir === 'min' ? 'mínimo' : 'limite'})</option>)}
			</select>
			<select className="px-input" value={period} onChange={(e) => setPeriod(e.target.value as Goal['period'])} aria-label="Período">
				<option value="week">Semanal</option>
				<option value="month">Mensal</option>
			</select>
			<input className="px-input" placeholder="Alvo (número)" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
			<input className="px-input" placeholder="★ Recompensa se cumprir" value={reward} onChange={(e) => setReward(e.target.value)} />
			<input className="px-input" placeholder="⚠ Penalidade se falhar" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
			<div className="flex gap-2 sm:col-span-2">
				<button
					className="px-btn-primary"
					disabled={!ok}
					onClick={() => {
						addItem('goals', { title: title.trim(), area, metric, period, target: t, dir: METRICS[metric].dir, reward, penalty, xpWin: 100, xpLose: 50, active: true, createdAt: today() })
						setTitle(''); setTarget(''); setReward(''); setPenalty(''); setOpen(false)
					}}>
					Criar meta
				</button>
				<button className="px-btn" onClick={() => setOpen(false)}>Cancelar</button>
			</div>
		</div>
	)
}

const monthName = (m: string) => new Date(`${m}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

function Goals() {
	const s = useApp()
	const now = today()
	const life = xpBreakdown(s)
	const range = seasonRange(now)
	const season = xpBreakdown(s, range)
	const lv = levelInfo(life.total)
	const r = rankFor(season.total, s.settings.tiers)
	const history = seasonHistory(s, now)
	const left = Math.max(0, Math.round((new Date(monthEnd(now)).getTime() - new Date(now).getTime()) / 86400000))
	const chart = lastMonths(6).map((m) => {
		const key = m.slice(0, 7)
		const h = history.find((x) => x.month.startsWith(key))
		const xp = key === now.slice(0, 7) ? season.total : (h?.xp ?? 0)
		return { label: monthLabel(m), v: xp, hi: key === now.slice(0, 7) }
	})
	const q = questsOn(s, now)
	const qDone = q.filter((x) => x.done).length
	const settlements = [...s.settlements].sort((a, b) => b.date.localeCompare(a.date))
	const rewards = settlements.filter((x) => x.result === 'won' && !x.resolved)
	const penalties = settlements.filter((x) => x.result === 'lost' && !x.resolved)
	const done = ACHIEVEMENTS.filter((a) => s.unlocked[a.id]).length
	const resolve = (id: string) =>
		mutate((st) => ({ ...st, settlements: st.settlements.map((y) => (y.id === id ? { ...y, resolved: true } : y)) }))
	const floors = [0, ...s.settings.tiers]
	const [allRewards, setAllRewards] = useState(false)
	const [allPenalties, setAllPenalties] = useState(false)
	const LIMIT = 6

	return (
		<>
			<PageHeader title="Metas e ranking" hint="O ranking zera todo mês. O XP e o nível acumulam para sempre." />
			<div className="grid gap-4">
				<div className="grid gap-4 lg:grid-cols-2">
					<Panel title="Ranking do mês" meta={`${monthName(range.from)} · ${left}d p/ virar`}>
						<div className="flex items-center gap-5">
							<RankBadge index={r.index} size={7} />
							<div className="min-w-0 flex-1">
								<p className="font-display text-[26px] font-semibold">{r.rank.label}</p>
								<p className="mt-2 text-[30px] leading-none tabular-nums">{num(season.total)} XP</p>
								<div className="mt-3 space-y-1">
									<Bar pct={r.pct} tone="warn" />
									<p className="text-[13px] text-muted-foreground">
										{r.next ? `Faltam ${num(r.next.at - season.total)} XP para ${r.next.rank.label}` : 'Você está no rank máximo!'}
									</p>
								</div>
							</div>
						</div>
						<ul className="mt-5 grid grid-cols-5 gap-2 text-center">
							{RANKS.map((x, i) => (
								<li key={x.id} className={`flex flex-col items-center gap-1 ${i <= r.index ? '' : 'opacity-40'}`}>
									<RankBadge index={i} size={3} />
									<span className="text-[12px]">{x.label}</span>
									<span className="text-[12px] text-muted-foreground tabular-nums">{num(floors[i])}+</span>
								</li>
							))}
						</ul>
					</Panel>

					<Panel title="Nível vitalício" meta={`${num(life.total)} XP no total`}>
						<div className="flex items-center gap-5">
							<LevelRing level={lv.level} pct={lv.pct} size={104} />
							<div className="min-w-0 flex-1">
								<p className="mt-1 text-[16px] text-muted-foreground">{lv.title}</p>
								<div className="mt-3 space-y-1">
									<Bar pct={lv.pct} tone="blue" />
									<p className="text-[13px] text-muted-foreground tabular-nums">{lv.into}/{lv.span} XP para o nível {lv.level + 1}</p>
								</div>
							</div>
						</div>
						<details className="mt-4 text-[13px]">
							<summary className="cursor-pointer text-muted-foreground">De onde vem o XP (mês | total)</summary>
							<ul className="mt-2 space-y-1">
								{life.rows.map((row, i) => (
									<li key={row.label} className="flex justify-between gap-3">
										<span className="truncate">{row.label}</span>
										<span className="tabular-nums text-muted-foreground">{season.rows[i].xp} | {row.xp}</span>
									</li>
								))}
							</ul>
						</details>
					</Panel>
				</div>

				<Panel title="Histórico de temporadas" meta="rank final de cada mês">
					<Bars data={chart} color="blue" height={96} />
					{history.length > 0 ? (
						<ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
							{history.slice(0, 12).map((h) => (
								<li key={h.month} className="px-box flex flex-col items-center gap-1 p-2 text-center">
									<RankBadge index={h.rank.index} size={3} />
									<span className="text-[13px]">{h.rank.rank.label}</span>
									<span className="text-[12px] capitalize text-muted-foreground">{monthName(h.month)}</span>
									<span className="text-[12px] tabular-nums text-muted-foreground">{num(h.xp)} XP</span>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-4 text-[14px] text-muted-foreground">Quando o mês virar, o rank final dele fica guardado aqui.</p>
					)}
				</Panel>

				<Panel title="Missões do dia" meta={`${qDone}/${q.length} · bônus com ${QUEST_MIN}`}>
					<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{q.map((x) => (
							<li key={x.id} className="flex items-center gap-2 text-[15px]">
								<span className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border ${x.done ? 'bg-px-green text-background' : ''}`}>
									{x.done && <Icon name="check" size={14} />}
								</span>
								<span className={x.done ? 'text-muted-foreground line-through' : ''}>{x.label}</span>
							</li>
						))}
					</ul>
					<p className={`mt-3 text-[14px] ${qDone >= QUEST_MIN ? TONE_TEXT.ok : 'text-muted-foreground'}`}>
						{qDone >= QUEST_MIN ? `★ Bônus de +${s.settings.xp.quest} XP garantido hoje!` : `Faça ${QUEST_MIN} missões hoje para ganhar +${s.settings.xp.quest} XP.`}
					</p>
				</Panel>

				<Panel title="Metas do período" meta={<NewGoal />}>
					<ul className="grid gap-3">
						{s.goals.map((g) => <GoalCard key={g.id} g={g} />)}
						{s.goals.length === 0 && <p className="text-[14px] text-muted-foreground">Nenhuma meta. Crie a primeira.</p>}
					</ul>
				</Panel>

				<div className="grid gap-4 lg:grid-cols-2">
					<Panel title="★ Prêmios disponíveis" meta={`${rewards.length}`}>
						<ul className="space-y-3">
							{(allRewards ? rewards : rewards.slice(0, LIMIT)).map((x) => (
								<li key={x.id} className="flex items-center gap-3 text-[14px]">
									<span className="min-w-0 flex-1"><span className="block truncate">{x.text || 'Prêmio'}</span><span className="text-[13px] text-muted-foreground">{x.goalTitle} · {fmtShort(x.date)}</span></span>
									<button className="px-btn" onClick={() => resolve(x.id)}>Usar</button>
								</li>
							))}
							{rewards.length === 0 && <li className="text-[14px] text-muted-foreground">Nenhum prêmio guardado.</li>}
							{rewards.length > LIMIT && (
								<li><button className="px-btn" onClick={() => setAllRewards((v) => !v)}>{allRewards ? 'Ver menos' : `Ver todos (${rewards.length})`}</button></li>
							)}
						</ul>
					</Panel>
					<Panel title="⚠ Penalidades a cumprir" meta={`${penalties.length}`}>
						<ul className="space-y-3">
							{(allPenalties ? penalties : penalties.slice(0, LIMIT)).map((x) => (
								<li key={x.id} className="flex items-center gap-3 text-[14px]">
									<span className="min-w-0 flex-1"><span className="block truncate">{x.text || 'Penalidade'}</span><span className="text-[13px] text-muted-foreground">{x.goalTitle} · {fmtShort(x.date)} · {x.xp} XP</span></span>
									<button className="px-btn" onClick={() => resolve(x.id)}>Cumprida</button>
								</li>
							))}
							{penalties.length === 0 && <li className="text-[14px] text-muted-foreground">Nada pendente. Continue assim.</li>}
							{penalties.length > LIMIT && (
								<li><button className="px-btn" onClick={() => setAllPenalties((v) => !v)}>{allPenalties ? 'Ver menos' : `Ver todos (${penalties.length})`}</button></li>
							)}
						</ul>
					</Panel>
				</div>

				<Panel title="Conquistas" meta={`${done}/${ACHIEVEMENTS.length}`}>
					<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{ACHIEVEMENTS.map((a) => {
							const on = s.unlocked[a.id]
							return (
								<li key={a.id} className={`px-box flex gap-3 p-3 ${on ? '' : 'opacity-45 grayscale'}`}>
									<span className="text-[24px]" aria-hidden="true">{a.icon}</span>
									<span className="min-w-0 text-[14px]">
										<span className="block">{a.title} <span className="text-px-yellow">+{a.xp} XP</span></span>
										<span className="block text-[13px] text-muted-foreground">{on ? `Desbloqueada em ${fmtShort(on)}` : a.desc}</span>
									</span>
								</li>
							)
						})}
					</ul>
				</Panel>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Goals />
		</Ready>
	)
}
