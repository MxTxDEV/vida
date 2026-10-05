'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PageHeader, Panel, Stat, num } from '@/components/bits'
import { Avatar } from '@/components/social-ui'
import {
	adminDeleteUser,
	adminOverview,
	adminReports,
	adminResolveReport,
	adminSetRole,
	adminSetSuspended,
	adminUsers,
	deletePost,
	fetchPosts,
	isStaff,
	isSuperadmin,
	ROLE_LABEL,
	timeAgo,
	useMe,
	type AdminUser,
	type Post,
	type Profile,
	type ReportRow,
	type Role,
} from '@/lib/social'

type Tab = 'visao' | 'usuarios' | 'conteudo' | 'denuncias'

function Overview() {
	const [data, setData] = useState<Awaited<ReturnType<typeof adminOverview>>>(null)
	useEffect(() => {
		let on = true
		adminOverview().then((d) => on && setData(d))
		return () => {
			on = false
		}
	}, [])
	if (!data) return <p className="text-[14px] text-muted-foreground">Carregando…</p>
	return (
		<Panel title="Visão geral">
			<div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
				<Stat label="Usuários" value={num(data.users)} />
				<Stat label="Publicações" value={num(data.posts)} />
				<Stat label="Comentários" value={num(data.comments)} />
				<Stat label="Denúncias abertas" value={num(data.reports)} tone={data.reports ? 'err' : undefined} />
				<Stat label="Suspensos" value={num(data.suspended)} />
				<Stat label="Equipe" value={num(data.staff)} />
			</div>
		</Panel>
	)
}

