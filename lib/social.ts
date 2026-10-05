import { useSyncExternalStore } from 'react'
import { rankFeed, type RankPost, type Signals } from './rank'
import { suggest, type Candidate, type Suggested } from './suggest'
import { getSupabase } from './supabase'

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type Role = 'user' | 'moderator' | 'superadmin'

export interface Profile {
	id: string
	username: string
	display_name: string
	bio: string
	avatar: string
	avatar_path: string | null
	color: string
	role: Role
	suspended: boolean
	created_at: string
}

export interface PublicStats {
	month: string
	month_xp: number
	lifetime_xp: number
	level: number
	rank_index: number
	streak: number
	achievements: number
}

export interface Author {
	username: string
	display_name: string
	avatar: string
	avatar_path: string | null
	color: string
	suspended: boolean
	stats: Pick<PublicStats, 'month' | 'rank_index' | 'level'> | null
}

export interface Post {
	id: string
	user_id: string
	body: string
	kind: 'texto' | 'conquista' | 'rank'
	image_path: string | null
	created_at: string
	author: Author
	likes: number
	liked: boolean
	comments: number
}

export interface Comment {
	id: string
	body: string
	created_at: string
	user_id: string
	author: Pick<Author, 'username' | 'display_name' | 'avatar' | 'avatar_path' | 'color'>
}

export const isStaff = (p: Profile | null) => p?.role === 'moderator' || p?.role === 'superadmin'
export const isSuperadmin = (p: Profile | null) => p?.role === 'superadmin'

