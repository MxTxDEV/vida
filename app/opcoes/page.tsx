'use client'

import { useState } from 'react'
import { PageHeader, Panel, Ready } from '@/components/bits'
import { RankBadge } from '@/components/pixel'
import { defaultSettings, THEMES } from '@/lib/settings'
import { mutate, useApp } from '@/lib/store'
import type { Settings } from '@/lib/types'
import { WIDGETS } from '@/lib/widgets'

const save = (patch: Partial<Settings>) =>
	mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }))

const SWATCH: Record<Settings['theme'], string[]> = {
	noite: ['#120c2e', '#1d1548', '#6b5fe0', '#ffd84a', '#4cc9f0'],
	gameboy: ['#9bbc0f', '#8bac0f', '#306230', '#0f380f', '#1d5a78'],
	arcade: ['#000000', '#0a0a16', '#00f0ff', '#ff2bd6', '#39ff14'],
}

/** A list of names you can add to and remove from. */
function ListEditor({ title, hint, items, onChange }: { title: string; hint: string; items: string[]; onChange: (v: string[]) => void }) {
	const [text, setText] = useState('')
	const add = () => {
		const t = text.trim()
		if (!t || items.includes(t)) return
		onChange([...items, t])
		setText('')
	}
	return (
		<Panel title={title}>
			<p className="mb-3 text-[15px] text-muted-foreground">{hint}</p>
			<ul className="mb-3 flex flex-wrap gap-2">
				{items.map((it) => (
					<li key={it} className="px-chip">
						{it}
						<button
							aria-label={`Remover ${it}`}
							className="text-px-red"
							onClick={() => items.length > 1 && onChange(items.filter((x) => x !== it))}>
							×
						</button>
					</li>
				))}
			</ul>
			<form
				className="flex gap-2"
				onSubmit={(e) => {
					e.preventDefault()
					add()
				}}>
				<input className="px-input min-w-0 flex-1" placeholder="Novo item" value={text} onChange={(e) => setText(e.target.value)} />
				<button type="submit" className="px-btn-primary" disabled={!text.trim()}>Adicionar</button>
			</form>
		</Panel>
	)
}

function NumberField({ label, value, onSave, suffix }: { label: string; value: number; onSave: (n: number) => void; suffix?: string }) {
	return (
		<label className="flex items-center justify-between gap-3 text-[16px]">
			<span>{label}</span>
			<span className="flex items-center gap-2">
				<input
					key={value}
					defaultValue={value}
					inputMode="decimal"
					aria-label={label}
					onBlur={(e) => {
						const n = Number(e.target.value.replace(',', '.'))
						if (Number.isFinite(n) && n >= 0 && n !== value) onSave(n)
						else e.target.value = String(value)
					}}
					onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
					className="px-input w-24 text-right tabular-nums"
				/>
				{suffix && <span className="w-12 text-[14px] text-muted-foreground">{suffix}</span>}
			</span>
		</label>
	)
}

