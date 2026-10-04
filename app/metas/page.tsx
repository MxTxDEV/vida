'use client'

import { useState } from 'react'
import { Bar, PageHeader, Panel, Ready, brl, button, buttonPrimary, field, num } from '@/components/bits'
import { fmtShort, today } from '@/lib/dates'
import {
	ACHIEVEMENTS,
	areaLabel,
	claimGoal,
	goalProgress,
	levelInfo,
	METRICS,
	xpBreakdown,
} from '@/lib/game'
import { addItem, mutate, removeItem, updateItem, useApp } from '@/lib/store'
import { AREAS, type Area, type Goal, type MetricId } from '@/lib/types'

const fmtVal = (g: Goal, v: number) => (METRICS[g.metric].money ? brl(v) : `${num(v)} ${METRICS[g.metric].unit}`)

function Text({ value, onSave, label, wide = false }: { value: string | number; onSave: (v: string) => void; label: string; wide?: boolean }) {
	return (
		<input
			key={String(value)}
			defaultValue={value}
			aria-label={label}
			onBlur={(e) => e.target.value !== String(value) && onSave(e.target.value)}
			onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
			className={`${field} ${wide ? 'w-full' : 'w-24 text-right tabular-nums'}`}
		/>
	)
}

function GoalCard({ g }: { g: Goal }) {
	const s = useApp()
	const p = goalProgress(g, s)
	const over = g.dir === 'max' && !p.met
	return (
		<li className={`rounded-2xl p-4 ring-1 ring-border ${g.active ? '' : 'opacity-50'}`}>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="text-[14px]">{g.title}</p>
					<p className="mt-0.5 text-[12px] text-muted-foreground">
						{areaLabel(g.area)} · {g.period === 'week' ? 'semanal' : 'mensal'} · {METRICS[g.metric].label}{' '}
						{g.dir === 'min' ? '≥' : '≤'}{' '}
						<Text label="Alvo" value={g.target} onSave={(v) => updateItem('goals', g.id, { target: Number(v.replace(',', '.')) || 0 })} />
					</p>
				</div>
				<div className="flex items-center gap-2">
					{p.claimable && (
						<button className={buttonPrimary} onClick={() => mutate((st) => claimGoal(st, g.id))}>
							Resgatar +{g.xpWin} XP
						</button>
					)}
					<button className={button} onClick={() => updateItem('goals', g.id, { active: !g.active })}>
						{g.active ? 'Pausar' : 'Ativar'}
					</button>
					<button className={`${button} text-rose-600 dark:text-rose-400`} aria-label="Remover meta" onClick={() => removeItem('goals', g.id)}>
						×
					</button>
				</div>
			</div>
			<div className="mt-3 space-y-1.5">
				<Bar pct={g.dir === 'max' ? (g.target ? p.value / g.target : 0) : p.pct} tone={over ? 'err' : p.met ? 'ok' : 'blue'} />
				<p className="flex flex-wrap justify-between gap-2 text-[12px] text-muted-foreground">
					<span>
						{fmtVal(g, p.value)} de {fmtVal(g, g.target)}
					</span>
					<span>
						{p.settled
							? p.settled.result === 'won'
								? '✅ resgatada neste período'
								: '❌ perdida'
							: g.dir === 'max'
								? over
									? '🚨 limite estourado'
									: `✔ dentro do limite · ${p.daysLeft}d restantes`
								: p.met
									? '🎯 meta batida!'
									: `${p.daysLeft}d restantes`}
					</span>
				</p>
			</div>
			<div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
				<label className="grid gap-1">
					<span className="text-muted-foreground">🎁 Se cumprir (+{g.xpWin} XP)</span>
					<Text wide label="Recompensa" value={g.reward} onSave={(v) => updateItem('goals', g.id, { reward: v })} />
				</label>
				<label className="grid gap-1">
					<span className="text-muted-foreground">⚠️ Se falhar (−{g.xpLose} XP)</span>
					<Text wide label="Penalidade" value={g.penalty} onSave={(v) => updateItem('goals', g.id, { penalty: v })} />
				</label>
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

	if (!open)
		return (
			<button className={button} onClick={() => setOpen(true)}>
				+ Nova meta
			</button>
		)
	return (
		<div className="grid gap-2 rounded-2xl bg-foreground/[0.04] p-4 sm:grid-cols-2">
			<input className={`${field} sm:col-span-2`} placeholder="Título (ex.: Correr 3x na semana)" value={title} onChange={(e) => setTitle(e.target.value)} />
			<select className={`${field} bg-card`} value={area} onChange={(e) => setArea(e.target.value as Area)} aria-label="Área">
				{AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
			</select>
			<select className={`${field} bg-card`} value={metric} onChange={(e) => setMetric(e.target.value as MetricId)} aria-label="O que medir">
				{(Object.keys(METRICS) as MetricId[]).map((m) => <option key={m} value={m}>{METRICS[m].label} ({METRICS[m].dir === 'min' ? 'mínimo' : 'limite'})</option>)}
			</select>
			<select className={`${field} bg-card`} value={period} onChange={(e) => setPeriod(e.target.value as Goal['period'])} aria-label="Período">
				<option value="week">Semanal</option>
				<option value="month">Mensal</option>
			</select>
			<input className={field} placeholder="Alvo (número)" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
			<input className={field} placeholder="🎁 Recompensa se cumprir" value={reward} onChange={(e) => setReward(e.target.value)} />
			<input className={field} placeholder="⚠️ Penalidade se falhar" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
			<div className="flex gap-2 sm:col-span-2">
				<button
					className={buttonPrimary}
					disabled={!ok}
					onClick={() => {
						addItem('goals', {
							title: title.trim(),
							area,
							metric,
							period,
							target: t,
							dir: METRICS[metric].dir,
							reward,
							penalty,
							xpWin: 100,
							xpLose: 50,
							active: true,
							createdAt: today(),
						})
						setTitle('')
						setTarget('')
						setReward('')
						setPenalty('')
						setOpen(false)
					}}>
					Criar meta
				</button>
				<button className={button} onClick={() => setOpen(false)}>Cancelar</button>
			</div>
		</div>
	)
}

function Goals() {
	const s = useApp()
	const { total, rows } = xpBreakdown(s)
	const lv = levelInfo(total)
	const history = [...s.settlements].sort((a, b) => b.date.localeCompare(a.date))
	const rewards = history.filter((x) => x.result === 'won' && !x.resolved)
	const penalties = history.filter((x) => x.result === 'lost' && !x.resolved)
	const done = ACHIEVEMENTS.filter((a) => s.unlocked[a.id]).length

	return (
		<>
			<PageHeader title="Metas e conquistas" hint="Bata as metas e ganhe prêmios. Falhe e pague a penalidade. Você define as regras." />
			<div className="grid gap-4">
				<Panel title="Seu nível" meta={`${total} XP`}>
					<p className="text-[26px] leading-none">Nv {lv.level} <span className="text-[14px] text-muted-foreground">{lv.title}</span></p>
					<div className="mt-3 space-y-1.5">
						<Bar pct={lv.pct} />
						<p className="text-[12px] text-muted-foreground">{lv.into}/{lv.span} XP para o nível {lv.level + 1}</p>
					</div>
					<details className="mt-3 text-[12px] text-muted-foreground">
						<summary className="cursor-pointer">De onde vem o XP</summary>
						<ul className="mt-2 space-y-1">
							{rows.map((r) => (
								<li key={r.label} className="flex justify-between"><span>{r.label}</span><span className="tabular-nums">{r.xp}</span></li>
							))}
						</ul>
					</details>
				</Panel>

				<Panel title="Metas do período" meta={<NewGoal />}>
					<ul className="grid gap-3">
						{s.goals.map((g) => <GoalCard key={g.id} g={g} />)}
						{s.goals.length === 0 && <p className="text-[13px] text-muted-foreground">Nenhuma meta. Crie a primeira.</p>}
					</ul>
				</Panel>

				<div className="grid gap-4 lg:grid-cols-2">
					<Panel title="🎁 Prêmios disponíveis" meta={`${rewards.length}`}>
						<ul className="space-y-2">
							{rewards.map((x) => (
								<li key={x.id} className="flex items-center gap-3 text-[13px]">
									<span className="min-w-0 flex-1"><span className="block truncate">{x.text || 'Prêmio'}</span><span className="text-[12px] text-muted-foreground">{x.goalTitle} · {fmtShort(x.date)}</span></span>
									<button className={button} onClick={() => mutate((st) => ({ ...st, settlements: st.settlements.map((y) => y.id === x.id ? { ...y, resolved: true } : y) }))}>Usar</button>
								</li>
							))}
							{rewards.length === 0 && <li className="text-[13px] text-muted-foreground">Nenhum prêmio guardado.</li>}
						</ul>
					</Panel>
					<Panel title="⚠️ Penalidades a cumprir" meta={`${penalties.length}`}>
						<ul className="space-y-2">
							{penalties.map((x) => (
								<li key={x.id} className="flex items-center gap-3 text-[13px]">
									<span className="min-w-0 flex-1"><span className="block truncate">{x.text || 'Penalidade'}</span><span className="text-[12px] text-muted-foreground">{x.goalTitle} · {fmtShort(x.date)} · {x.xp} XP</span></span>
									<button className={button} onClick={() => mutate((st) => ({ ...st, settlements: st.settlements.map((y) => y.id === x.id ? { ...y, resolved: true } : y) }))}>Cumprida</button>
								</li>
							))}
							{penalties.length === 0 && <li className="text-[13px] text-muted-foreground">Nada pendente. Continue assim.</li>}
						</ul>
					</Panel>
				</div>

				<Panel title="Conquistas" meta={`${done}/${ACHIEVEMENTS.length}`}>
					<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{ACHIEVEMENTS.map((a) => {
							const on = s.unlocked[a.id]
							return (
								<li key={a.id} className={`flex gap-3 rounded-xl p-3 ring-1 ring-border ${on ? '' : 'opacity-45 grayscale'}`}>
									<span className="text-[22px]" aria-hidden="true">{a.icon}</span>
									<span className="min-w-0 text-[13px]">
										<span className="block">{a.title} <span className="text-muted-foreground">+{a.xp} XP</span></span>
										<span className="block text-[12px] text-muted-foreground">{on ? `Desbloqueada em ${fmtShort(on)}` : a.desc}</span>
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