export const ROLE_LABEL: Record<Role, string> = {
	user: 'Usuário',
	moderator: 'Moderador',
	superadmin: 'Superadmin',
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

/* ------------------------------------------------------------------ *
 * The signed-in person's own profile
 * ------------------------------------------------------------------ */

interface MeState {
	status: 'idle' | 'loading' | 'ready' | 'error'
	profile: Profile | null
	error: string
}

const SERVER_ME: MeState = { status: 'idle', profile: null, error: '' }
let me: MeState = SERVER_ME
const subs = new Set<() => void>()

function setMe(next: MeState) {
	me = next
	subs.forEach((s) => s())
}

export const useMe = () =>
	useSyncExternalStore(
		(fn) => {
			subs.add(fn)
			return () => {
				subs.delete(fn)
			}
		},
		() => me,
		() => SERVER_ME,
	)

export function clearProfile() {
	setMe(SERVER_ME)
}

const MISSING_TABLE = /does not exist|schema cache|PGRST205|42P01/i

export async function loadProfile(userId: string) {
	const sb = getSupabase()
	if (!sb) return
	// Keep showing the current profile while refreshing, so the page does not flash.
	if (!me.profile || me.profile.id !== userId) setMe({ status: 'loading', profile: null, error: '' })
	let { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
	if (!error && !data) {
		// Account created before the social network: make its profile now.
		const name = `user_${userId.replace(/-/g, '').slice(0, 8)}`
		await sb.from('profiles').insert({ id: userId, username: name, display_name: name })
		;({ data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle())
	}
	if (error || !data) {
		const msg = error?.message ?? 'Perfil não encontrado.'
		setMe({ status: 'error', profile: null, error: MISSING_TABLE.test(`${error?.code} ${msg}`) ? 'setup' : msg })
		return
	}
	setMe({ status: 'ready', profile: data as Profile, error: '' })
}

export async function updateMyProfile(patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar' | 'color'>>) {
	const sb = getSupabase()
	if (!sb || !me.profile) return 'Sem conexão.'
	const { error } = await sb.from('profiles').update(patch).eq('id', me.profile.id)
	if (error) return error.code === '23505' ? 'Esse nome de usuário já está em uso.' : error.message
	await loadProfile(me.profile.id)
	return null
}

/* ------------------------------------------------------------------ *
 * Feed
 * ------------------------------------------------------------------ */

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

interface PostRow {
	id: string
	user_id: string
	body: string
	kind: Post['kind']
	image_path: string | null
	created_at: string
	author: (Omit<Author, 'stats'> & { stats: Author['stats'] | Author['stats'][] }) | null
	likes: { user_id: string }[]
	comments: { count: number }[]
}

const POST_SELECT =
	'id,user_id,body,kind,image_path,created_at,author:profiles!user_id(username,display_name,avatar,avatar_path,color,suspended,stats(month,rank_index,level)),likes(user_id),comments(count)'

const fail = (e: { message: string } | null) => e?.message ?? ''

export async function fetchFollowing(userId: string): Promise<string[]> {
	const sb = getSupabase()
	if (!sb) return []
	const { data } = await sb.from('follows').select('followee_id').eq('follower_id', userId)
	return (data ?? []).map((r) => r.followee_id as string)
}

export async function fetchPosts(opts: {
	me: string
	scope: 'all' | 'following' | 'user' | 'recent'
	userId?: string
	/** Only posts containing this hashtag (without the #). */
	tag?: string
	staff?: boolean
	limit?: number
}): Promise<{ posts: Post[]; error: string }> {
	const sb = getSupabase()
	if (!sb) return { posts: [], error: 'Sem conexão.' }
	let q = sb.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(opts.limit ?? 50)
	if (opts.scope === 'user' && opts.userId) q = q.eq('user_id', opts.userId)
	if (opts.scope === 'following') {
		// Like the old Twitter home: the people you follow, plus yourself.
		q = q.in('user_id', [...(await fetchFollowing(opts.me)), opts.me])
	}
	if (opts.tag) q = q.ilike('body', `%#${opts.tag.replace(/[%_,()]/g, '')}%`)
	const { data, error } = await q
	if (error) return { posts: [], error: error.message }
	const posts = (data as unknown as PostRow[])
		.filter((r) => r.author && (opts.staff || !r.author.suspended))
		.map((r) => ({
			id: r.id,
			user_id: r.user_id,
			body: r.body,
			kind: r.kind,
			image_path: r.image_path,
			created_at: r.created_at,
			author: { ...r.author!, stats: one(r.author!.stats) },
			likes: r.likes.length,
			liked: r.likes.some((l) => l.user_id === opts.me),
			comments: r.comments[0]?.count ?? 0,
		}))
	return { posts, error: '' }
}

export async function createPost(body: string, kind: Post['kind'] = 'texto', imagePath: string | null = null) {
	const sb = getSupabase()
	if (!sb || !me.profile) return 'Sem conexão.'
	const { error } = await sb.from('posts').insert({ user_id: me.profile.id, body: body.trim(), kind, image_path: imagePath })
	return fail(error) || null
}

export async function deletePost(id: string) {
	const sb = getSupabase()
	if (!sb) return 'Sem conexão.'
	const { data } = await sb.from('posts').select('image_path').eq('id', id).maybeSingle()
	const { error } = await sb.from('posts').delete().eq('id', id)
	// Free the storage too (best effort).
	if (!error && data?.image_path) await sb.storage.from('posts').remove([data.image_path as string])
	return fail(error) || null
}

export async function setLike(postId: string, on: boolean) {
	const sb = getSupabase()
	if (!sb || !me.profile) return 'Sem conexão.'
	const { error } = on
		? await sb.from('likes').insert({ post_id: postId, user_id: me.profile.id })
		: await sb.from('likes').delete().eq('post_id', postId).eq('user_id', me.profile.id)
	return fail(error) || null
}

export async function fetchComments(postId: string): Promise<Comment[]> {
	const sb = getSupabase()
	if (!sb) return []
	const { data } = await sb
		.from('comments')
		.select('id,body,created_at,user_id,author:profiles!user_id(username,display_name,avatar,avatar_path,color)')
		.eq('post_id', postId)
		.order('created_at', { ascending: true })
		.limit(100)
	return (data ?? []) as unknown as Comment[]
}

export async function addComment(postId: string, body: string) {
	const sb = getSupabase()
	if (!sb || !me.profile) return 'Sem conexão.'
	const { error } = await sb.from('comments').insert({ post_id: postId, user_id: me.profile.id, body: body.trim() })
	return fail(error) || null
}

export async function deleteComment(id: string) {
	const { error } = (await getSupabase()?.from('comments').delete().eq('id', id)) ?? { error: null }
	return fail(error) || null
}

export async function reportPost(postId: string, reason: string) {
	const sb = getSupabase()
	if (!sb || !me.profile) return 'Sem conexão.'
	const { error } = await sb.from('reports').insert({ post_id: postId, reporter_id: me.profile.id, reason: reason.slice(0, 200) })
	if (error?.code === '23505') return null // already reported
	return fail(error) || null
}

export const HASHTAG_RE = /#([\p{L}\p{N}_]{2,30})/gu

/** The most used hashtags in the latest posts. */
export async function fetchTrends(): Promise<{ tag: string; count: number }[]> {
	const sb = getSupabase()
	if (!sb) return []
	const { data } = await sb.from('posts').select('body').order('created_at', { ascending: false }).limit(300)
	const counts = new Map<string, number>()
	for (const row of (data ?? []) as { body: string }[])
		for (const m of new Set([...row.body.matchAll(HASHTAG_RE)].map((x) => x[1].toLowerCase())))
			counts.set(m, (counts.get(m) ?? 0) + 1)
	return [...counts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 6)
}

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */

export async function setFollow(targetId: string, on: boolean) {
	const sb = getSupabase()
	if (!sb || !me.profile) return 'Sem conexão.'
	const { error } = on
		? await sb.from('follows').insert({ follower_id: me.profile.id, followee_id: targetId })
		: await sb.from('follows').delete().eq('follower_id', me.profile.id).eq('followee_id', targetId)
	return fail(error) || null
}

export interface ProfileView extends Profile {
	stats: PublicStats | null
	followers: number
	following: number
	iFollow: boolean
}

export async function fetchProfileView(username: string, meId: string): Promise<ProfileView | null> {
	const sb = getSupabase()
	if (!sb) return null
	const { data } = await sb.from('profiles').select('*, stats(*)').eq('username', username.toLowerCase()).maybeSingle()
	if (!data) return null
	const row = data as unknown as Profile & { stats: PublicStats | PublicStats[] | null }
	const count = (col: 'followee_id' | 'follower_id') =>
		sb.from('follows').select('*', { count: 'exact', head: true }).eq(col, row.id)
	const [followers, following, mine] = await Promise.all([
		count('followee_id'),
		count('follower_id'),
		sb.from('follows').select('followee_id').eq('follower_id', meId).eq('followee_id', row.id).maybeSingle(),
	])
	return {
		...row,
		stats: one(row.stats),
		followers: followers.count ?? 0,
		following: following.count ?? 0,
		iFollow: Boolean(mine.data),
	}
}

export interface BoardRow extends PublicStats {
	user_id: string
	profile: Pick<Author, 'username' | 'display_name' | 'avatar' | 'avatar_path' | 'color' | 'suspended'> | null
}

export async function fetchLeaderboard(month: string, scope: 'all' | 'following', meId: string): Promise<{ rows: BoardRow[]; error: string }> {
	const sb = getSupabase()
	if (!sb) return { rows: [], error: 'Sem conexão.' }
	let q = sb
		.from('stats')
		.select('user_id,month,month_xp,lifetime_xp,level,rank_index,streak,achievements,profile:profiles!user_id(username,display_name,avatar,avatar_path,color,suspended)')
		.eq('month', month)
		.order('month_xp', { ascending: false })
		.limit(100)
	if (scope === 'following') q = q.in('user_id', [...(await fetchFollowing(meId)), meId])
	const { data, error } = await q
	if (error) return { rows: [], error: error.message }
	return { rows: (data as unknown as BoardRow[]).filter((r) => r.profile && !r.profile.suspended), error: '' }
}

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

export interface AdminUser extends Profile {
	stats: Pick<PublicStats, 'month' | 'month_xp' | 'level'> | Pick<PublicStats, 'month' | 'month_xp' | 'level'>[] | null
}

export async function adminOverview() {
	const sb = getSupabase()
	if (!sb) return null
	const count = (table: string) => sb.from(table).select('*', { count: 'exact', head: true })
	const [users, posts, comments, reports, suspended, staff] = await Promise.all([
		count('profiles'),
		count('posts'),
		count('comments'),
		count('reports').eq('resolved', false),
		count('profiles').eq('suspended', true),
		count('profiles').in('role', ['moderator', 'superadmin']),
	])
	return {
		users: users.count ?? 0,
		posts: posts.count ?? 0,
		comments: comments.count ?? 0,
		reports: reports.count ?? 0,
		suspended: suspended.count ?? 0,
		staff: staff.count ?? 0,
	}
}

export async function adminUsers(search: string): Promise<{ users: AdminUser[]; error: string }> {
	const sb = getSupabase()
	if (!sb) return { users: [], error: 'Sem conexão.' }
	let q = sb
		.from('profiles')
		.select('*, stats(month,month_xp,level)')
		.order('created_at', { ascending: false })
		.limit(100)
	const s = search.trim().replace(/[%,()]/g, '')
	if (s) q = q.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`)
	const { data, error } = await q
	return { users: (data ?? []) as unknown as AdminUser[], error: error?.message ?? '' }
}

export async function adminSetSuspended(id: string, suspended: boolean) {
	const { error } = (await getSupabase()?.from('profiles').update({ suspended }).eq('id', id)) ?? { error: null }
	return fail(error) || null
}

export async function adminSetRole(id: string, role: Role) {
	const { error } = (await getSupabase()?.from('profiles').update({ role }).eq('id', id)) ?? { error: null }
	return fail(error) || null
}

export async function adminDeleteUser(id: string) {
	const { error } = (await getSupabase()?.rpc('admin_delete_user', { target: id })) ?? { error: null }
	return fail(error) || null
}

export interface ReportRow {
	id: string
	reason: string
	created_at: string
	reporter: { username: string } | null
	post: { id: string; body: string; user_id: string; author: { username: string; display_name: string; suspended: boolean } | null } | null
}

export async function adminReports(): Promise<{ reports: ReportRow[]; error: string }> {
	const sb = getSupabase()
	if (!sb) return { reports: [], error: 'Sem conexão.' }
	const { data, error } = await sb
		.from('reports')
		.select('id,reason,created_at,reporter:profiles!reporter_id(username),post:posts!post_id(id,body,user_id,author:profiles!user_id(username,display_name,suspended))')
		.eq('resolved', false)
		.order('created_at', { ascending: false })
		.limit(100)
	return { reports: (data ?? []) as unknown as ReportRow[], error: error?.message ?? '' }
}

export async function adminResolveReport(id: string) {
	const { error } = (await getSupabase()?.from('reports').update({ resolved: true }).eq('id', id)) ?? { error: null }
	return fail(error) || null
}

/* ------------------------------------------------------------------ *
 * Time
 * ------------------------------------------------------------------ */

export function timeAgo(iso: string) {
	const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
	if (s < 60) return 'agora'
	if (s < 3600) return `${Math.floor(s / 60)} min`
	if (s < 86400) return `${Math.floor(s / 3600)} h`
	if (s < 86400 * 7) return `${Math.floor(s / 86400)} d`
	return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ------------------------------------------------------------------ *
 * Images
 * ------------------------------------------------------------------ */

export type Bucket = 'avatars' | 'posts'

export function imageUrl(bucket: Bucket, path: string | null | undefined): string | null {
	if (!path) return null
	return getSupabase()?.storage.from(bucket).getPublicUrl(path).data.publicUrl ?? null
}

/** Uploads into the person's own folder and returns the stored path. */
export async function uploadImage(bucket: Bucket, blob: Blob): Promise<{ path: string } | { error: string }> {
	const sb = getSupabase()
	if (!sb || !me.profile) return { error: 'Sem conexão.' }
	const path = `${me.profile.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
	const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
	if (error) {
		const m = error.message.toLowerCase()
		if (m.includes('bucket not found')) return { error: 'O armazenamento de fotos ainda não foi preparado. Rode o arquivo supabase/social2.sql no Supabase.' }
		if (m.includes('row-level security') || m.includes('policy')) return { error: 'Sem permissão para enviar fotos. Rode o arquivo supabase/social2.sql no Supabase.' }
		if (m.includes('too large') || m.includes('size')) return { error: 'A imagem ficou grande demais.' }
		return { error: error.message }
	}
	return { path }
}

export async function removeImage(bucket: Bucket, path: string | null | undefined) {
	if (path) await getSupabase()?.storage.from(bucket).remove([path])
}

export async function setMyAvatar(blob: Blob | null) {
	const sb = getSupabase()
	if (!sb || !me.profile) return 'Sem conexão.'
	const old = me.profile.avatar_path
	let path: string | null = null
	if (blob) {
		const up = await uploadImage('avatars', blob)
		if ('error' in up) return up.error
		path = up.path
	}
	const { error } = await sb.from('profiles').update({ avatar_path: path }).eq('id', me.profile.id)
	if (error) return error.message
	await removeImage('avatars', old)
	await loadProfile(me.profile.id)
	return null
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export interface Notice {
	id: string
	type: 'follow' | 'like' | 'comment'
	read: boolean
	created_at: string
	post_id: string | null
	actor: { id: string; username: string; display_name: string; avatar: string; avatar_path: string | null; color: string } | null
	post: { body: string; image_path: string | null } | null
}

export async function fetchNotices(): Promise<{ notices: Notice[]; error: string }> {
	const sb = getSupabase()
	if (!sb) return { notices: [], error: 'Sem conexão.' }
	const { data, error } = await sb
		.from('notifications')
		.select('id,type,read,created_at,post_id,actor:profiles!actor_id(id,username,display_name,avatar,avatar_path,color),post:posts!post_id(body,image_path)')
		.order('created_at', { ascending: false })
		.limit(60)
	return { notices: (data ?? []) as unknown as Notice[], error: error?.message ?? '' }
}

export async function fetchUnread(): Promise<number> {
	const sb = getSupabase()
	if (!sb) return 0
	const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false)
	return count ?? 0
}

export async function markAllRead() {
	await getSupabase()?.from('notifications').update({ read: true }).eq('read', false)
}

/* ------------------------------------------------------------------ *
 * Signals for the ranked feed and the suggestions
 * ------------------------------------------------------------------ */

export async function fetchSignals(meId: string): Promise<Signals> {
	const sb = getSupabase()
	const empty: Signals = { me: meId, following: new Set(), followers: new Set(), likedAuthors: new Map(), commentedAuthors: new Map() }
	if (!sb) return empty
	const since = new Date(Date.now() - 30 * 86400000).toISOString()
	const [following, followers, likes, comments] = await Promise.all([
		sb.from('follows').select('followee_id').eq('follower_id', meId),
		sb.from('follows').select('follower_id').eq('followee_id', meId),
		sb.from('likes').select('post:posts!post_id(user_id)').eq('user_id', meId).limit(300),
		sb.from('comments').select('post:posts!post_id(user_id)').eq('user_id', meId).gte('created_at', since).limit(300),
	])
	const tally = (rows: unknown) => {
		const m = new Map<string, number>()
		for (const r of (rows ?? []) as { post: { user_id: string } | { user_id: string }[] | null }[]) {
			const author = one(r.post)?.user_id
			if (author) m.set(author, (m.get(author) ?? 0) + 1)
		}
		return m
	}
	return {
		me: meId,
		following: new Set((following.data ?? []).map((r) => r.followee_id as string)),
		followers: new Set((followers.data ?? []).map((r) => r.follower_id as string)),
		likedAuthors: tally(likes.data),
		commentedAuthors: tally(comments.data),
	}
}

export const toRankPost = (p: Post): RankPost => ({
	id: p.id,
	user_id: p.user_id,
	created_at: p.created_at,
	likes: p.likes,
	comments: p.comments,
	liked: p.liked,
	hasImage: Boolean(p.image_path),
})

/** The "Para você" feed: recent posts from everyone, ranked for this person. */
export async function fetchForYou(meId: string, staff: boolean): Promise<{ posts: Post[]; error: string }> {
	const [feed, signals] = await Promise.all([
		fetchPosts({ me: meId, scope: 'all', staff, limit: 150 }),
		fetchSignals(meId),
	])
	if (feed.error) return feed
	const cutoff = Date.now() - 14 * 86400000
	const recent = feed.posts.filter((p) => new Date(p.created_at).getTime() > cutoff)
	const byId = new Map(recent.map((p) => [p.id, p]))
	const ranked = rankFeed(recent.map(toRankPost), signals).map((r) => byId.get(r.id)!)
	return { posts: ranked, error: '' }
}

export async function fetchSmartSuggestions(meId: string): Promise<Suggested[]> {
	const sb = getSupabase()
	if (!sb) return []
	const signals = await fetchSignals(meId)
	const mine = [...signals.following]
	const [people, graph, myStats] = await Promise.all([
		sb.from('profiles').select('id,username,display_name,avatar,avatar_path,color,suspended,created_at,stats(rank_index,updated_at)').order('created_at', { ascending: false }).limit(60),
		mine.length ? sb.from('follows').select('follower_id,followee_id').in('follower_id', mine).limit(500) : Promise.resolve({ data: [] }),
		sb.from('stats').select('rank_index').eq('user_id', meId).maybeSingle(),
	])
	const followedBy = new Map<string, string[]>()
	for (const r of (graph.data ?? []) as { follower_id: string; followee_id: string }[]) {
		followedBy.set(r.followee_id, [...(followedBy.get(r.followee_id) ?? []), r.follower_id])
	}
	const rows = ((people.data ?? []) as unknown as (Omit<Candidate, 'rank_index' | 'active_at'> & { suspended: boolean; stats: { rank_index: number; updated_at: string } | { rank_index: number; updated_at: string }[] | null })[]).filter((p) => !p.suspended)
	const names = new Map(rows.map((p) => [p.id, p.username]))
	// Names of people I follow who may not be in the newest 60.
	const missing = mine.filter((id) => !names.has(id))
	if (missing.length) {
		const { data } = await sb.from('profiles').select('id,username').in('id', missing.slice(0, 100))
		for (const p of (data ?? []) as { id: string; username: string }[]) names.set(p.id, p.username)
	}
	const candidates: Candidate[] = rows.map((p) => {
		const st = one(p.stats)
		return { ...p, rank_index: st?.rank_index ?? null, active_at: st?.updated_at ?? null }
	})
	return suggest(candidates, { me: meId, myRank: (myStats.data as { rank_index: number } | null)?.rank_index ?? null, following: signals.following, followers: signals.followers, followedBy }, names)
}

/** True when the error means the database still needs supabase/social2.sql. */
export const needsSocial2 = (message: string) => /image_path|avatar_path|notifications|42703|PGRST20[0-9]|schema cache/i.test(message)

/* ------------------------------------------------------------------ *
 * Unread counter (bell)
 * ------------------------------------------------------------------ */

let unread = 0
const unreadSubs = new Set<() => void>()

export const useUnread = () =>
	useSyncExternalStore(
		(fn) => {
			unreadSubs.add(fn)
			return () => {
				unreadSubs.delete(fn)
			}
		},
		() => unread,
		() => 0,
	)

export async function refreshUnread() {
	const n = await fetchUnread()
	if (n !== unread) {
		unread = n
		unreadSubs.forEach((f) => f())
	}
}
