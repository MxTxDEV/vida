'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RankBadge } from '@/components/badges'
import { PageHeader, Panel, Stat, num } from '@/components/bits'
import { Avatar, PostCard } from '@/components/social-ui'
import { RANKS } from '@/lib/game'
import { fetchPosts, fetchProfileView, isStaff, ROLE_LABEL, setFollow, useMe, type Post, type Profile, type ProfileView } from '@/lib/social'
import { today } from '@/lib/dates'

function Posts({ me, userId }: { me: Profile; userId: string }) {
	const [posts, setPosts] = useState<Post[] | null>(null)
	useEffect(() => {
		let on = true
		fetchPosts({ me: me.id, scope: 'user', userId, staff: isStaff(me) }).then((r) => on && setPosts(r.posts))
		return () => {
			on = false
		}
	}, [me, userId])
	if (!posts) return <p className="text-[14px] text-muted-foreground">Carregando…</p>
	if (posts.length === 0) return <p className="text-[14px] text-muted-foreground">Nenhuma publicação ainda.</p>
	return (
		<section className="px-box overflow-hidden">
			{posts.map((p) => (
				<PostCard key={p.id} post={p} me={me} onRemoved={(id) => setPosts((c) => c?.filter((x) => x.id !== id) ?? null)} />
			))}
		</section>
	)
}

function View({ me, username }: { me: Profile; username: string }) {
	const [view, setView] = useState<ProfileView | null | undefined>(undefined)
	useEffect(() => {
		let on = true
		fetchProfileView(username, me.id).then((v) => on && setView(v))
		return () => {
			on = false
		}
	}, [username, me.id])

	if (view === undefined) return <p className="text-[14px] text-muted-foreground">Carregando…</p>
	if (view === null || (view.suspended && !isStaff(me)))
		return <PageHeader title="Perfil não encontrado" hint={`Não existe ninguém com o nome @${username}.`} />

	const thisMonth = view.stats?.month === today().slice(0, 7)
	const rankIndex = thisMonth ? view.stats!.rank_index : 0
	const self = view.id === me.id
	const toggle = async () => {
		const on = !view.iFollow
		setView({ ...view, iFollow: on, followers: view.followers + (on ? 1 : -1) })
		if (await setFollow(view.id, on)) setView(view)
	}

	return (
		<div className="grid gap-4">
			<Panel>
				<div className="flex flex-wrap items-center gap-4">
					<Avatar emoji={view.avatar} color={view.color} size={72} />
					<div className="min-w-0 flex-1">
						<h1 className="font-display truncate text-[24px] font-semibold">{view.display_name || view.username}</h1>
						<p className="text-[14px] text-muted-foreground">
							@{view.username}
							{view.role !== 'user' && <span className="ml-2 rounded-full border border-primary/50 px-2 py-0.5 text-[11px] text-primary">{ROLE_LABEL[view.role]}</span>}
							{view.suspended && <span className="ml-2 rounded-full border border-px-red px-2 py-0.5 text-[11px] text-px-red">Suspenso</span>}
						</p>
						{view.bio && <p className="mt-2 text-[15px]">{view.bio}</p>}
						<p className="mt-2 text-[13px] text-muted-foreground">
							<b className="text-foreground">{num(view.followers)}</b> seguidores · <b className="text-foreground">{num(view.following)}</b> seguindo
						</p>
					</div>
					{self ? (
						<a href="/perfil" className="px-btn">Editar perfil</a>
					) : (
						<button className={view.iFollow ? 'px-btn' : 'px-btn-primary'} onClick={toggle}>{view.iFollow ? 'Seguindo ✓' : 'Seguir'}</button>
					)}
				</div>
			</Panel>

			<Panel title="Jornada">
				{view.stats ? (
					<div className="flex flex-wrap items-center gap-6">
						<div className="flex items-center gap-3">
							<RankBadge index={rankIndex} size={4} />
							<div>
								<p className="px-label">Rank do mês</p>
								<p className="font-display text-[20px] font-semibold">{RANKS[rankIndex].label}</p>
							</div>
						</div>
						<div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
							<Stat label="Nível" value={view.stats.level} />
							<Stat label="XP no mês" value={thisMonth ? num(view.stats.month_xp) : 0} />
							<Stat label="Sequência" value={`${view.stats.streak} d`} />
							<Stat label="Conquistas" value={view.stats.achievements} />
						</div>
					</div>
				) : (
					<p className="text-[14px] text-muted-foreground">Ainda não compartilhou estatísticas.</p>
				)}
			</Panel>

			<h2 className="px-label">Publicações</h2>
			<Posts me={me} userId={view.id} />
		</div>
	)
}

export default function Page() {
	const { profile } = useMe()
	const { username } = useParams<{ username: string }>()
	return profile ? <View me={profile} username={decodeURIComponent(username)} /> : null
}
