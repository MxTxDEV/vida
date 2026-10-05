'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Icon } from './badges'
import { refreshUnread, useUnread } from '@/lib/social'

/** The notification bell, with the number of unread items. */
export function Bell() {
	const unread = useUnread()
	useEffect(() => {
		void refreshUnread()
		const id = window.setInterval(() => document.visibilityState === 'visible' && void refreshUnread(), 30000)
		const onFocus = () => void refreshUnread()
		window.addEventListener('focus', onFocus)
		return () => {
			window.clearInterval(id)
			window.removeEventListener('focus', onFocus)
		}
	}, [])
	return (
		<Link href="/notificacoes" className="px-btn relative !px-2.5" aria-label={unread ? `${unread} notificações novas` : 'Notificações'}>
			<Icon name="sino" size={18} />
			{unread > 0 && (
				<span className="absolute -right-1.5 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-px-red px-1 text-[11px] font-semibold leading-[18px] text-white">
					{unread > 99 ? '99+' : unread}
				</span>
			)}
		</Link>
	)
}
