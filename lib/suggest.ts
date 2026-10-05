/** Who to follow: friends of friends, people who follow you, similar rank, newcomers. */

export interface Candidate {
	id: string
	username: string
	display_name: string
	avatar: string
	avatar_path: string | null
	color: string
	created_at: string
	rank_index: number | null
	/** Last time their public numbers changed. */
	active_at: string | null
}

export interface SuggestSignals {
	me: string
	myRank: number | null
	following: Set<string>
	followers: Set<string>
	/** For each person, who among the people I follow also follows them. */
	followedBy: Map<string, string[]>
}

export interface Suggested extends Candidate {
	score: number
	/** Plain-language reason shown under the name. */
	reason: string
	/** Usernames of mutual connections, for the reason text. */
	via: string[]
}

export function suggest(candidates: Candidate[], s: SuggestSignals, names: Map<string, string>, now = Date.now(), limit = 8): Suggested[] {
	const out: Suggested[] = []
	for (const c of candidates) {
		if (c.id === s.me || s.following.has(c.id)) continue
		const via = (s.followedBy.get(c.id) ?? []).map((id) => names.get(id)).filter((n): n is string => Boolean(n))
		const followsMe = s.followers.has(c.id)
		const sameRank = c.rank_index !== null && s.myRank !== null && Math.abs(c.rank_index - s.myRank) <= 1
		const activeDays = c.active_at ? (now - new Date(c.active_at).getTime()) / 86400000 : 99
		const ageDays = (now - new Date(c.created_at).getTime()) / 86400000
		const score = (followsMe ? 7 : 0) + Math.min(via.length, 5) * 3 + (sameRank ? 1.5 : 0) + (activeDays < 3 ? 1 : 0) + (ageDays < 14 ? 1 : 0)
		let reason = 'Sugestão para você'
		if (followsMe) reason = 'Segue você'
		else if (via.length === 1) reason = `Seguido por @${via[0]}`
		else if (via.length > 1) reason = `Seguido por @${via[0]} e mais ${via.length - 1}`
		else if (sameRank) reason = 'Rank parecido com o seu'
		else if (ageDays < 14) reason = 'Novo por aqui'
		out.push({ ...c, score, reason, via })
	}
	return out.sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at)).slice(0, limit)
}
