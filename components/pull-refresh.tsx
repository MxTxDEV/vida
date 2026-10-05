'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

const THRESHOLD = 64
const MAX_PULL = 96

/** Pull the page down from the top (on a phone) to refresh it. */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<unknown> | unknown; children: ReactNode }) {
	const [pull, setPull] = useState(0)
	const [busy, setBusy] = useState(false)
	const refresh = useRef(onRefresh)
	const state = useRef({ startY: null as number | null, pull: 0, busy: false })

	useEffect(() => {
		refresh.current = onRefresh
	})

	useEffect(() => {
		const s = state.current
		const set = (v: number) => {
			s.pull = v
			setPull(v)
		}
		const start = (e: TouchEvent) => {
			s.startY = window.scrollY <= 0 && !s.busy && e.touches.length === 1 ? e.touches[0].clientY : null
		}
		const move = (e: TouchEvent) => {
			if (s.startY === null) return
			const dy = e.touches[0].clientY - s.startY
			if (dy <= 0 || window.scrollY > 0) return set(0)
			set(Math.min(MAX_PULL, dy * 0.5))
		}
		const end = async () => {
			const ready = s.startY !== null && s.pull >= THRESHOLD
			s.startY = null
			if (!ready) return set(0)
			s.busy = true
			setBusy(true)
			set(THRESHOLD)
			try {
				await refresh.current()
			} finally {
				s.busy = false
				setBusy(false)
				set(0)
			}
		}
		window.addEventListener('touchstart', start, { passive: true })
		window.addEventListener('touchmove', move, { passive: true })
		window.addEventListener('touchend', end)
		window.addEventListener('touchcancel', end)
		return () => {
			window.removeEventListener('touchstart', start)
			window.removeEventListener('touchmove', move)
			window.removeEventListener('touchend', end)
			window.removeEventListener('touchcancel', end)
		}
	}, [])

	const ready = pull >= THRESHOLD
	return (
		<>
			<div
				aria-hidden={pull === 0}
				role="status"
				className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex justify-center transition-transform duration-150"
				style={{ transform: `translateY(${pull - 48}px)`, opacity: pull > 8 ? 1 : 0 }}>
				<span className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] shadow-lg">
					<span
						className={`inline-block size-4 rounded-full border-2 border-primary border-t-transparent ${busy ? 'animate-spin' : ''}`}
						style={busy ? undefined : { transform: `rotate(${pull * 4}deg)` }}
					/>
					{busy ? 'Atualizando…' : ready ? 'Solte para atualizar' : 'Puxe para atualizar'}
				</span>
			</div>
			<div style={{ transform: pull ? `translateY(${pull * 0.35}px)` : undefined, transition: pull ? undefined : 'transform 0.2s' }}>{children}</div>
		</>
	)
}
