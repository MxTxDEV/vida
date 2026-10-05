'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PageHeader, Panel } from '@/components/bits'
import { PullToRefresh } from '@/components/pull-refresh'
import { Avatar } from '@/components/social-ui'
import { fetchFollowing, fetchNotices, markAllRead, needsSocial2, refreshUnread, setFollow, timeAgo, useMe, type Notice, type Profile } from '@/lib/social'

const TEXT: Record<Notice['type'], string> = {
	follow: 'começou a seguir você',
	like: 'curtiu sua publicação',
	comment: 'comentou na sua publicação',
}

function List({ me }: { me: Profile }) {
	const [notices, setNotices] = useState<Notice[] | null>(null)
	const [following, setFollowing] = useState<Set<string>>(new Set())
	const [error, setError] = useState('')

	const load = useCallback(async () => {
		const [r, f] = await Promise.all([fetchNotices(), fetchFollowing(me.id)])
		setNotices(r.notices)
		setError(r.error)
		setFollowing(new Set(f))
		// Show what was new, then clear the bell.
		if (r.notices.some((n) => !n.read)) {
			await markAllRead()
			await refreshUnread()
		}
	}, [me.id])

	useEffect(() => {
		let on = true
		// Defer so state is set from a callback, not synchronously in the effect.
		Promise.resolve().then(() => {
			if (on) void load()
		})
		return () => {
			on = false
		}
	}, [load])

	return (
		<PullToRefresh onRefresh={load}>
			<PageHeader title="Notificações" hint="Novos seguidores, curtidas e comentários. Puxe a tela para atualizar." />
			<Panel>
				{error && (needsSocial2(error) ? <p className="text-[14px] text-px-yellow">Falta rodar o arquivo supabase/social2.sql no Supabase para ativar as notificações.</p> : <p className="text-[14px] text-px-red">{error}</p>)}
				{!notices && !error && <p className="text-[14px] text-muted-foreground">Carregando…</p>}
				{notices?.length === 0 && <p className="py-6 text-center text-[14px] text-muted-foreground">Nada por aqui ainda. Quando alguém seguir ou interagir com você, aparece aqui.</p>}
				<ul className="-mx-2 grid">
					{notices?.map((n) =>
						n.actor ? (
							<li key={n.id} className={`flex items-center gap-3 rounded-xl px-2 py-3 ${n.read ? '' : 'bg-[var(--accent-soft)]'}`}>
								<Avatar emoji={n.actor.avatar} color={n.actor.color} path={n.actor.avatar_path} size={40} />
								<div className="min-w-0 flex-1 text-[14px]">
									<p>
										<Link href={`/u/${n.actor.username}`} className="font-medium hover:text-primary">{n.actor.display_name || n.actor.username}</Link>{' '}
										<span className="text-muted-foreground">{TEXT[n.type]}</span>
									</p>
									{n.post?.body && <p className="truncate text-[13px] text-muted-foreground">“{n.post.body}”</p>}
									{n.post && !n.post.body && <p className="text-[13px] text-muted-foreground">📷 foto</p>}
									<p className="text-[12px] text-muted-foreground">{timeAgo(n.created_at)}</p>
								</div>
								{n.type === 'follow' &&
									(following.has(n.actor.id) ? (
										<span className="text-[13px] text-muted-foreground">Seguindo ✓</span>
									) : (
										<button
											className="px-btn-primary !min-h-8 !px-3 text-[13px]"
											onClick={async () => {
												if (await setFollow(n.actor!.id, true)) return window.alert('Não foi possível seguir agora.')
												setFollowing((s) => new Set(s).add(n.actor!.id))
											}}>
											Seguir de volta
										</button>
									))}
							</li>
						) : null,
					)}
				</ul>
			</Panel>
		</PullToRefresh>
	)
}

export default function Page() {
	const { profile } = useMe()
	return profile ? <List me={profile} /> : null
}
