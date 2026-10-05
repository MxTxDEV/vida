'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader, Panel } from '@/components/bits'
import { Avatar, PostCard } from '@/components/social-ui'
import {
	createPost,
	fetchPosts,
	fetchSuggestions,
	fetchTrends,
	isStaff,
	setFollow,
	useMe,
	type Post,
	type Profile,
	type Suggestion,
} from '@/lib/social'

const LIMIT = 280
const POLL_MS = 30000

type Scope = 'following' | 'all'

function Composer({ me, onPosted }: { me: Profile; onPosted: () => void }) {
	const [text, setText] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	const left = LIMIT - text.length

	const publish = async () => {
		if (!text.trim() || left < 0) return
		setBusy(true)
		const err = await createPost(text)
		setBusy(false)
		if (err) return setError(err)
		setText('')
		setError('')
		onPosted()
	}

	return (
		<div className="flex gap-3 border-b border-border px-4 py-4">
			<Avatar emoji={me.avatar} color={me.color} />
			<div className="min-w-0 flex-1">
				<textarea
					className="w-full resize-none bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
					rows={text.length > 90 ? 4 : 2}
					placeholder="O que está acontecendo?"
					aria-label="O que está acontecendo?"
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void publish()
					}}
				/>
				<div className="mt-2 flex items-center justify-between gap-3">
					<span className="text-[12px] text-muted-foreground">Use #hashtags e @menções. Ctrl + Enter publica.</span>
					<div className="flex items-center gap-3">
						<span className={`text-[13px] tabular-nums ${left < 0 ? 'text-px-red' : left <= 20 ? 'text-px-yellow' : 'text-muted-foreground'}`}>{left}</span>
						<button className="px-btn-primary" disabled={busy || !text.trim() || left < 0} onClick={publish}>
							Publicar
						</button>
					</div>
				</div>
				{error && <p className="mt-2 text-[13px] text-px-red">{error}</p>}
			</div>
		</div>
	)
}

function Timeline({ me, scope, tag, version, onTag, onBump }: { me: Profile; scope: Scope; tag: string; version: number; onTag: (t: string) => void; onBump: () => void }) {
	const [posts, setPosts] = useState<Post[] | null>(null)
	const [fresh, setFresh] = useState<Post[]>([])
	const [error, setError] = useState('')
	const first = useRef('')

	const load = useCallback(
		() => fetchPosts({ me: me.id, scope, tag: tag || undefined, staff: isStaff(me) }),
		[me, scope, tag],
	)

	useEffect(() => {
		let on = true
		load().then((r) => {
			if (!on) return
			setPosts(r.posts)
			setError(r.error)
			setFresh([])
			first.current = r.posts[0]?.created_at ?? ''
		})
		return () => {
			on = false
		}
	}, [load, version])

	// Like the old Twitter: check quietly for new posts and offer to show them.
	useEffect(() => {
		const id = window.setInterval(async () => {
			if (document.visibilityState !== 'visible') return
			const r = await load()
			setFresh(r.posts.filter((p) => p.created_at > first.current && p.user_id !== me.id))
		}, POLL_MS)
		return () => window.clearInterval(id)
	}, [load, me.id])

	if (error) return <p className="p-4 text-[14px] text-px-red">{error}</p>
	if (!posts) return <p className="p-4 text-[14px] text-muted-foreground">Carregando…</p>

	return (
		<>
			{fresh.length > 0 && (
				<button
					className="w-full border-b border-border bg-[var(--accent-soft)] px-4 py-2.5 text-[14px] text-primary hover:brightness-110"
					onClick={() => {
						const merged = [...fresh, ...posts]
						setPosts(merged)
						first.current = merged[0]?.created_at ?? ''
						setFresh([])
					}}>
					Ver {fresh.length} {fresh.length === 1 ? 'nova publicação' : 'novas publicações'}
				</button>
			)}
			{posts.length === 0 && (
				<p className="px-4 py-10 text-center text-[14px] text-muted-foreground">
					{tag
						? `Nada com #${tag} ainda.`
						: scope === 'following'
							? 'Sua linha do tempo está vazia. Siga pessoas em "Quem seguir" ou veja a aba Todos.'
							: 'Nenhuma publicação ainda. Seja o primeiro!'}
				</p>
			)}
			{posts.map((p) => (
				<PostCard key={p.id} post={p} me={me} onTag={onTag} onRepost={onBump} onRemoved={(id) => setPosts((cur) => cur?.filter((x) => x.id !== id) ?? null)} />
			))}
		</>
	)
}

