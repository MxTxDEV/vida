'use client'

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/badges'
import { PageHeader, Panel } from '@/components/bits'
import { PullToRefresh } from '@/components/pull-refresh'
import { Avatar, PostCard } from '@/components/social-ui'
import { prepareImage } from '@/lib/images'
import {
	createPost,
	fetchForYou,
	fetchPosts,
	fetchSmartSuggestions,
	fetchTrends,
	isStaff,
	needsSocial2,
	removeImage,
	setFollow,
	uploadImage,
	useMe,
	type Post,
	type Profile,
} from '@/lib/social'
import type { Suggested } from '@/lib/suggest'

const LIMIT = 280
const POLL_MS = 30000
const SQL_URL = 'https://github.com/MxTxDEV/vida/blob/claude/inspiring-rubin-72ddu8/supabase/social2.sql'

type Tab = 'foryou' | 'following' | 'recent'

function SetupHint() {
	return (
		<div className="m-4 rounded-xl border border-px-yellow/50 p-4 text-[14px]">
			<p className="font-medium text-px-yellow">Falta ativar fotos e notificações no banco</p>
			<p className="mt-1 text-muted-foreground">
				No Supabase, abra o <b>SQL Editor</b>, cole o arquivo{' '}
				<a className="text-primary underline" href={SQL_URL} target="_blank" rel="noreferrer">supabase/social2.sql</a> e clique em <b>Run</b>. Depois atualize esta página.
			</p>
		</div>
	)
}

