'use client'

import { Bars, HEAT, PageHeader, Panel, Ready, Stat } from '@/components/bits'
import { Sheet, type Col } from '@/components/sheet'
import { addDays, fmtShort, inRange, lastDays, today, weekStart } from '@/lib/dates'
import { lastWeeks } from '@/lib/periods'
import { addItem, removeItem, updateItem, useApp } from '@/lib/store'
import type { Workout } from '@/lib/types'

const cols = (groups: string[]): Col<Workout>[] => [
	{ key: 'date', label: 'Data', type: 'date', w: '150px' },
	{ key: 'group', label: 'Treino', type: 'select', w: '140px', options: groups.map((g) => ({ value: g, label: g })) },
	{ key: 'minutes', label: 'Minutos', type: 'number', w: '90px', placeholder: '60' },
	{ key: 'notes', label: 'Exercícios / cargas', type: 'text', w: 'minmax(220px,1fr)', placeholder: 'Ex.: Supino 4x8 60kg' },
	{ key: 'weight', label: 'Peso (kg)', type: 'number', w: '110px', placeholder: 'opcional' },
]

function Gym() {
	const s = useApp()
	const now = today()
	const wk = { from: weekStart(now), to: addDays(weekStart(now), 6) }
	const days = lastDays(30, now)
	const rows = [...s.workouts].sort((a, b) => b.date.localeCompare(a.date))
	const last30 = s.workouts.filter((w) => w.date >= days[0]).length
	const week = s.workouts.filter((w) => inRange(w.date, wk)).length
	const mins = s.workouts.filter((w) => w.date >= days[0]).reduce((n, w) => n + w.minutes, 0)
	const weights = rows.filter((w) => w.weight > 0)

	const weeks = lastWeeks(8).map((w) => ({
		label: fmtShort(w),
		v: s.workouts.filter((x) => inRange(x.date, { from: w, to: addDays(w, 6) })).length,
	}))
	const weighIns = [...weights].reverse().slice(-10).map((w) => ({ label: fmtShort(w.date), v: w.weight }))

	return (
		<>
			<PageHeader title="Academia" hint="Registre cada treino. A meta semanal conta daqui." />
			<div className="grid gap-4">
				<Panel title="Resumo">
					<div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
						<Stat label="Treinos na semana" value={week} />
						<Stat label="Treinos em 30 dias" value={last30} />
						<Stat label="Minutos em 30 dias" value={mins} />
						<Stat label="Peso atual" value={weights[0] ? `${weights[0].weight} kg` : '—'} />
					</div>
					<div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(15,minmax(0,1fr))] lg:grid-cols-[repeat(30,minmax(0,1fr))]">
						{days.map((d) => (
							<span
								key={d}
								title={`${fmtShort(d)}${s.workouts.some((w) => w.date === d) ? ' · treinou' : ''}`}
								className={`aspect-square rounded-[4px] ${s.workouts.some((w) => w.date === d) ? HEAT[4] : HEAT[0]}`}
							/>
						))}
					</div>
				</Panel>
				<div className="grid gap-4 lg:grid-cols-2">
					<Panel title="Treinos por semana" meta="últimas 8 semanas">
						<Bars data={weeks} color="blue" height={96} />
					</Panel>
					<Panel title="Peso corporal" meta="últimas pesagens">
						{weighIns.length > 1 ? (
							<Bars data={weighIns} color="pink" height={96} baseline="min" format={(n) => `${n}`} />
						) : (
							<p className="py-6 text-center text-[14px] text-muted-foreground">Anote o peso em 2 treinos para ver a evolução.</p>
						)}
					</Panel>
				</div>
				<Panel title="Treinos">
					<Sheet<Workout>
						cols={cols(s.settings.workoutGroups)}
						rows={rows}
						blank={() => ({ date: today(), group: s.settings.workoutGroups[0] ?? 'Treino', minutes: 0, notes: '', weight: 0 })}
						canAdd={(d) => d.date !== ''}
						onAdd={(d) => addItem('workouts', d)}
						onUpdate={(id, p) => updateItem('workouts', id, p)}
						onRemove={(id) => removeItem('workouts', id)}
						onDuplicate={(r) => addItem('workouts', { date: today(), group: r.group, minutes: r.minutes, notes: r.notes, weight: 0 })}
						empty="Nenhum treino registrado ainda."
					/>
				</Panel>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Gym />
		</Ready>
	)
}