function Options() {
	const { settings: st } = useApp()
	const def = defaultSettings()
	const xp = st.xp
	const setXp = (k: keyof Settings['xp'], n: number) => save({ xp: { ...xp, [k]: k === 'pagesPerXp' ? Math.max(1, n) : n } })
	const setTier = (i: number, n: number) => {
		const tiers = [...st.tiers]
		tiers[i] = n
		// Keep the thresholds in rising order.
		save({ tiers: tiers.map((v, k) => (k > 0 ? Math.max(v, tiers[k - 1] + 1) : Math.max(1, v))) })
	}
	const ranks = ['Prata', 'Ouro', 'Platina', 'Diamante']

	return (
		<>
			<PageHeader title="Opções" hint="Ajuste o app do seu jeito. Tudo é salvo e sincronizado." />
			<div className="grid gap-4">
				<Panel title="Aparência">
					<ul className="grid gap-3 sm:grid-cols-3">
						{THEMES.map((t) => (
							<li key={t.id}>
								<button
									onClick={() => save({ theme: t.id })}
									aria-pressed={st.theme === t.id}
									className={`px-box w-full p-3 text-left ${st.theme === t.id ? '!border-primary' : ''}`}>
									<span className="mb-2 flex">
										{SWATCH[t.id].map((c) => (
											<span key={c} className="h-6 flex-1" style={{ background: c }} />
										))}
									</span>
									<span className="text-[17px]">{t.label}{st.theme === t.id ? ' ✓' : ''}</span>
								</button>
							</li>
						))}
					</ul>
				</Panel>

				<Panel title="Blocos do painel" meta={<button className="px-btn" onClick={() => mutate((s) => ({ ...s, layout: [] }))}>Restaurar ordem</button>}>
					<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{WIDGETS.map((w) => {
							const on = !st.hiddenWidgets.includes(w.id)
							return (
								<li key={w.id}>
									<label className="flex cursor-pointer items-center gap-3 text-[17px]">
										<input
											type="checkbox"
											checked={on}
											className="size-5 accent-[var(--primary)]"
											onChange={() => save({ hiddenWidgets: on ? [...st.hiddenWidgets, w.id] : st.hiddenWidgets.filter((x) => x !== w.id) })}
										/>
										{w.label}
									</label>
								</li>
							)
						})}
					</ul>
				</Panel>

				<div className="grid gap-4 lg:grid-cols-2">
					<Panel title="Pontos por ação (XP)" meta={<button className="px-btn" onClick={() => save({ xp: def.xp })}>Padrão</button>}>
						<div className="grid gap-3">
							<NumberField label="Anotação no diário (até 3/dia)" value={xp.diary} onSave={(n) => setXp('diary', n)} suffix="XP" />
							<NumberField label="Lançamento financeiro (até 3/dia)" value={xp.tx} onSave={(n) => setXp('tx', n)} suffix="XP" />
							<NumberField label="Treino" value={xp.workout} onSave={(n) => setXp('workout', n)} suffix="XP" />
							<NumberField label="Páginas para 1 XP" value={xp.pagesPerXp} onSave={(n) => setXp('pagesPerXp', n)} suffix="págs" />
							<NumberField label="Tarefa concluída" value={xp.task} onSave={(n) => setXp('task', n)} suffix="XP" />
							<NumberField label="Conteúdo postado" value={xp.post} onSave={(n) => setXp('post', n)} suffix="XP" />
							<NumberField label="Bônus de 3 missões no dia" value={xp.quest} onSave={(n) => setXp('quest', n)} suffix="XP" />
						</div>
					</Panel>

					<Panel title="Faixas do ranking mensal" meta={<button className="px-btn" onClick={() => save({ tiers: def.tiers })}>Padrão</button>}>
						<p className="mb-3 text-[15px] text-muted-foreground">XP no mês para entrar em cada rank. Bronze começa em 0.</p>
						<div className="grid gap-3">
							{ranks.map((name, i) => (
								<div key={name} className="flex items-center gap-3">
									<RankBadge index={i + 1} size={2} />
									<div className="flex-1">
										<NumberField label={name} value={st.tiers[i]} onSave={(n) => setTier(i, n)} suffix="XP" />
									</div>
								</div>
							))}
						</div>
					</Panel>
				</div>

				<ListEditor
					title="Categorias de finanças"
					hint="Aparecem na planilha de gastos e receitas."
					items={st.financeCategories}
					onChange={(v) => save({ financeCategories: v })}
				/>
				<div className="grid gap-4 lg:grid-cols-2">
					<ListEditor title="Tipos de treino" hint="Opções da aba Academia." items={st.workoutGroups} onChange={(v) => save({ workoutGroups: v })} />
					<ListEditor title="Plataformas de conteúdo" hint="Opções da aba Conteúdo." items={st.platforms} onChange={(v) => save({ platforms: v })} />
				</div>
			</div>
		</>
	)
}

export default function Page() {
	return (
		<Ready>
			<Options />
		</Ready>
	)
}
