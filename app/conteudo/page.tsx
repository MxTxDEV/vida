'use client'

import { PageHeader, Panel, Ready, Stat } from '@/components/bits'
import { Sheet, type Col } from '@/components/sheet'
import { addDays, inRange, monthEnd, monthStart, today, weekStart } from '@/lib/dates'
import { addItem, removeItem, updateItem, useApp } from '@/lib/store'
import type { Post } from '@/lib/types'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'X / Twitter', 'LinkedIn', 'Blog', 'Outro'].map((v) => ({ value: v, label: v }))
const STATUS = ['Ideia', 'Produzindo', 'Postado'].map((v) => ({ value: v, label: v }))

const COLS: Col<Post>[] = [
	{ key: 'date', label: 'Data', type: 'date', w: '140px' },
	{ key: 'platform', label: 'Plataforma', type: 'select', w: '140px', options: PLATFORMS },
	{ key: 'title', label: 'Título / ideia', type: 'text', w: 'minmax(220px,1fr)', placeholder: 'Sobre o que é' },
	{ key: 'status', label: 'Status', type: 'select', w: '130px', options: STATUS },
]

function Content() {
	const s = useApp()
	const now = today()
	const wk = { from: weekStart(now), to: addDays(weekStart(now), 6) }
	const mo = { from: monthStart(now), to: monthEnd(now) }
	const posted = s.posts.filter((p) => p.status === 'Postado')
	const rank = { Produzindo: 0, Ideia: 1, Postado: 2 } as const
	const rows = [...s.posts].sort((a, b) => rank[a.status] - rank[b.status] || b.date.localeCompare(a.date))

	return (
		<>
			<PageHeader title="Conteúdo" hint="Do rascunho à publicação. Só conta como post quando o status é “Postado”." />
			<div className="grid gap-4">
				<Panel>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<Stat label="Postados na semana" value={posted.filter((p) => inRange(p.date, wk)).length} />
						<Stat label="Postados no mês" value={posted.filter((p) => inRange(p.date, mo)).length} />
						<Stat label="Em produção" value={s.posts.filter((p) => p.status === 'Produzindo').length} />
						<Stat label="Ideias na fila" value={s.posts.filter((p) => p.status === 'Ideia').length} />
					</div>
				</Panel>
				<Panel title="Pipeline de conteúdo">
					<Sheet<Post>
						cols={COLS}
						rows={rows}
						blank={() => ({ date: today(), platform: 'Instagram', title: '', status: 'Ideia' })}
						canAdd={(d) => d.title.trim() !== '' && d.date !== ''}
						onAdd={(d) => addItem('posts', { ...d, title: d.title.trim() })}
						onUpdate={(id, p) => updateItem('posts', id, p)}
						onRemove={(id) => removeItem('posts', id)}
						empty="Anote sua primeira ideia de conteúdo."
					/>
				</Panel>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Content />
		</Ready>
	)
}
