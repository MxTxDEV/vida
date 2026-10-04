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
		return <p className="font-display py-20 text-center text-[11px] text-muted-foreground">CARREGANDO…</p>
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
				<h1 className="font-display text-[16px] leading-snug text-primary">{title}</h1>
				{hint && <p className="mt-2 text-[16px] text-muted-foreground">{hint}</p>}
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
		<section className={`px-box px-notch p-4 sm:p-5 ${className}`}>
			{(title || meta) && (
				<header className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2 className="px-label">{title}</h2>
					{meta && <span className="text-[15px] text-muted-foreground">{meta}</span>}
				</header>
			)}
			{children}
		</section>
	)
}

export type Tone = 'blue' | 'ok' | 'err' | 'warn' | 'pink'

export const TONE_BG: Record<Tone, string> = {
	blue: 'bg-px-blue',
	ok: 'bg-px-green',
	err: 'bg-px-red',
	warn: 'bg-px-yellow',
	pink: 'bg-px-pink',
}

export const TONE_TEXT: Record<Tone, string> = {
	blue: 'text-px-blue',
	ok: 'text-px-green',
	err: 'text-px-red',
	warn: 'text-px-yellow',
	pink: 'text-px-pink',
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
			<p className="px-label truncate">{label}</p>
			<p className={`mt-2 truncate text-[26px] leading-none tabular-nums ${tone ? TONE_TEXT[tone] : ''}`}>
				{value}
			</p>
		</div>
	)
}

/** A segmented health bar. */
export function Bar({ pct, tone = 'blue' }: { pct: number; tone?: Tone }) {
	return (
		<span className="px-bar" role="presentation">
			<i
				className={TONE_BG[tone]}
				style={{ width: `${Math.round(Math.min(1, Math.max(0, pct)) * 100)}%` }}
			/>
		</span>
	)
}

export const field = 'px-input'
export const button = 'px-btn'
export const buttonPrimary = 'px-btn-primary'

/** Heatmap cell colours, from empty to busiest. */
export const HEAT = ['bg-foreground/10', 'bg-px-blue/30', 'bg-px-blue/50', 'bg-px-blue/75', 'bg-px-blue']
export const heatLevel = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4)

/** Stepped bar chart. `v2` draws a second bar beside the first. */
export function Bars({
	data,
	color = 'blue',
	color2 = 'err',
	height = 112,
	baseline = 'zero',
	format = num,
}: {
	data: { label: string; v: number; v2?: number; hi?: boolean }[]
	color?: Tone
	color2?: Tone
	height?: number
	baseline?: 'zero' | 'min'
	format?: (n: number) => string
}) {
	const all = data.flatMap((d) => (d.v2 === undefined ? [d.v] : [d.v, d.v2]))
	const max = Math.max(1, ...all)
	const min = baseline === 'min' ? Math.min(...all) : 0
	const px = (v: number) => {
		if (v <= 0 && baseline === 'zero') return 0
		const f = baseline === 'min' && max > min ? 0.2 + (0.8 * (v - min)) / (max - min) : v / max
		return Math.max(4, Math.round((f * height) / 4) * 4)
	}
	const empty = all.every((v) => v === 0)
	return (
		<div role="img" aria-label={data.map((d) => `${d.label}: ${format(d.v)}`).join(', ')}>
			<div className="flex items-end gap-2" style={{ height: height + 20 }}>
				{data.map((d) => (
					<div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
						{d.v2 === undefined && d.v > 0 && (
							<span className="text-[13px] leading-none text-muted-foreground tabular-nums">{format(d.v)}</span>
						)}
						<div className="flex w-full items-end justify-center gap-[3px]" style={{ height }}>
							<span
								title={`${d.label}: ${format(d.v)}`}
								className={`block w-full max-w-[28px] ${d.hi ? 'bg-primary' : TONE_BG[color]}`}
								style={{ height: px(d.v), alignSelf: 'flex-end' }}
							/>
							{d.v2 !== undefined && (
								<span
									title={`${d.label}: ${format(d.v2)}`}
									className={`block w-full max-w-[28px] ${TONE_BG[color2]}`}
									style={{ height: px(d.v2), alignSelf: 'flex-end' }}
								/>
							)}
						</div>
					</div>
				))}
			</div>
			<div className="mt-2 flex gap-2">
				{data.map((d) => (
					<span key={d.label} className="px-label min-w-0 flex-1 truncate text-center !text-[8px]">
						{d.label}
					</span>
				))}
			</div>
			{empty && <p className="mt-2 text-center text-[15px] text-muted-foreground">Ainda sem dados.</p>}
		</div>
	)
}
