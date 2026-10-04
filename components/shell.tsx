'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { button } from './bits'
import { levelInfo, syncGame, xpBreakdown } from '@/lib/game'
import { exportData, importData, mutate, resetData, useApp } from '@/lib/store'

/**
 * The palette from the original dashboard, so every page looks the same in
 * any host theme. Light by default, dark when the system asks for it.
 */
const PALETTE = [
	'[--background:#ffffff] [--color-background:#ffffff] [--foreground:#09090b] [--color-foreground:#09090b] [--card:#ffffff] [--color-card:#ffffff] [--card-foreground:#09090b] [--color-card-foreground:#09090b] [--muted-foreground:#71717a] [--color-muted-foreground:#71717a] [--border:#e4e4e7] [--color-border:#e4e4e7] [--ring:#18181b] [--color-ring:#18181b]',
	'dark:[--background:#0a0a0b] dark:[--color-background:#0a0a0b] dark:[--foreground:#fafafa] dark:[--color-foreground:#fafafa] dark:[--card:#141417] dark:[--color-card:#141417] dark:[--card-foreground:#fafafa] dark:[--color-card-foreground:#fafafa] dark:[--muted-foreground:#a1a1aa] dark:[--color-muted-foreground:#a1a1aa] dark:[--border:#27272a] dark:[--color-border:#27272a] dark:[--ring:#d4d4d8] dark:[--color-ring:#d4d4d8]',
].join(' ')

const NAV = [
	{ href: '/', label: 'Painel' },
	{ href: '/diario', label: 'Diário' },
	{ href: '/financas', label: 'Finanças' },
	{ href: '/academia', label: 'Academia' },
	{ href: '/leitura', label: 'Leitura' },
	{ href: '/projetos', label: 'Projetos' },
	{ href: '/conteudo', label: 'Conteúdo' },
	{ href: '/metas', label: 'Metas' },
]

function DataMenu() {
	const file = useRef<HTMLInputElement>(null)
	return (
		<details className="relative">
			<summary className={`${button} cursor-pointer list-none`}>Dados</summary>
			<div className="absolute right-0 z-30 mt-2 flex w-52 flex-col gap-1 rounded-xl bg-card p-2 text-[13px] shadow-lg ring-1 ring-border">
				<button
					className="rounded-md px-2 py-1.5 text-left hover:bg-foreground/5"
					onClick={() => {
						const url = URL.createObjectURL(
							new Blob([exportData()], { type: 'application/json' }),
						)
						const a = document.createElement('a')
						a.href = url
						a.download = 'vida-backup.json'
						a.click()
						URL.revokeObjectURL(url)
					}}>
					Exportar backup
				</button>
				<button
					className="rounded-md px-2 py-1.5 text-left hover:bg-foreground/5"
					onClick={() => file.current?.click()}>
					Importar backup
				</button>
				<button
					className="rounded-md px-2 py-1.5 text-left text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
					onClick={() => {
						if (window.confirm('Apagar TODOS os seus dados? Isso não pode ser desfeito.'))
							resetData()
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

	// Close finished goal periods and unlock achievements as data changes.
	useEffect(() => {
		if (state.ready) mutate((s) => syncGame(s))
	}, [state])

	const xp = state.ready ? xpBreakdown(state).total : 0
	const lv = levelInfo(xp)

	return (
		<div
			className={`min-h-screen w-full bg-background text-foreground antialiased ${PALETTE}`}
			style={{ fontFamily: "var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
			<div className="mx-auto w-full max-w-[1180px] px-4 py-6">
				<div className="mb-8 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<span className="text-[15px] tracking-[0.2em]">VIDA</span>
						{state.ready && (
							<Link
								href="/metas"
								className="rounded-full px-2.5 py-1 text-[12px] text-muted-foreground ring-1 ring-border transition hover:text-foreground">
								Nv {lv.level} · {lv.title} · {xp} XP
							</Link>
						)}
					</div>
					<DataMenu />
				</div>
				<nav aria-label="Seções" className="-mx-1 mb-8 flex gap-1 overflow-x-auto px-1 pb-1">
					{NAV.map((n) => {
						const active = n.href === '/' ? path === '/' : path.startsWith(n.href)
						return (
							<Link
								key={n.href}
								href={n.href}
								aria-current={active ? 'page' : undefined}
								className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition ${
									active
										? 'bg-foreground text-background'
										: 'text-muted-foreground ring-1 ring-border hover:text-foreground'
								}`}>
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
