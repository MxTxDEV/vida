'use client'

import { useState } from 'react'
import { button, buttonPrimary, field } from './bits'
import { syncConfigured } from '@/lib/supabase'
import { signIn, signOut, signUp, useSync } from '@/lib/sync'

const LABEL = {
	off: 'Sem sincronização',
	'signed-out': 'Entrar',
	idle: '☁ Sincronizado',
	syncing: '☁ Sincronizando…',
	offline: '☁ Offline',
	error: '☁ Erro',
} as const

export function AccountMenu() {
	const sync = useSync()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [msg, setMsg] = useState('')
	const [busy, setBusy] = useState(false)

	if (!syncConfigured)
		return (
			<span title="Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY" className="text-[13px] text-muted-foreground">
				Só neste aparelho
			</span>
		)

	const run = async (fn: typeof signIn) => {
		setBusy(true)
		setMsg((await fn(email.trim(), password)) ?? '')
		setBusy(false)
	}

	return (
		<details className="relative">
			<summary className="px-btn cursor-pointer list-none">{LABEL[sync.status]}</summary>
			<div className="px-box absolute right-0 z-30 mt-2 w-72 p-3 text-[14px]">
				{sync.email ? (
					<div className="grid gap-2">
						<p className="truncate">{sync.email}</p>
						<p className="text-[13px] text-muted-foreground">
							{sync.status === 'error' || sync.status === 'offline'
								? sync.error || 'Sem conexão. Seus dados estão salvos neste aparelho e sobem quando voltar.'
								: sync.lastSync
									? `Última sincronização às ${new Date(sync.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
									: 'Sincronizando…'}
						</p>
						<button className={button} onClick={() => void signOut()}>Sair</button>
					</div>
				) : (
					<form
						className="grid gap-2"
						onSubmit={(e) => {
							e.preventDefault()
							void run(signIn)
						}}>
						<p className="text-[13px] text-muted-foreground">Entre com a mesma conta no celular e no computador.</p>
						<input className={field} type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
						<input className={field} type="password" autoComplete="current-password" placeholder="Senha (mín. 6)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
						{msg && <p className="text-[13px] text-px-red">{msg}</p>}
						<div className="flex gap-2">
							<button type="submit" className={`${buttonPrimary} flex-1`} disabled={busy}>Entrar</button>
							<button type="button" className={`${button} flex-1`} disabled={busy || !email || password.length < 6} onClick={() => void run(signUp)}>Criar conta</button>
						</div>
					</form>
				)}
			</div>
		</details>
	)
}
