/**
 * "Para você": a ranked home feed in the spirit of Instagram's, built from the
 * signals Instagram says it uses (interest in the author, recency, popularity,
 * relationship, post type) plus an author-variety pass. It is a transparent
 * scoring formula, not a machine-learned model.
 */

export interface RankPost {
	id: string
	user_id: string
	created_at: string
	likes: number
	comments: number
	/** Already liked by the viewer. */
	liked: boolean
	hasImage: boolean
}

export interface Signals {
	me: string
	following: Set<string>
	followers: Set<string>
	/** How many of an author's posts the viewer liked recently. */
	likedAuthors: Map<string, number>
	/** How many comments the viewer left on an author's posts recently. */
	commentedAuthors: Map<string, number>
}

/** Posts lose half their pull every this many hours. */
export const HALF_LIFE_HOURS = 10
/** After a post by one author, the next one by the same author counts this much less. */
export const REPEAT_PENALTY = 0.55
export const WEIGHTS = { stranger: 0.25, following: 1, mutual: 0.4, interaction: 0.25, image: 1.25, fresh: 1.2, seen: 0.7, own: 0.3 }

export function affinity(author: string, s: Signals): number {
	if (author === s.me) return WEIGHTS.stranger
	const follows = s.following.has(author)
	const mutual = follows && s.followers.has(author)
	const interactions = Math.min(6, (s.likedAuthors.get(author) ?? 0) + 2 * (s.commentedAuthors.get(author) ?? 0))
	return WEIGHTS.stranger + (follows ? WEIGHTS.following : 0) + (mutual ? WEIGHTS.mutual : 0) + interactions * WEIGHTS.interaction
}

export function score(p: RankPost, s: Signals, now = Date.now()): number {
	const ageH = Math.max(0, (now - new Date(p.created_at).getTime()) / 3600000)
	const recency = 0.5 ** (ageH / HALF_LIFE_HOURS)
	const engagement = 1 + Math.log2(1 + p.likes + 2 * p.comments)
	let v = affinity(p.user_id, s) * engagement * recency
	if (p.hasImage) v *= WEIGHTS.image
	if (ageH < 1) v *= WEIGHTS.fresh
	if (p.liked) v *= WEIGHTS.seen
	if (p.user_id === s.me) v *= WEIGHTS.own
	return v
}

/** Highest score first, then re-ordered so one author cannot take over the screen. */
export function rankFeed<T extends RankPost>(posts: T[], s: Signals, now = Date.now()): T[] {
	const pool = posts.map((post) => ({ post, base: score(post, s, now) }))
	const out: T[] = []
	while (pool.length) {
		const recent = out.slice(-4).map((p) => p.user_id)
		let best = 0
		let bestValue = -1
		for (let i = 0; i < pool.length; i++) {
			const repeats = recent.filter((u) => u === pool[i].post.user_id).length
			// Never three in a row from the same author while others exist.
			const streak = recent.length >= 2 && recent.slice(-2).every((u) => u === pool[i].post.user_id)
			const v = pool[i].base * REPEAT_PENALTY ** repeats * (streak ? 0.01 : 1)
			if (v > bestValue) {
				bestValue = v
				best = i
			}
		}
		out.push(pool.splice(best, 1)[0].post)
	}
	return out
}
