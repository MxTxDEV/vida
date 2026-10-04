'use client'

import type { ReactNode } from 'react'
import { useApp } from '@/lib/store'

export const brl = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (n: number) => n.toLocaleString('pt-BR')

/** Renders children only once saved data has been read from the browser. */
export function Ready({ children }: { children: ReactNode }) {
	const { ready } = useApp()
	if (!ready)
		return <p className="py-20 text-center text-[13px] text-muted-foreground">Carregando…</p>
	return <>{children}</>
}

export function PageHeader({
	title,
	hint,
	children,
}: {
	title: string
	hint?: string
	children?: ReactNode
}) {
	return (
		<header className="mb-6 flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 className="text-[22px] leading-tight tracking-tight">{title}</h1>
				{hint && <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>}
			</div>
			{children}
		</header>
	)
}

export function Panel({
	title,
	meta,
	children,
	className = '',
}: {
	title?: string
	meta?: ReactNode
	children: ReactNode
	className?: string
}) {
	return (
		<section className={`rounded-[24px] bg-card p-4 ring-1 ring-border ring-inset sm:p-5 ${className}`}>
			{(title || meta) && (
				<header className="mb-4 flex items-center justify-between gap-3 text-[12px] tracking-[0.1em] text-muted-foreground uppercase">
					<h2>{title}</h2>
					{meta && <span className="tracking-normal normal-case">{meta}</span>}
				</header>
			)}
			{children}
		</section>
	)
}

export function Stat({
	label,
	value,
	tone,
}: {
	label: string
	value: ReactNode
	tone?: 'ok' | 'err'
}) {
	return (
		<div className="min-w-0">
			<p className="truncate text-[12px] text-muted-foreground">{label}</p>
			<p
				className={`mt-1 truncate text-[22px] leading-none tabular-nums ${
					tone === 'ok'
						? 'text-emerald-600 dark:text-emerald-400'
						: tone === 'err'
							? 'text-rose-600 dark:text-rose-400'
							: ''
				}`}>
				{value}
			</p>
		</div>
	)
}

export function Bar({
	pct,
	tone = 'blue',
}: {
	pct: number
	tone?: 'blue' | 'ok' | 'err' | 'warn'
}) {
	const color = {
		blue: 'bg-blue-500 dark:bg-blue-400',
		ok: 'bg-emerald-500',
		err: 'bg-rose-500',
		warn: 'bg-amber-500',
	}[tone]
	return (
		<span className="block h-[5px] overflow-hidden rounded-full bg-foreground/10">
			<span
				className={`block h-full rounded-full transition-[width] duration-500 ${color}`}
				style={{ width: `${Math.round(Math.min(1, Math.max(0, pct)) * 100)}%` }}
			/>
		</span>
	)
}

export const field =
	'h-8 min-w-0 rounded-md bg-transparent px-2 text-[13px] text-foreground outline-none ring-1 ring-border transition placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring [color-scheme:light] dark:[color-scheme:dark]'

export const button =
	'inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] ring-1 ring-border transition hover:bg-foreground/5 disabled:opacity-40'

export const buttonPrimary =
	'inline-flex h-8 items-center justify-center rounded-md bg-foreground px-3 text-[13px] text-background transition hover:opacity-85 disabled:opacity-40'

/** Heatmap cell colours, from empty to busiest. */
export const HEAT = [
	'bg-foreground/[0.06]',
	'bg-blue-500/25',
	'bg-blue-500/45',
	'bg-blue-500/70',
	'bg-blue-500 dark:bg-blue-400',
]
export const heatLevel = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4)
