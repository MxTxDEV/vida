'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { AccountMenu } from './account'
import { Icon, RankBadge } from './badges'
import { levelInfo, rankFor, seasonRange, syncGame, xpBreakdown } from '@/lib/game'
import { exportData, importData, mutate, resetData, useApp } from '@/lib/store'
import { initSync } from '@/lib/sync'

const NAV = [
	{ href: '/', label: 'Painel', icon: 'painel' },
	{ href: '/diario', label: 'Diário', icon: 'diario' },
	{ href: '/financas', label: 'Finanças', icon: 'financas' },
	{ href: '/academia', label: 'Academia', icon: 'academia' },
	{ href: '/leitura', label: 'Leitura', icon: 'leitura' },
	{ href: '/projetos', label: 'Projetos', icon: 'projetos' },
	{ href: '/conteudo', label: 'Conteúdo', icon: 'conteudo' },
	{ href: '/metas', label: 'Metas', icon: 'metas' },
	{ href: '/opcoes', label: 'Opções', icon: 'opcoes' },
]

function DataMenu() {
	const file = useRef<HTMLInputElement>(null)
	const item = 'px-btn !justify-start !border-0 !min-h-9 w-full'
	return (
		<details className="relative">
			<summary className="px-btn cursor-pointer list-none">Dados</summary>
			<div className="px-box absolute right-0 z-30 mt-2 flex w-56 flex-col gap-1 p-2">
				<button
					className={item}
					onClick={() => {
						const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }))
						const a = document.createElement('a')
						a.href = url
						a.download = 'vida-backup.json'
						a.click()
						URL.revokeObjectURL(url)
					}}>
					Exportar backup
				</button>
				<button className={item} onClick={() => file.current?.click()}>
					Importar backup
				</button>
				<button
					className={`${item} text-px-red`}
					onClick={() => {
						if (window.confirm('Apagar TODOS os seus dados? Isso não pode ser desfeito.')) resetData()
					}}>
					Apagar tudo
				</button>
				<input
					ref={file}
					type="file"
					accept="application/json"
					hidden
					onChange={async (e) => {
						const f = e.target.files?.[0]
						e.target.value = ''
						if (!f) return
						try {
							importData(await f.text())
						} catch {
							window.alert('Arquivo de backup inválido.')
						}
					}}
				/>
			</div>
		</details>
	)
}

export function Shell({ children }: { children: ReactNode }) {
	const path = usePathname()
	const state = useApp()

	useEffect(() => {
		initSync()
	}, [])

	// Close finished goal periods and unlock achievements as data changes.
	useEffect(() => {
		if (state.ready) mutate((s) => syncGame(s))
	}, [state])

	const life = state.ready ? xpBreakdown(state).total : 0
	const monthXp = state.ready ? xpBreakdown(state, seasonRange()).total : 0
	const lv = levelInfo(life)
	const rank = rankFor(monthXp, state.settings.tiers)

	return (
		<div data-theme={state.settings.theme} className="min-h-screen w-full bg-background text-foreground">
			{/* Fixed layer: the grid and glow stay still while the page scrolls. */}
			<div aria-hidden="true" className="bg-grid pointer-events-none fixed inset-0 z-0" />
			<div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 py-6">
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-3">
						<span className="font-display text-[20px] font-semibold tracking-[0.25em]">VIDA</span>
						{state.ready && (
							<Link href="/metas" className="px-chip hover:brightness-125" title="Ranking do mês e nível vitalício">
								<RankBadge index={rank.index} size={2} />
								<span>
									{rank.rank.label} · Nv {lv.level} · {monthXp} XP
								</span>
							</Link>
						)}
					</div>
					<div className="flex items-center gap-2">
						<AccountMenu />
						<DataMenu />
					</div>
				</div>
				<nav aria-label="Seções" className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-2">
					{NAV.map((n) => {
						const active = n.href === '/' ? path === '/' : path.startsWith(n.href)
						return (
							<Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined} className="px-btn shrink-0">
								<Icon name={n.icon} />
								{n.label}
							</Link>
						)
					})}
				</nav>
				<main>{children}</main>
			</div>
		</div>
	)
}
