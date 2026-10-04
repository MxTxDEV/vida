'use client'

import { HEAT, PageHeader, Panel, Ready, Stat, heatLevel } from '@/components/bits'
import { Sheet, type Col } from '@/components/sheet'
import { fmtDay, fmtShort, lastDays, nowTime, today } from '@/lib/dates'
import { diaryStreak } from '@/lib/game'
import { addItem, removeItem, updateItem, useApp } from '@/lib/store'
import { AREAS, type LogEntry } from '@/lib/types'

const COLS: Col<LogEntry>[] = [
	{ key: 'date', label: 'Data', type: 'date', w: '140px' },
	{ key: 'time', label: 'Hora', type: 'time', w: '100px', placeholder: 'agora' },
	{ key: 'area', label: 'Área', type: 'select', w: '130px', options: AREAS },
	{ key: 'text', label: 'O que eu fiz', type: 'text', w: 'minmax(220px,1fr)', placeholder: 'Ex.: Revisei o roteiro do vídeo' },
]

function Diary() {
	const s = useApp()
	const now = today()
	const days = lastDays(30, now)
	const per = new Map<string, number>()
	s.logs.forEach((l) => per.set(l.date, (per.get(l.date) ?? 0) + 1))
	const active = days.filter((d) => per.get(d)).length
	const streak = diaryStreak(s, now)
	const from = days[0]
	const rows = s.logs
		.filter((l) => l.date >= from)
		.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
	const older = s.logs.length - rows.length

	return (
		<>
			<PageHeader title="Diário" hint="Anote o que você fez, na hora. Tudo dos últimos 30 dias fica aqui." />
			<div className="grid gap-4">
				<Panel title="Últimos 30 dias">
					<div className="mb-4 grid grid-cols-3 gap-4">
						<Stat label="Dias com registro" value={`${active}/30`} />
						<Stat label="Sequência atual" value={`${streak.current} 🔥`} />
						<Stat label="Melhor sequência" value={streak.best} />
					</div>
					<div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(15,minmax(0,1fr))] sm:gap-[5px] lg:grid-cols-[repeat(30,minmax(0,1fr))]">
						{days.map((d) => (
							<span
								key={d}
								title={`${fmtShort(d)} · ${per.get(d) ?? 0} anotações`}
								className={`aspect-square rounded-[4px] ${d === now ? 'ring-1 ring-foreground/50' : ''} ${HEAT[heatLevel(per.get(d) ?? 0)]}`}
							/>
						))}
					</div>
				</Panel>
				<Panel title="Registros" meta={older > 0 ? `${older} mais antigos não exibidos` : undefined}>
					<Sheet<LogEntry>
						cols={COLS}
						rows={rows}
						blank={() => ({ date: today(), time: '', area: 'geral', text: '' })}
						canAdd={(d) => d.text.trim() !== '' && d.date !== ''}
						onAdd={(d) => addItem('logs', { ...d, text: d.text.trim(), time: d.time || nowTime() })}
						onUpdate={(id, p) => updateItem('logs', id, p)}
						onRemove={(id) => removeItem('logs', id)}
						empty="Sem registros nos últimos 30 dias. Anote o primeiro acima."
					/>
					{rows.length > 0 && (
						<p className="mt-3 text-[12px] text-muted-foreground">
							Último registro: {fmtDay(rows[0].date)} às {rows[0].time}
						</p>
					)}
				</Panel>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Diary />
		</Ready>
	)
}
