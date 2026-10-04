'use client'

import { useState } from 'react'
import { Bar, Bars, PageHeader, Panel, Ready, Stat, brl, field } from '@/components/bits'
import { Sheet, type Col } from '@/components/sheet'
import { monthEnd, today } from '@/lib/dates'
import { lastMonths, monthLabel } from '@/lib/periods'
import { addItem, removeItem, updateItem, useApp } from '@/lib/store'
import type { Tx } from '@/lib/types'

const cols = (cats: string[]): Col<Tx>[] => [
	{ key: 'date', label: 'Data', type: 'date', w: '150px' },
	{ key: 'type', label: 'Tipo', type: 'select', w: '120px', options: [{ value: 'gasto', label: 'Gasto' }, { value: 'receita', label: 'Receita' }] },
	{ key: 'category', label: 'Categoria', type: 'select', w: '150px', options: cats.map((c) => ({ value: c, label: c })) },
	{ key: 'desc', label: 'Descrição', type: 'text', w: 'minmax(160px,1fr)', placeholder: 'Ex.: Mercado' },
	{ key: 'amount', label: 'Valor (R$)', type: 'number', w: '120px', placeholder: '0,00' },
]

function Finance() {
	const s = useApp()
	const [month, setMonth] = useState(today().slice(0, 7))
	const from = `${month}-01`
	const to = monthEnd(from)
	const rows = s.txs
		.filter((t) => t.date >= from && t.date <= to)
		.sort((a, b) => b.date.localeCompare(a.date))
	const inc = rows.filter((t) => t.type === 'receita').reduce((n, t) => n + t.amount, 0)
	const out = rows.filter((t) => t.type === 'gasto').reduce((n, t) => n + t.amount, 0)
	const byCat = new Map<string, number>()
	rows.filter((t) => t.type === 'gasto').forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount))
	const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1])
	const budget = s.goals.find((g) => g.active && g.metric === 'expenses')

	const months = lastMonths(6).map((m) => {
		const t = s.txs.filter((x) => x.date.startsWith(m.slice(0, 7)))
		return {
			label: monthLabel(m),
			v: t.filter((x) => x.type === 'receita').reduce((n, x) => n + x.amount, 0),
			v2: t.filter((x) => x.type === 'gasto').reduce((n, x) => n + x.amount, 0),
		}
	})

	return (
		<>
			<PageHeader title="Finanças" hint="Sua planilha: clique em qualquer célula para editar.">
				<input
					type="month"
					value={month}
					onChange={(e) => e.target.value && setMonth(e.target.value)}
					aria-label="Mês"
					className={field}
				/>
			</PageHeader>
			<div className="grid gap-4">
				<Panel>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<Stat label="Receitas" value={brl(inc)} tone="ok" />
						<Stat label="Gastos" value={brl(out)} tone={budget && out > budget.target ? 'err' : undefined} />
						<Stat label="Saldo" value={brl(inc - out)} tone={inc - out >= 0 ? 'ok' : 'err'} />
						<Stat label="Taxa de poupança" value={inc > 0 ? `${Math.round(((inc - out) / inc) * 100)}%` : '—'} />
					</div>
					{budget && (
						<div className="mt-4 space-y-1.5">
							<p className="text-[12px] text-muted-foreground">
								Teto de gastos do mês: {brl(out)} de {brl(budget.target)}
							</p>
							<Bar pct={out / budget.target} tone={out > budget.target ? 'err' : out / budget.target > 0.8 ? 'warn' : 'blue'} />
						</div>
					)}
				</Panel>
				<Panel title="Evolução: receitas × gastos" meta="últimos 6 meses">
					<Bars data={months} color="ok" color2="err" format={brl} />
					<p className="mt-3 text-[13px] text-muted-foreground">
						<span className="text-px-green">■</span> receitas &nbsp; <span className="text-px-red">■</span> gastos
					</p>
				</Panel>
				{cats.length > 0 && (
					<Panel title="Gastos por categoria">
						<ul className="space-y-2.5">
							{cats.map(([c, v]) => (
								<li key={c} className="grid grid-cols-[110px_1fr_110px] items-center gap-3 text-[14px]">
									<span className="truncate">{c}</span>
									<Bar pct={v / cats[0][1]} />
									<span className="text-right text-muted-foreground tabular-nums">{brl(v)}</span>
								</li>
							))}
						</ul>
					</Panel>
				)}
				<Panel title="Lançamentos">
					<Sheet<Tx>
						cols={cols(s.settings.financeCategories)}
						rows={rows}
						blank={() => ({ date: today(), type: 'gasto', category: s.settings.financeCategories[0] ?? 'Outros', desc: '', amount: 0 })}
						canAdd={(d) => Number(d.amount) > 0 && d.date !== ''}
						onAdd={(d) => addItem('txs', d)}
						onUpdate={(id, p) => updateItem('txs', id, p)}
						onRemove={(id) => removeItem('txs', id)}
						onDuplicate={(r) => addItem('txs', { date: today(), type: r.type, category: r.category, desc: r.desc, amount: r.amount })}
						empty="Nenhum lançamento neste mês."
					/>
				</Panel>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Finance />
		</Ready>
	)
}
