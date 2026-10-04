'use client'

import { Bar, PageHeader, Panel, Ready, Stat } from '@/components/bits'
import { Sheet, type Col } from '@/components/sheet'
import { addDays, inRange, today, weekStart } from '@/lib/dates'
import { addItem, mutate, removeItem, updateItem, useApp } from '@/lib/store'
import type { Project, Task } from '@/lib/types'

const STATUS = ['Ideia', 'Ativo', 'Pausado', 'Concluído'].map((v) => ({ value: v, label: v }))

const PROJECT_COLS: Col<Project>[] = [
	{ key: 'name', label: 'Projeto', type: 'text', w: 'minmax(200px,1fr)', placeholder: 'Nome do projeto' },
	{ key: 'status', label: 'Status', type: 'select', w: '130px', options: STATUS },
	{ key: 'deadline', label: 'Prazo', type: 'date', w: '140px' },
]

function Projects() {
	const s = useApp()
	const now = today()
	const wk = { from: weekStart(now), to: addDays(weekStart(now), 6) }
	const week = s.tasks.filter((t) => t.done && t.doneAt && inRange(t.doneAt, wk)).length
	const open = s.tasks.filter((t) => !t.done).length
	const opts = s.projects.map((p) => ({ value: p.id, label: p.name || '(sem nome)' }))
	const rows = [...s.tasks].sort((a, b) => Number(a.done) - Number(b.done))
	const progress = (id: string) => {
		const t = s.tasks.filter((x) => x.projectId === id)
		return t.length ? t.filter((x) => x.done).length / t.length : 0
	}

	const taskCols: Col<Task>[] = [
		{ key: 'done', label: 'Feito', type: 'check', w: '60px' },
		{ key: 'text', label: 'Tarefa', type: 'text', w: 'minmax(220px,1fr)', placeholder: 'O que precisa ser feito' },
		{ key: 'projectId', label: 'Projeto', type: 'select', w: '200px', options: opts, placeholder: '— escolha —' },
	]

	return (
		<>
			<PageHeader title="Projetos" hint="Marque a tarefa como feita para ganhar XP e avançar nas metas." />
			<div className="grid gap-4">
				<Panel>
					<div className="grid grid-cols-3 gap-4">
						<Stat label="Concluídas na semana" value={week} />
						<Stat label="Tarefas em aberto" value={open} />
						<Stat label="Projetos ativos" value={s.projects.filter((p) => p.status === 'Ativo').length} />
					</div>
				</Panel>
				<Panel title="Projetos">
					<Sheet<Project>
						cols={PROJECT_COLS}
						rows={s.projects}
						blank={() => ({ name: '', status: 'Ativo', deadline: '' })}
						canAdd={(d) => d.name.trim() !== ''}
						onAdd={(d) => addItem('projects', { ...d, name: d.name.trim() })}
						onUpdate={(id, p) => updateItem('projects', id, p)}
						onRemove={(id) =>
							mutate((st) => ({
								...st,
								projects: st.projects.filter((p) => p.id !== id),
								tasks: st.tasks.filter((t) => t.projectId !== id),
							}))
						}
						empty="Crie seu primeiro projeto."
					/>
					{s.projects.length > 0 && (
						<ul className="mt-4 space-y-2.5 border-t border-border pt-4">
							{s.projects.map((p) => (
								<li key={p.id} className="grid grid-cols-[minmax(0,1fr)_1fr_50px] items-center gap-3 text-[16px]">
									<span className="truncate">{p.name}</span>
									<Bar pct={p.status === 'Concluído' ? 1 : progress(p.id)} tone={p.status === 'Concluído' ? 'ok' : 'blue'} />
									<span className="text-right text-muted-foreground tabular-nums">{Math.round((p.status === 'Concluído' ? 1 : progress(p.id)) * 100)}%</span>
								</li>
							))}
						</ul>
					)}
				</Panel>
				<Panel title="Tarefas">
					<Sheet<Task>
						cols={taskCols}
						rows={rows}
						blank={() => ({ projectId: s.projects[0]?.id ?? '', text: '', done: false, doneAt: '' })}
						canAdd={(d) => d.text.trim() !== '' && d.projectId !== ''}
						onAdd={(d) => addItem('tasks', { ...d, text: d.text.trim(), doneAt: d.done ? today() : '' })}
						onUpdate={(id, p) =>
							updateItem('tasks', id, 'done' in p ? { ...p, doneAt: p.done ? today() : '' } : p)
						}
						onRemove={(id) => removeItem('tasks', id)}
						empty={s.projects.length ? 'Nenhuma tarefa ainda.' : 'Crie um projeto primeiro.'}
					/>
				</Panel>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Projects />
		</Ready>
	)
}
