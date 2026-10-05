'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon, RankBadge } from './badges'
import { RANKS } from '@/lib/game'
import {
	addComment,
	createPost,
	deleteComment,
	deletePost,
	fetchComments,
	isStaff,
	reportPost,
	setLike,
	timeAgo,
	type Comment,
	type Post,
	type Profile,
} from '@/lib/social'

export function Avatar({ emoji, color, size = 40 }: { emoji: string; color: string; size?: number }) {
	return (
		<span
			aria-hidden="true"
			className="inline-flex shrink-0 items-center justify-center rounded-full"
			style={{
				width: size,
				height: size,
				fontSize: size * 0.5,
				background: `color-mix(in srgb, ${color} 22%, transparent)`,
				boxShadow: `inset 0 0 0 1.5px ${color}`,
			}}>
			{emoji}
		</span>
	)
}

export function Name({ username, display }: { username: string; display: string }) {
	return (
		<Link href={`/u/${username}`} className="min-w-0 truncate hover:text-primary">
			<span className="font-medium">{display || username}</span>
			<span className="ml-1.5 text-muted-foreground">@{username}</span>
		</Link>
	)
}

/** Publishes a milestone to the community feed. */
export function ShareButton({ text, kind }: { text: string; kind: 'conquista' | 'rank' }) {
	const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
	return (
		<button
			className="px-btn !min-h-8 !px-3 text-[12px]"
			disabled={state !== 'idle'}
			onClick={async () => {
				setState('busy')
				const err = await createPost(text, kind)
				if (err) {
					window.alert(err)
					setState('idle')
				} else setState('done')
			}}>
			{state === 'done' ? '✓ Publicado' : 'Compartilhar'}
		</button>
	)
}

function CommentList({ post, me, onCount }: { post: Post; me: Profile; onCount: (n: number) => void }) {
	const [items, setItems] = useState<Comment[] | null>(null)
	const [text, setText] = useState('')
	const [error, setError] = useState('')
	const load = async () => {
		const c = await fetchComments(post.id)
		setItems(c)
		onCount(c.length)
	}
	useEffect(() => {
		let on = true
		fetchComments(post.id).then((c) => on && setItems(c))
		return () => {
			on = false
		}
	}, [post.id])

	return (
		<div className="mt-3 space-y-3 border-t border-border pt-3">
			{items === null && <p className="text-[13px] text-muted-foreground">Carregando…</p>}
			{items?.map((c) => (
				<div key={c.id} className="flex gap-2.5">
					<Avatar emoji={c.author.avatar} color={c.author.color} size={28} />
					<div className="min-w-0 flex-1 text-[14px]">
						<p className="flex flex-wrap items-baseline gap-x-2">
							<Name username={c.author.username} display={c.author.display_name} />
						</p>
						<p className="break-words">{c.body}</p>
					</div>
					{(c.user_id === me.id || isStaff(me)) && (
						<button
							aria-label="Apagar comentário"
							className="text-muted-foreground hover:text-px-red"
							onClick={async () => {
								await deleteComment(c.id)
								load()
							}}>
							<Icon name="lixeira" size={14} />
						</button>
					)}
				</div>
			))}
			<form
				className="flex gap-2"
				onSubmit={async (e) => {
					e.preventDefault()
					if (!text.trim()) return
					const err = await addComment(post.id, text)
					if (err) return setError(err)
					setText('')
					setError('')
					load()
				}}>
				<input className="px-input flex-1" maxLength={300} placeholder="Escreva um comentário" value={text} onChange={(e) => setText(e.target.value)} />
				<button className="px-btn" type="submit" disabled={!text.trim()}>
					Enviar
				</button>
			</form>
			{error && <p className="text-[13px] text-px-red">{error}</p>}
		</div>
	)
}

