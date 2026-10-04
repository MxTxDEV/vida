'use client'

import { HEAT, PageHeader, Panel, Ready, Stat } from '@/components/bits'
import { Sheet, type Col } from '@/components/sheet'
import { addDays, fmtShort, inRange, lastDays, today, weekStart } from '@/lib/dates'
import { addItem, removeItem, updateItem, useApp } from '@/lib/store'
import type { Workout } from '@/lib/types'

const GROUPS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Cardio', 'Full body'].map((g) => ({ value: g, label: g }))

const COLS: Col<Workout>[] = [
	{ key: 'date', label: 'Data', type: 'date', w: '140px' },
	{ key: 'group', label: 'Treino', type: 'select', w: '130px', options: GROUPS },
	{ key: 'minutes', label: 'Minutos', type: 'number', w: '90px', placeholder: '60' },
	{ key: 'notes', label: 'Exercícios / cargas', type: 'text', w: 'minmax(220px,1fr)', placeholder: 'Ex.: Supino 4x8 60kg' },
	{ key: 'weight', label: 'Peso (kg)', type: 'number', w: '100px', placeholder: 'opcional' },
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
					<div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(15,minmax(0,1fr))] sm:gap-[5px] lg:grid-cols-[repeat(30,minmax(0,1fr))]">
						{days.map((d) => (
							<span
								key={d}
								title={`${fmtShort(d)}${s.workouts.some((w) => w.date === d) ? ' · treinou' : ''}`}
								className={`aspect-square rounded-[4px] ${s.workouts.some((w) => w.date === d) ? HEAT[4] : HEAT[0]}`}
							/>
						))}
					</div>
				</Panel>
				<Panel title="Treinos">
					<Sheet<Workout>
						cols={COLS}
						rows={rows}
						blank={() => ({ date: today(), group: 'Peito', minutes: 0, notes: '', weight: 0 })}
						canAdd={(d) => d.date !== ''}
						onAdd={(d) => addItem('workouts', d)}
						onUpdate={(id, p) => updateItem('workouts', id, p)}
						onRemove={(id) => removeItem('workouts', id)}
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
