'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RankBadge } from '@/components/badges'
import { PageHeader, Panel, num } from '@/components/bits'
import { Avatar } from '@/components/social-ui'
import { today } from '@/lib/dates'
import { RANKS } from '@/lib/game'
import { fetchLeaderboard, useMe, type BoardRow, type Profile } from '@/lib/social'

function Board({ me, scope }: { me: Profile; scope: 'all' | 'following' }) {
	const month = today().slice(0, 7)
	const [rows, setRows] = useState<BoardRow[] | null>(null)
	const [error, setError] = useState('')
	useEffect(() => {
		let on = true
		fetchLeaderboard(month, scope, me.id).then((r) => {
			if (!on) return
			setRows(r.rows)
			setError(r.error)
		})
		return () => {
			on = false
		}
	}, [me.id, scope, month])

	if (error) return <p className="text-[14px] text-px-red">{error}</p>
	if (!rows) return <p className="text-[14px] text-muted-foreground">Carregando…</p>
	if (rows.length === 0)
		return <p className="py-6 text-center text-[14px] text-muted-foreground">Ninguém pontuou neste mês ainda.</p>
	const mine = rows.findIndex((r) => r.user_id === me.id)
	return (
		<>
			{mine >= 0 && <p className="mb-3 text-[14px] text-muted-foreground">Você está em <b className="text-foreground">{mine + 1}º</b> lugar neste mês.</p>}
			<ol className="grid gap-2">
				{rows.map((r, i) => (
					<li key={r.user_id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.user_id === me.id ? 'border-primary/50 bg-[var(--accent-soft)]' : 'border-border'}`}>
						<span className={`w-7 text-center font-display text-[16px] ${i < 3 ? 'text-px-yellow' : 'text-muted-foreground'}`}>{i + 1}</span>
						<Avatar emoji={r.profile!.avatar} color={r.profile!.color} path={r.profile!.avatar_path} size={36} />
						<Link href={`/u/${r.profile!.username}`} className="min-w-0 flex-1 truncate hover:text-primary">
							<span className="font-medium">{r.profile!.display_name || r.profile!.username}</span>
							<span className="ml-1.5 text-[13px] text-muted-foreground">@{r.profile!.username}</span>
						</Link>
						<span className="hidden items-center gap-1.5 text-[13px] text-muted-foreground sm:flex" title={`Rank ${RANKS[r.rank_index].label}`}>
							<RankBadge index={r.rank_index} size={1.4} /> {RANKS[r.rank_index].label}
						</span>
						<span className="hidden w-14 text-right text-[13px] text-muted-foreground sm:block">Nv {r.level}</span>
						<span className="w-20 text-right font-display text-[16px] tabular-nums">{num(r.month_xp)}<span className="ml-1 text-[11px] text-muted-foreground">XP</span></span>
					</li>
				))}
			</ol>
		</>
	)
}

export default function Page() {
	const { profile } = useMe()
	const [scope, setScope] = useState<'all' | 'following'>('all')
	if (!profile) return null
	const label = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
	return (
		<>
			<PageHeader title="Ranking do mês" hint={`Temporada de ${label}. Zera todo mês, e o rank final fica no seu histórico.`} />
			<div className="grid gap-4">
				<div className="flex gap-2">
					<button className="px-btn" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos</button>
					<button className="px-btn" aria-pressed={scope === 'following'} onClick={() => setScope('following')}>Seguindo</button>
				</div>
				<Panel>
					<Board key={scope} me={profile} scope={scope} />
				</Panel>
				<p className="text-[12px] text-muted-foreground">
					Os pontos são calculados no aparelho de cada pessoa e enviados ao ranking. Só nível, XP do mês, sequência e conquistas ficam públicos.
				</p>
			</div>
		</>
	)
}
