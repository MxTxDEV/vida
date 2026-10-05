'use client'

import { useEffect, type RefObject } from 'react'

/** Closes a <details> popover when you tap outside it or press Escape. */
export function useDismiss(ref: RefObject<HTMLDetailsElement | null>) {
	useEffect(() => {
		const close = () => {
			if (ref.current?.open) ref.current.open = false
		}
		const onPointer = (e: PointerEvent) => {
			if (ref.current?.open && !ref.current.contains(e.target as Node)) close()
		}
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
		document.addEventListener('pointerdown', onPointer)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('pointerdown', onPointer)
			document.removeEventListener('keydown', onKey)
		}
	}, [ref])
}
