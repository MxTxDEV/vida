'use client'

import { Bar, PageHeader, Panel, Ready, Stat, num } from '@/components/bits'
import { Sheet, type Col } from '@/components/sheet'
import { addDays, inRange, today, weekStart } from '@/lib/dates'
import { addItem, removeItem, updateItem, useApp } from '@/lib/store'
import type { Book, Reading } from '@/lib/types'

const STATUS = ['Quero ler', 'Lendo', 'Terminado'].map((v) => ({ value: v, label: v }))

const BOOK_COLS: Col<Book>[] = [
	{ key: 'title', label: 'Livro', type: 'text', w: 'minmax(200px,1fr)', placeholder: 'Título' },
	{ key: 'total', label: 'Páginas', type: 'number', w: '100px', placeholder: '300' },
	{ key: 'status', label: 'Status', type: 'select', w: '130px', options: STATUS },
]

function Reading() {
	const s = useApp()
	const now = today()
	const wk = { from: weekStart(now), to: addDays(weekStart(now), 6) }
	const week = s.readings.filter((r) => inRange(r.date, wk)).reduce((n, r) => n + r.pages, 0)
	const total = s.readings.reduce((n, r) => n + r.pages, 0)
	const done = s.books.filter((b) => b.status === 'Terminado').length
	const bookOpts = s.books.map((b) => ({ value: b.id, label: b.title || '(sem título)' }))
	const rows = [...s.readings].sort((a, b) => b.date.localeCompare(a.date))
	const read = (id: string) => s.readings.filter((r) => r.bookId === id).reduce((n, r) => n + r.pages, 0)

	const cols: Col<Reading>[] = [
		{ key: 'date', label: 'Data', type: 'date', w: '140px' },
		{ key: 'bookId', label: 'Livro', type: 'select', w: 'minmax(200px,1fr)', options: bookOpts, placeholder: '— escolha —' },
		{ key: 'pages', label: 'Páginas lidas', type: 'number', w: '120px', placeholder: '20' },
	]

	return (
		<>
			<PageHeader title="Leitura" hint="Cadastre seus livros e anote quantas páginas leu em cada dia." />
			<div className="grid gap-4">
				<Panel>
					<div className="grid grid-cols-3 gap-4">
						<Stat label="Páginas na semana" value={num(week)} />
						<Stat label="Páginas no total" value={num(total)} />
						<Stat label="Livros terminados" value={done} />
					</div>
				</Panel>
				<Panel title="Livros">
					<Sheet<Book>
						cols={BOOK_COLS}
						rows={s.books}
						blank={() => ({ title: '', total: 0, status: 'Lendo' })}
						canAdd={(d) => d.title.trim() !== ''}
						onAdd={(d) => addItem('books', { ...d, title: d.title.trim() })}
						onUpdate={(id, p) => updateItem('books', id, p)}
						onRemove={(id) => {
							removeItem('books', id)
							s.readings.filter((r) => r.bookId === id).forEach((r) => removeItem('readings', r.id))
						}}
						empty="Cadastre o primeiro livro."
					/>
					{s.books.some((b) => b.total > 0) && (
						<ul className="mt-4 space-y-2.5 border-t border-border pt-4">
							{s.books.filter((b) => b.total > 0).map((b) => (
								<li key={b.id} className="grid grid-cols-[minmax(0,1fr)_1fr_90px] items-center gap-3 text-[13px]">
									<span className="truncate">{b.title}</span>
									<Bar pct={b.status === 'Terminado' ? 1 : read(b.id) / b.total} tone={b.status === 'Terminado' ? 'ok' : 'blue'} />
									<span className="text-right text-muted-foreground tabular-nums">{Math.min(read(b.id), b.total)}/{b.total}</span>
								</li>
							))}
						</ul>
					)}
				</Panel>
				<Panel title="Sessões de leitura">
					<Sheet<Reading>
						cols={cols}
						rows={rows}
						blank={() => ({ date: today(), bookId: '', pages: 0 })}
						canAdd={(d) => d.bookId !== '' && Number(d.pages) > 0}
						onAdd={(d) => addItem('readings', d)}
						onUpdate={(id, p) => updateItem('readings', id, p)}
						onRemove={(id) => removeItem('readings', id)}
						empty={s.books.length ? 'Nenhuma sessão registrada.' : 'Cadastre um livro primeiro.'}
					/>
				</Panel>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Reading />
		</Ready>
	)
}