function UserRow({ u, me, onChanged }: { u: AdminUser; me: Profile; onChanged: () => void }) {
	const st = Array.isArray(u.stats) ? u.stats[0] : u.stats
	const self = u.id === me.id
	const protectedUser = u.role === 'superadmin'
	const act = async (fn: () => Promise<string | null>) => {
		const err = await fn()
		if (err) window.alert(err)
		onChanged()
	}
	return (
		<li className={`flex flex-wrap items-center gap-3 rounded-xl border border-border px-3 py-2.5 ${u.suspended ? 'opacity-70' : ''}`}>
			<Avatar emoji={u.avatar} color={u.color} size={36} />
			<div className="min-w-[160px] flex-1">
				<Link href={`/u/${u.username}`} className="font-medium hover:text-primary">{u.display_name || u.username}</Link>
				<p className="text-[12px] text-muted-foreground">
					@{u.username} · desde {new Date(u.created_at).toLocaleDateString('pt-BR')}{st ? ` · Nv ${st.level}` : ''}
				</p>
			</div>
			{u.role !== 'user' && <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[11px] text-primary">{ROLE_LABEL[u.role]}</span>}
			{u.suspended && <span className="rounded-full border border-px-red px-2 py-0.5 text-[11px] text-px-red">Suspenso</span>}
			{!self && !protectedUser && (
				<div className="flex flex-wrap items-center gap-1.5">
					<button className="px-btn !min-h-8 !px-3 text-[12px]" onClick={() => act(() => adminSetSuspended(u.id, !u.suspended))}>
						{u.suspended ? 'Reativar' : 'Suspender'}
					</button>
					{isSuperadmin(me) && (
						<>
							<select
								aria-label={`Cargo de ${u.username}`}
								className="px-input !h-8 text-[12px]"
								value={u.role}
								onChange={(e) => {
									const role = e.target.value as Role
									if (role === 'superadmin' && !window.confirm(`Tornar @${u.username} SUPERADMIN? Ela terá controle total.`)) return
									void act(() => adminSetRole(u.id, role))
								}}>
								<option value="user">Usuário</option>
								<option value="moderator">Moderador</option>
								<option value="superadmin">Superadmin</option>
							</select>
							<button
								className="px-btn !min-h-8 !px-3 text-[12px] !text-px-red"
								onClick={() => {
									if (window.confirm(`Excluir a conta de @${u.username} e TODOS os dados dela? Isso não pode ser desfeito.`)) void act(() => adminDeleteUser(u.id))
								}}>
								Excluir
							</button>
						</>
					)}
				</div>
			)}
		</li>
	)
}

function Users({ me }: { me: Profile }) {
	const [search, setSearch] = useState('')
	const [query, setQuery] = useState('')
	const [users, setUsers] = useState<AdminUser[] | null>(null)
	const [error, setError] = useState('')
	const [version, setVersion] = useState(0)
	useEffect(() => {
		let on = true
		adminUsers(query).then((r) => {
			if (!on) return
			setUsers(r.users)
			setError(r.error)
		})
		return () => {
			on = false
		}
	}, [query, version])
	return (
		<Panel title="Usuários" meta={users ? `${users.length} exibidos` : undefined}>
			<form
				className="mb-4 flex gap-2"
				onSubmit={(e) => {
					e.preventDefault()
					setQuery(search)
				}}>
				<input className="px-input flex-1" placeholder="Buscar por nome ou @usuário" value={search} onChange={(e) => setSearch(e.target.value)} />
				<button className="px-btn" type="submit">Buscar</button>
			</form>
			{error && <p className="text-[13px] text-px-red">{error}</p>}
			<ul className="grid gap-2">
				{users?.map((u) => <UserRow key={u.id} u={u} me={me} onChanged={() => setVersion((v) => v + 1)} />)}
			</ul>
		</Panel>
	)
}

function Content({ me }: { me: Profile }) {
	const [posts, setPosts] = useState<Post[] | null>(null)
	useEffect(() => {
		let on = true
		fetchPosts({ me: me.id, scope: 'recent', staff: true, limit: 50 }).then((r) => on && setPosts(r.posts))
		return () => {
			on = false
		}
	}, [me.id])
	return (
		<Panel title="Publicações recentes">
			<ul className="grid gap-2">
				{posts?.map((p) => (
					<li key={p.id} className="flex items-start gap-3 rounded-xl border border-border px-3 py-2.5">
						<Avatar emoji={p.author.avatar} color={p.author.color} size={32} />
						<div className="min-w-0 flex-1 text-[14px]">
							<p className="text-[12px] text-muted-foreground">@{p.author.username} · {timeAgo(p.created_at)} · {p.likes} curtidas · {p.comments} comentários</p>
							<p className="break-words">{p.body}</p>
						</div>
						<button
							className="px-btn !min-h-8 !px-3 text-[12px] !text-px-red"
							onClick={async () => {
								if (!window.confirm('Remover esta publicação?')) return
								if (await deletePost(p.id)) return window.alert('Não foi possível remover.')
								setPosts((c) => c?.filter((x) => x.id !== p.id) ?? null)
							}}>
							Remover
						</button>
					</li>
				))}
				{posts?.length === 0 && <li className="text-[14px] text-muted-foreground">Nenhuma publicação.</li>}
				{!posts && <li className="text-[14px] text-muted-foreground">Carregando…</li>}
			</ul>
		</Panel>
	)
}

function Reports() {
	const [rows, setRows] = useState<ReportRow[] | null>(null)
	const [error, setError] = useState('')
	const [version, setVersion] = useState(0)
	const load = useCallback(() => setVersion((v) => v + 1), [])
	useEffect(() => {
		let on = true
		adminReports().then((r) => {
			if (!on) return
			setRows(r.reports)
			setError(r.error)
		})
		return () => {
			on = false
		}
	}, [version])
	return (
		<Panel title="Denúncias abertas" meta={rows ? `${rows.length}` : undefined}>
			{error && <p className="text-[13px] text-px-red">{error}</p>}
			<ul className="grid gap-3">
				{rows?.map((r) => (
					<li key={r.id} className="rounded-xl border border-border p-3 text-[14px]">
						<p className="text-[12px] text-muted-foreground">
							Denunciado por @{r.reporter?.username ?? '?'} · {timeAgo(r.created_at)}{r.reason ? ` · “${r.reason}”` : ''}
						</p>
						{r.post ? (
							<>
								<p className="mt-1.5 text-[12px] text-muted-foreground">Autor: @{r.post.author?.username}</p>
								<p className="mt-1 break-words">{r.post.body}</p>
							</>
						) : (
							<p className="mt-1 text-muted-foreground">Publicação já removida.</p>
						)}
						<div className="mt-3 flex flex-wrap gap-2">
							{r.post && (
								<button
									className="px-btn !min-h-8 !px-3 text-[12px] !text-px-red"
									onClick={async () => {
										if (await deletePost(r.post!.id)) return window.alert('Não foi possível remover.')
										load()
									}}>
									Remover publicação
								</button>
							)}
							{r.post && (
								<button
									className="px-btn !min-h-8 !px-3 text-[12px]"
									onClick={async () => {
										if (!window.confirm(`Suspender @${r.post!.author?.username}?`)) return
										const err = await adminSetSuspended(r.post!.user_id, true)
										if (err) return window.alert(err)
										await adminResolveReport(r.id)
										load()
									}}>
									Suspender autor
								</button>
							)}
							<button className="px-btn !min-h-8 !px-3 text-[12px]" onClick={async () => { await adminResolveReport(r.id); load() }}>
								Descartar
							</button>
						</div>
					</li>
				))}
				{rows?.length === 0 && <li className="text-[14px] text-muted-foreground">Nenhuma denúncia aberta. 🎉</li>}
				{!rows && <li className="text-[14px] text-muted-foreground">Carregando…</li>}
			</ul>
		</Panel>
	)
}

function Admin({ me }: { me: Profile }) {
	const [tab, setTab] = useState<Tab>('visao')
	const tabs: [Tab, string][] = [['visao', 'Visão geral'], ['usuarios', 'Usuários'], ['conteudo', 'Conteúdo'], ['denuncias', 'Denúncias']]
	return (
		<>
			<PageHeader title="Administração" hint={`Você entrou como ${ROLE_LABEL[me.role]}. Diário, finanças e treinos das pessoas são privados e não aparecem aqui.`} />
			<div className="mb-4 flex flex-wrap gap-2">
				{tabs.map(([id, label]) => (
					<button key={id} className="px-btn" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
				))}
			</div>
			{tab === 'visao' && <Overview />}
			{tab === 'usuarios' && <Users me={me} />}
			{tab === 'conteudo' && <Content me={me} />}
			{tab === 'denuncias' && <Reports />}
		</>
	)
}

export default function Page() {
	const { profile } = useMe()
	if (!profile) return null
	if (!isStaff(profile)) return <PageHeader title="Sem acesso" hint="Esta área é só para a equipe." />
	return <Admin me={profile} />
}
