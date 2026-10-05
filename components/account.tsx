'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { useDismiss } from './use-dismiss'
import { Avatar } from './social-ui'
import { ROLE_LABEL, useMe } from '@/lib/social'
import { syncConfigured } from '@/lib/supabase'
import { signOut, useSync } from '@/lib/sync'

const LABEL = {
	off: 'Sem sincronização',
	'signed-out': 'Entrar',
	idle: 'Sincronizado',
	syncing: 'Sincronizando…',
	offline: 'Offline',
	error: 'Erro de sincronização',
} as const

export function AccountMenu() {
	const sync = useSync()
	const { profile } = useMe()
	const menu = useRef<HTMLDetailsElement>(null)
	useDismiss(menu)
	const close = () => {
		if (menu.current) menu.current.open = false
	}

	if (!syncConfigured)
		return (
			<span title="Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY" className="text-[13px] text-muted-foreground">
				Só neste aparelho
			</span>
		)
	if (!sync.userId || !profile) return null

	const dot = sync.status === 'idle' ? 'bg-px-green' : sync.status === 'syncing' ? 'bg-px-yellow' : 'bg-px-red'
	return (
		<details ref={menu} className="relative">
			<summary className="px-btn cursor-pointer list-none !pl-2">
				<Avatar emoji={profile.avatar} color={profile.color} path={profile.avatar_path} size={24} />
				<span className="max-w-[110px] truncate">@{profile.username}</span>
				<span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
			</summary>
			<div className="px-box absolute right-0 z-30 mt-2 w-64 space-y-2 p-3 text-[14px]">
				<p className="truncate">{profile.display_name || profile.username}</p>
				<p className="truncate text-[13px] text-muted-foreground">
					{sync.email} · {ROLE_LABEL[profile.role]}
				</p>
				<p className="text-[13px] text-muted-foreground">
					{sync.status === 'error' || sync.status === 'offline'
						? sync.error || 'Sem conexão. Seus dados estão salvos neste aparelho e sobem quando voltar.'
						: sync.lastSync
							? `${LABEL[sync.status]} às ${new Date(sync.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
							: LABEL[sync.status]}
				</p>
				<Link href="/perfil" className="px-btn w-full" onClick={close}>
					Meu perfil
				</Link>
				<button className="px-btn w-full" onClick={() => {
						close()
						void signOut()
					}}>
					Sair
				</button>
			</div>
		</details>
	)
}