function Composer({ me, onPosted }: { me: Profile; onPosted: () => void }) {
	const [text, setText] = useState('')
	const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	const file = useRef<HTMLInputElement>(null)
	const left = LIMIT - text.length

	const pick = async (f: File | undefined) => {
		if (!f) return
		setError('')
		const r = await prepareImage(f, { max: 1280, quality: 0.82 })
		if ('error' in r) return setError(r.error)
		if (photo) URL.revokeObjectURL(photo.url)
		setPhoto({ blob: r.blob, url: URL.createObjectURL(r.blob) })
	}
	const clear = () => {
		if (photo) URL.revokeObjectURL(photo.url)
		setPhoto(null)
	}

	const publish = async () => {
		if ((!text.trim() && !photo) || left < 0) return
		setBusy(true)
		let path: string | null = null
		if (photo) {
			const up = await uploadImage('posts', photo.blob)
			if ('error' in up) {
				setBusy(false)
				return setError(up.error)
			}
			path = up.path
		}
		const err = await createPost(text, 'texto', path)
		setBusy(false)
		if (err) {
			await removeImage('posts', path)
			return setError(err)
		}
		setText('')
		clear()
		setError('')
		onPosted()
	}

	return (
		<div className="flex gap-3 border-b border-border px-4 py-4">
			<Avatar emoji={me.avatar} color={me.color} path={me.avatar_path} />
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
				{photo && (
					<div className="relative mt-2">
						<img src={photo.url} alt="Prévia da foto" className="max-h-[320px] w-full rounded-xl border border-border object-cover" />
						<button className="px-btn absolute right-2 top-2 !min-h-8 !px-2.5 bg-card text-[12px]" onClick={clear} aria-label="Remover foto">Remover</button>
					</div>
				)}
				<div className="mt-2 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<input ref={file} type="file" accept="image/*" hidden data-testid="post-photo" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
						<button className="px-btn !min-h-8 !px-2.5 text-[13px]" onClick={() => file.current?.click()} aria-label="Adicionar foto">
							<Icon name="foto" size={16} /> Foto
						</button>
						<span className="hidden text-[12px] text-muted-foreground sm:inline">#hashtags e @menções</span>
					</div>
					<div className="flex items-center gap-3">
						<span className={`text-[13px] tabular-nums ${left < 0 ? 'text-px-red' : left <= 20 ? 'text-px-yellow' : 'text-muted-foreground'}`}>{left}</span>
						<button className="px-btn-primary" disabled={busy || (!text.trim() && !photo) || left < 0} onClick={publish}>
							{busy ? 'Enviando…' : 'Publicar'}
						</button>
					</div>
				</div>
				{error && <p className="mt-2 text-[13px] text-px-red">{error}</p>}
			</div>
		</div>
	)
}

function InlineSuggestions({ people, onFollowed }: { people: Suggested[]; onFollowed: (id: string) => void }) {
	if (people.length === 0) return null
	return (
		<div className="border-b border-border bg-[var(--hover)] px-4 py-3.5">
			<p className="px-label mb-2.5">Sugestões para você</p>
			<ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
				{people.slice(0, 5).map((p) => (
					<li key={p.id} className="flex w-[150px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
						<Avatar emoji={p.avatar} color={p.color} path={p.avatar_path} size={48} />
						<Link href={`/u/${p.username}`} className="w-full truncate text-[14px] font-medium hover:text-primary">{p.display_name || p.username}</Link>
						<span className="line-clamp-2 min-h-[2.4em] text-[12px] leading-tight text-muted-foreground">{p.reason}</span>
						<button
							className="px-btn-primary !min-h-8 w-full !px-2 text-[13px]"
							onClick={async () => {
								if (await setFollow(p.id, true)) return window.alert('Não foi possível seguir agora.')
								onFollowed(p.id)
							}}>
							Seguir
						</button>
					</li>
				))}
			</ul>
		</div>
	)
}

function Timeline({ me, tab, tag, version, onTag, onBump, people, onFollowed }: { me: Profile; tab: Tab; tag: string; version: number; onTag: (t: string) => void; onBump: () => void; people: Suggested[]; onFollowed: (id: string) => void }) {
	const [posts, setPosts] = useState<Post[] | null>(null)
	const [fresh, setFresh] = useState<Post[]>([])
	const [error, setError] = useState('')
	const newest = useRef('')

	const load = useCallback(() => {
		const staff = isStaff(me)
		if (tag) return fetchPosts({ me: me.id, scope: 'all', tag, staff })
		if (tab === 'foryou') return fetchForYou(me.id, staff)
		return fetchPosts({ me: me.id, scope: tab === 'following' ? 'following' : 'all', staff })
	}, [me, tab, tag])

	useEffect(() => {
		let on = true
		load().then((r) => {
			if (!on) return
			setPosts(r.posts)
			setError(r.error)
			setFresh([])
			newest.current = r.posts.reduce((m, p) => (p.created_at > m ? p.created_at : m), '')
		})
		return () => {
			on = false
		}
	}, [load, version])

	// Quietly look for new posts and offer to show them (the order never jumps under your thumb).
	useEffect(() => {
		const id = window.setInterval(async () => {
			if (document.visibilityState !== 'visible') return
			const r = await load()
			setFresh(r.posts.filter((p) => p.created_at > newest.current && p.user_id !== me.id))
		}, POLL_MS)
		return () => window.clearInterval(id)
	}, [load, me.id])

	if (error) return needsSocial2(error) ? <SetupHint /> : <p className="p-4 text-[14px] text-px-red">{error}</p>
	if (!posts) return <p className="p-4 text-[14px] text-muted-foreground">Carregando…</p>

	return (
		<>
			{fresh.length > 0 && (
				<button
					className="w-full border-b border-border bg-[var(--accent-soft)] px-4 py-2.5 text-[14px] text-primary hover:brightness-110"
					onClick={() => {
						const merged = [...fresh, ...posts]
						setPosts(merged)
						newest.current = merged.reduce((m, p) => (p.created_at > m ? p.created_at : m), '')
						setFresh([])
					}}>
					Ver {fresh.length} {fresh.length === 1 ? 'nova publicação' : 'novas publicações'}
				</button>
			)}
			{posts.length === 0 && (
				<>
					<InlineSuggestions people={people} onFollowed={onFollowed} />
					<p className="px-4 py-10 text-center text-[14px] text-muted-foreground">
						{tag ? `Nada com #${tag} ainda.` : tab === 'following' ? 'Sua linha do tempo está vazia. Siga pessoas nas sugestões ou veja a aba Para você.' : 'Nenhuma publicação ainda. Seja o primeiro!'}
					</p>
				</>
			)}
			{posts.map((p, i) => (
				<div key={p.id}>
					<PostCard post={p} me={me} onTag={onTag} onRepost={onBump} onRemoved={(id) => setPosts((cur) => cur?.filter((x) => x.id !== id) ?? null)} />
					{i === 2 && <InlineSuggestions people={people} onFollowed={onFollowed} />}
				</div>
			))}
			{posts.length > 0 && posts.length < 3 && <InlineSuggestions people={people} onFollowed={onFollowed} />}
		</>
	)
}

function Sidebar({ people, onFollowed, version, onTag }: { people: Suggested[]; onFollowed: (id: string) => void; version: number; onTag: (t: string) => void }) {
	const [trends, setTrends] = useState<{ tag: string; count: number }[]>([])
	useEffect(() => {
		let on = true
		fetchTrends().then((t) => on && setTrends(t))
		return () => {
			on = false
		}
	}, [version])

	return (
		<aside className="grid content-start gap-4">
			<Panel title="Quem seguir">
				<ul className="grid gap-3">
					{people.slice(0, 5).map((p) => (
						<li key={p.id} className="flex items-center gap-2.5">
							<Avatar emoji={p.avatar} color={p.color} path={p.avatar_path} size={36} />
							<Link href={`/u/${p.username}`} className="min-w-0 flex-1 text-[14px] hover:text-primary">
								<span className="block truncate font-medium">{p.display_name || p.username}</span>
								<span className="block truncate text-[12px] text-muted-foreground">{p.reason}</span>
							</Link>
							<button
								className="px-btn !min-h-8 !px-3 text-[12px]"
								onClick={async () => {
									if (await setFollow(p.id, true)) return window.alert('Não foi possível seguir agora.')
									onFollowed(p.id)
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
	const [tab, setTab] = useState<Tab>('foryou')
	const [tag, setTag] = useState(() => (typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('tag') ?? '').toLowerCase()))
	const [version, setVersion] = useState(0)
	const [people, setPeople] = useState<Suggested[]>([])
	const bump = useCallback(() => setVersion((v) => v + 1), [])

	useEffect(() => {
		let on = true
		fetchSmartSuggestions(me.id).then((p) => on && setPeople(p))
		return () => {
			on = false
		}
	}, [me.id, version])

	const refresh = useCallback(async () => {
		bump()
		await new Promise((r) => setTimeout(r, 700))
	}, [bump])

	const tabs: [Tab, string][] = [['foryou', 'Para você'], ['following', 'Seguindo'], ['recent', 'Recentes']]
	return (
		<PullToRefresh onRefresh={refresh}>
			<PageHeader title="Comunidade" hint="Puxe a tela para baixo para atualizar.">
				<button className="px-btn" onClick={bump}>Atualizar</button>
			</PageHeader>
			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
				<section className="px-box overflow-hidden">
					<Composer me={me} onPosted={bump} />
					<div className="flex border-b border-border">
						{tabs.map(([id, label]) => (
							<button
								key={id}
								className={`flex-1 px-3 py-3 text-[14px] transition hover:bg-[var(--hover)] ${!tag && tab === id ? 'border-b-2 border-primary font-medium text-foreground' : 'border-b-2 border-transparent text-muted-foreground'}`}
								onClick={() => {
									setTag('')
									setTab(id)
								}}>
								{label}
							</button>
						))}
					</div>
					{tag && (
						<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-[14px]">
							<span>Mostrando <b className="text-primary">#{tag}</b></span>
							<button className="px-btn !min-h-8 !px-3 text-[12px]" onClick={() => setTag('')}>Limpar filtro</button>
						</div>
					)}
					<Timeline me={me} tab={tab} tag={tag} version={version} onTag={setTag} onBump={bump} people={people} onFollowed={(id) => setPeople((c) => c.filter((x) => x.id !== id))} />
				</section>
				<Sidebar people={people} onFollowed={(id) => setPeople((c) => c.filter((x) => x.id !== id))} version={version} onTag={setTag} />
			</div>
		</PullToRefresh>
	)
}

export default function Page() {
	const { profile } = useMe()
	return profile ? <Feed me={profile} /> : null
}