/** Text with clickable #hashtags and @mentions. */
export function RichText({ text, onTag }: { text: string; onTag?: (tag: string) => void }) {
	const parts = text.split(/(#[\p{L}\p{N}_]{2,30}|@[a-z0-9_]{3,20})/gu)
	return (
		<>
			{parts.map((part, i) => {
				if (/^#[\p{L}\p{N}_]{2,30}$/u.test(part)) {
					const tag = part.slice(1).toLowerCase()
					return (
						<Link
							key={i}
							href={`/social?tag=${encodeURIComponent(tag)}`}
							onClick={(e) => {
								if (onTag) {
									e.preventDefault()
									onTag(tag)
								}
							}}
							className="text-primary hover:underline">
							{part}
						</Link>
					)
				}
				if (/^@[a-z0-9_]{3,20}$/.test(part))
					return (
						<Link key={i} href={`/u/${part.slice(1)}`} className="text-primary hover:underline">
							{part}
						</Link>
					)
				return <span key={i}>{part}</span>
			})}
		</>
	)
}

/** One post, laid out like a row of the old Twitter timeline. */
export function PostCard({
	post: initial,
	me,
	onRemoved,
	onTag,
	onRepost,
}: {
	post: Post
	me: Profile
	onRemoved: (id: string) => void
	onTag?: (tag: string) => void
	onRepost?: () => void
}) {
	const [post, setPost] = useState(initial)
	const [open, setOpen] = useState(false)
	const [reported, setReported] = useState(false)
	const [reposted, setReposted] = useState(false)
	const a = post.author
	const rank = a.stats ? RANKS[a.stats.rank_index] : null
	const mine = post.user_id === me.id

	const action = 'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] text-muted-foreground transition hover:bg-[var(--hover)] hover:text-foreground'

	return (
		<article className="flex gap-3 border-b border-border px-4 py-3.5 transition hover:bg-[var(--hover)] last:border-b-0">
			<Link href={`/u/${a.username}`} aria-label={`Perfil de ${a.username}`}>
				<Avatar emoji={a.avatar} color={a.color} />
			</Link>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-x-2 text-[14px]">
					<Name username={a.username} display={a.display_name} />
					{a.stats && (
						<span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground" title={`Rank ${rank?.label} no mês · Nível ${a.stats.level}`}>
							<RankBadge index={a.stats.rank_index} size={1} /> Nv {a.stats.level}
						</span>
					)}
					<span className="text-[12px] text-muted-foreground">· {timeAgo(post.created_at)}</span>
				</div>
				<p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-snug">
					{post.kind !== 'texto' && <span className="mr-1">{post.kind === 'rank' ? '🏅' : '🏆'}</span>}
					<RichText text={post.body} onTag={onTag} />
				</p>
				<div className="-ml-2 mt-2 flex flex-wrap items-center gap-1">
					<button className={action} onClick={() => setOpen((v) => !v)} aria-expanded={open} title="Responder">
						<Icon name="comentar" size={15} /> {post.comments || ''}
					</button>
					<button
						className={`${action} ${reposted ? '!text-px-green' : ''}`}
						title="Repostar (RT)"
						disabled={reposted}
						onClick={async () => {
							const text = `RT @${a.username}: ${post.body}`.slice(0, 500)
							if (!window.confirm(`Repostar para quem segue você?\n\n${text.slice(0, 140)}`)) return
							if (await createPost(text)) return window.alert('Não foi possível repostar.')
							setReposted(true)
							onRepost?.()
						}}>
						<Icon name="repostar" size={15} /> {reposted ? 'RT' : ''}
					</button>
					<button
						className={`${action} ${post.liked ? '!text-px-red' : ''}`}
						aria-pressed={post.liked}
						title="Curtir"
						onClick={async () => {
							const on = !post.liked
							setPost({ ...post, liked: on, likes: post.likes + (on ? 1 : -1) })
							if (await setLike(post.id, on)) setPost(post)
						}}>
						<Icon name="curtir" size={15} /> {post.likes || ''}
					</button>
					{!mine && (
						<button
							className={action}
							disabled={reported}
							title="Denunciar"
							onClick={async () => {
								const reason = window.prompt('Por que você está denunciando? (opcional)', '')
								if (reason === null) return
								if (await reportPost(post.id, reason)) window.alert('Não foi possível denunciar agora.')
								else setReported(true)
							}}>
							<Icon name="denunciar" size={15} /> {reported ? 'Denunciado' : ''}
						</button>
					)}
					{(mine || isStaff(me)) && (
						<button
							className={`${action} hover:!text-px-red`}
							aria-label="Apagar publicação"
							title="Apagar"
							onClick={async () => {
								if (!window.confirm('Apagar esta publicação?')) return
								if (await deletePost(post.id)) return window.alert('Não foi possível apagar.')
								onRemoved(post.id)
							}}>
							<Icon name="lixeira" size={15} />
						</button>
					)}
				</div>
				{open && <CommentList post={post} me={me} onCount={(n) => setPost((p) => ({ ...p, comments: n }))} />}
			</div>
		</article>
	)
}
