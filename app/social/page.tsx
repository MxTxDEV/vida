'use client'

import { useEffect, useState } from 'react'
import { PageHeader, Panel } from '@/components/bits'
import { Avatar, PostCard } from '@/components/social-ui'
import { createPost, fetchPosts, isStaff, useMe, type Post, type Profile } from '@/lib/social'

function FeedList({ me, scope }: { me: Profile; scope: 'all' | 'following' }) {
	const [posts, setPosts] = useState<Post[] | null>(null)
	const [error, setError] = useState('')
	useEffect(() => {
		let on = true
		fetchPosts({ me: me.id, scope, staff: isStaff(me) }).then((r) => {
			if (!on) return
			setPosts(r.posts)
			setError(r.error)
		})
		return () => {
			on = false
		}
	}, [me, scope])

	if (error) return <p className="text-[14px] text-px-red">{error}</p>
	if (!posts) return <p className="text-[14px] text-muted-foreground">Carregando…</p>
	if (posts.length === 0)
		return (
			<Panel>
				<p className="py-6 text-center text-[14px] text-muted-foreground">
					{scope === 'following' ? 'Você ainda não segue ninguém, ou eles ainda não publicaram.' : 'Nenhuma publicação ainda. Seja o primeiro!'}
				</p>
			</Panel>
		)
	return (
		<div className="grid gap-3">
			{posts.map((p) => (
				<PostCard key={p.id} post={p} me={me} onRemoved={(id) => setPosts((cur) => cur?.filter((x) => x.id !== id) ?? null)} />
			))}
		</div>
	)
}

function Feed({ me }: { me: Profile }) {
	const [scope, setScope] = useState<'all' | 'following'>('all')
	const [version, setVersion] = useState(0)
	const [text, setText] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')

	const publish = async () => {
		if (!text.trim()) return
		setBusy(true)
		const err = await createPost(text)
		setBusy(false)
		if (err) return setError(err)
		setText('')
		setError('')
		setVersion((v) => v + 1)
	}

	return (
		<>
			<PageHeader title="Comunidade" hint="Compartilhe conquistas e acompanhe quem você segue.">
				<button className="px-btn" onClick={() => setVersion((v) => v + 1)}>Atualizar</button>
			</PageHeader>
			<div className="grid gap-4">
				<Panel>
					<div className="flex gap-3">
						<Avatar emoji={me.avatar} color={me.color} />
						<div className="min-w-0 flex-1 space-y-2">
							<textarea
								className="px-input !h-auto min-h-[84px] w-full resize-y py-2"
								placeholder="O que você conquistou hoje?"
								maxLength={500}
								value={text}
								onChange={(e) => setText(e.target.value)}
							/>
							<div className="flex items-center justify-between gap-3">
								<span className="text-[12px] text-muted-foreground">{text.length}/500 · seu diário e suas finanças continuam privados</span>
								<button className="px-btn-primary" disabled={busy || !text.trim()} onClick={publish}>Publicar</button>
							</div>
							{error && <p className="text-[13px] text-px-red">{error}</p>}
						</div>
					</div>
				</Panel>
				<div className="flex gap-2">
					<button className="px-btn" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos</button>
					<button className="px-btn" aria-pressed={scope === 'following'} onClick={() => setScope('following')}>Seguindo</button>
				</div>
				<FeedList key={`${scope}-${version}`} me={me} scope={scope} />
			</div>
		</>
	)
}

export default function Page() {
	const { profile } = useMe()
	return profile ? <Feed me={profile} /> : null
}
