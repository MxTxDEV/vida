'use client'

import { useState } from 'react'
import { PageHeader, Panel, Ready } from '@/components/bits'
import { RankBadge } from '@/components/badges'
import { xpForLevel } from '@/lib/game'
import { LIMITS_TEXT, RULES } from '@/lib/rules'
import { THEMES } from '@/lib/settings'
import { mutate, useApp } from '@/lib/store'
import type { Settings } from '@/lib/types'
import { WIDGETS } from '@/lib/widgets'

const save = (patch: Partial<Settings>) =>
	mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }))

const RULE_ROWS: [string, string][] = [
	[`Diário (até ${RULES.diary.perDay} por dia)`, `${RULES.diary.xp} XP cada`],
	[`Lançamento financeiro (até ${RULES.tx.perDay} por dia)`, `${RULES.tx.xp} XP cada`],
	['Treino (1 por dia, mínimo 20 min)', `${RULES.workout.xp} XP`],
	[`Leitura (até ${RULES.reading.maxXpPerDay} XP por dia)`, `1 XP a cada ${RULES.reading.pagesPerXp} págs`],
	[`Tarefa concluída (até ${RULES.task.perDay} por dia)`, `${RULES.task.xp} XP cada`],
	[`Conteúdo postado (até ${RULES.post.perDay} por dia)`, `${RULES.post.xp} XP cada`],
	[`Bônus de ${RULES.quest.min} missões no dia`, `${RULES.quest.bonus} XP`],
	['Meta ganha (máx. por meta / por mês)', `${RULES.goals.maxXpPerGoal} / ${RULES.goals.maxXpPerMonth} XP`],
	['Máximo possível por dia', `${RULES.maxDaily} XP`],
]

const SWATCH: Record<Settings['theme'], string[]> = {
	escuro: ['#0a0c11', '#11141b', '#232937', '#8ab4ff', '#34d399'],
	claro: ['#f4f6fa', '#ffffff', '#dde2ec', '#2f5bea', '#059669'],
	aurora: ['#050f14', '#0a1a22', '#173540', '#2dd4bf', '#4ade80'],
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
			<p className="mb-3 text-[13px] text-muted-foreground">{hint}</p>
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

function Options() {
	const { settings: st } = useApp()

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
											<span key={c} className="h-6 flex-1 first:rounded-l-md last:rounded-r-md" style={{ background: c }} />
										))}
									</span>
									<span className="text-[15px]">{t.label}{st.theme === t.id ? ' ✓' : ''}</span>
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
									<label className="flex cursor-pointer items-center gap-3 text-[15px]">
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

				<Panel title="Regras oficiais" meta="iguais para todos, não editáveis">
					<p className="mb-4 text-[14px] text-muted-foreground">
						Os pontos e o ranking valem para a comunidade inteira, por isso não dá para mudar. Cada ação tem um limite por dia, e o servidor confere os números enviados.
					</p>
					<div className="grid gap-6 lg:grid-cols-2">
						<ul className="grid gap-2 text-[14px]">
							{RULE_ROWS.map(([label, value]) => (
								<li key={label} className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
									<span>{label}</span>
									<span className="text-right text-muted-foreground tabular-nums">{value}</span>
								</li>
							))}
						</ul>
						<div className="grid content-start gap-5">
							<div>
								<p className="px-label mb-2">Faixas do ranking mensal (XP no mês)</p>
								<ul className="grid gap-2">
									{['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'].map((name, i) => (
										<li key={name} className="flex items-center gap-3 text-[14px]">
											<RankBadge index={i} size={1.6} />
											<span className="flex-1">{name}</span>
											<span className="text-muted-foreground tabular-nums">{i === 0 ? '0' : `${RULES.tiers[i - 1]}+`} XP</span>
										</li>
									))}
								</ul>
							</div>
							<div>
								<p className="px-label mb-2">Nível (XP de toda a vida)</p>
								<p className="text-[14px] text-muted-foreground">
									Nível 10 com {xpForLevel(10).toLocaleString('pt-BR')} XP, nível 20 com {xpForLevel(20).toLocaleString('pt-BR')} e o máximo (nível {RULES.level.max}) com {xpForLevel(RULES.level.max).toLocaleString('pt-BR')}. Conquistas contam só para o nível, nunca para o ranking do mês.
								</p>
							</div>
							<div>
								<p className="px-label mb-2">Limites da comunidade</p>
								<ul className="grid gap-1 text-[14px] text-muted-foreground">
									{LIMITS_TEXT.map((t) => <li key={t}>• {t}</li>)}
								</ul>
							</div>
						</div>
					</div>
				</Panel>

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