function Sidebar({ me, version, onTag }: { me: Profile; version: number; onTag: (t: string) => void }) {
	const [trends, setTrends] = useState<{ tag: string; count: number }[]>([])
	const [people, setPeople] = useState<Suggestion[]>([])
	useEffect(() => {
		let on = true
		fetchTrends().then((t) => on && setTrends(t))
		fetchSuggestions(me.id).then((p) => on && setPeople(p))
		return () => {
			on = false
		}
	}, [me.id, version])

	return (
		<aside className="grid content-start gap-4">
			<Panel title="Quem seguir">
				<ul className="grid gap-3">
					{people.map((p) => (
						<li key={p.id} className="flex items-center gap-2.5">
							<Avatar emoji={p.avatar} color={p.color} size={34} />
							<Link href={`/u/${p.username}`} className="min-w-0 flex-1 truncate text-[14px] hover:text-primary">
								<span className="block truncate font-medium">{p.display_name || p.username}</span>
								<span className="block truncate text-[12px] text-muted-foreground">@{p.username}</span>
							</Link>
							<button
								className="px-btn !min-h-8 !px-3 text-[12px]"
								onClick={async () => {
									if (await setFollow(p.id, true)) return window.alert('Não foi possível seguir agora.')
									setPeople((cur) => cur.filter((x) => x.id !== p.id))
								}}>
								Seguir
							</button>
						</li>
					))}
					{people.length === 0 && <li className="text-[13px] text-muted-foreground">Você já segue todo mundo por enquanto.</li>}
				</ul>
			</Panel>
			<Panel title="Assuntos do momento">
				<ul className="grid gap-2.5">
					{trends.map((t) => (
						<li key={t.tag}>
							<button className="w-full text-left hover:text-primary" onClick={() => onTag(t.tag)}>
								<span className="block text-[14px] font-medium">#{t.tag}</span>
								<span className="text-[12px] text-muted-foreground">{t.count} {t.count === 1 ? 'publicação' : 'publicações'}</span>
							</button>
						</li>
					))}
					{trends.length === 0 && <li className="text-[13px] text-muted-foreground">Use #hashtags nas publicações e os assuntos aparecem aqui.</li>}
				</ul>
			</Panel>
		</aside>
	)
}

function Feed({ me }: { me: Profile }) {
	const [scope, setScope] = useState<Scope>('following')
	const [tag, setTag] = useState(() => (typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('tag') ?? '').toLowerCase()))
	const [version, setVersion] = useState(0)
	const bump = useCallback(() => setVersion((v) => v + 1), [])
	const tab = (s: Scope, label: string) => (
		<button
			key={s}
			className={`flex-1 px-4 py-3 text-[14px] transition hover:bg-[var(--hover)] ${!tag && scope === s ? 'border-b-2 border-primary font-medium text-foreground' : 'border-b-2 border-transparent text-muted-foreground'}`}
			onClick={() => {
				setTag('')
				setScope(s)
			}}>
			{label}
		</button>
	)

	return (
		<>
			<PageHeader title="Comunidade" hint="A linha do tempo de quem você segue.">
				<button className="px-btn" onClick={bump}>Atualizar</button>
			</PageHeader>
			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
				<section className="px-box overflow-hidden">
					<Composer me={me} onPosted={bump} />
					<div className="flex border-b border-border">
						{tab('following', 'Início')}
						{tab('all', 'Todos')}
					</div>
					{tag && (
						<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-[14px]">
							<span>Mostrando <b className="text-primary">#{tag}</b></span>
							<button className="px-btn !min-h-8 !px-3 text-[12px]" onClick={() => setTag('')}>Limpar filtro</button>
						</div>
					)}
					<Timeline me={me} scope={tag ? 'all' : scope} tag={tag} version={version} onTag={setTag} onBump={bump} />
				</section>
				<Sidebar me={me} version={version} onTag={setTag} />
			</div>
		</>
	)
}

export default function Page() {
	const { profile } = useMe()
	return profile ? <Feed me={profile} /> : null
}
