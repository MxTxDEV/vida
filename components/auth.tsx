'use client'

import { useState, type ReactNode } from 'react'
import { loadProfile, USERNAME_RE } from '@/lib/social'
import { friendlyAuthError, resetPassword, signIn, signOut, signUp, updatePassword, useSync, usernameAvailable } from '@/lib/sync'

function Card({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-4 py-10">
			<p className="font-display mb-6 text-center text-[22px] font-semibold tracking-[0.3em]">VIDA</p>
			<section className="px-box p-6">
				<h1 className="font-display mb-4 text-[20px] font-semibold">{title}</h1>
				{children}
			</section>
		</div>
	)
}

const Error = ({ text }: { text: string }) =>
	text ? <p className="text-[13px] text-px-red" role="alert">{text}</p> : null

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<label className="grid gap-1.5">
			<span className="px-label">{label}</span>
			<input className="px-input" {...rest} />
		</label>
	)
}

export function Loading() {
	return (
		<Card title="Carregando…">
			<p className="text-[14px] text-muted-foreground">Verificando sua conta.</p>
		</Card>
	)
}

export function LoginScreen() {
	const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in')
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [msg, setMsg] = useState('')
	const [info, setInfo] = useState('')
	const [busy, setBusy] = useState(false)

	const go = (m: typeof mode) => {
		setMode(m)
		setMsg('')
		setInfo('')
	}

	const submit = async () => {
		try {
			await run()
		} catch (e) {
			setBusy(false)
			setMsg(friendlyAuthError(String(e)))
		}
	}

	const run = async () => {
		setMsg('')
		setInfo('')
		const mail = email.trim()
		if (mode === 'forgot') {
			setBusy(true)
			const err = await resetPassword(mail)
			setBusy(false)
			return err ? setMsg(friendlyAuthError(err)) : setInfo('Enviamos um link para o seu e-mail. Abra-o neste aparelho para criar uma nova senha.')
		}
		if (mode === 'up') {
			const u = username.trim().toLowerCase()
			if (!USERNAME_RE.test(u)) return setMsg('Use de 3 a 20 letras minúsculas, números ou _ no nome de usuário.')
			if (password.length < 6) return setMsg('A senha precisa ter pelo menos 6 caracteres.')
			if (password !== confirm) return setMsg('As senhas não são iguais.')
			setBusy(true)
			if (!(await usernameAvailable(u))) {
				setBusy(false)
				return setMsg('Esse nome de usuário já está em uso.')
			}
			const res = await signUp(mail, password, u)
			setBusy(false)
			if (res.error) return setMsg(res.error)
			if (res.notice) setInfo(res.notice)
			return
		}
		setBusy(true)
		const err = await signIn(mail, password)
		setBusy(false)
		if (err) setMsg(err)
	}

	return (
		<Card title={mode === 'in' ? 'Entrar' : mode === 'up' ? 'Criar conta' : 'Recuperar senha'}>
			<form
				className="grid gap-3"
				onSubmit={(e) => {
					e.preventDefault()
					void submit()
				}}>
				{mode === 'up' && (
					<div className="grid gap-1.5">
						<Field
							label="Nome de usuário"
							name="vida-nome-de-usuario"
							value={username}
							onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
							autoComplete="off"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							placeholder="ex.: joao_silva"
							maxLength={20}
							required
						/>
						<span className="text-[12px] text-muted-foreground">Como as pessoas vão te ver. Só letras minúsculas, números e _ (3 a 20). Não é o e-mail.</span>
					</div>
				)}
				<Field label="E-mail" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
				{mode !== 'forgot' && (
					<Field label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} minLength={6} required />
				)}
				{mode === 'up' && (
					<Field label="Confirmar senha" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={6} required />
				)}
				<Error text={msg} />
				{info && <p className="text-[13px] text-px-green">{info}</p>}
				<button type="submit" className="px-btn-primary" disabled={busy}>
					{mode === 'in' ? 'Entrar' : mode === 'up' ? 'Criar minha conta' : 'Enviar link'}
				</button>
			</form>
			<div className="mt-4 flex flex-wrap justify-between gap-2 text-[13px] text-muted-foreground">
				{mode === 'in' ? (
					<>
						<button className="hover:text-primary" onClick={() => go('up')}>Criar conta</button>
						<button className="hover:text-primary" onClick={() => go('forgot')}>Esqueci a senha</button>
					</>
				) : (
					<button className="hover:text-primary" onClick={() => go('in')}>← Voltar para entrar</button>
				)}
			</div>
		</Card>
	)
}

export function RecoveryScreen() {
	const [pw, setPw] = useState('')
	const [msg, setMsg] = useState('')
	return (
		<Card title="Nova senha">
			<form
				className="grid gap-3"
				onSubmit={async (e) => {
					e.preventDefault()
					if (pw.length < 6) return setMsg('A senha precisa ter pelo menos 6 caracteres.')
					setMsg((await updatePassword(pw)) ?? '')
				}}>
				<Field label="Nova senha" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={6} required />
				<Error text={msg} />
				<button type="submit" className="px-btn-primary">Salvar nova senha</button>
			</form>
		</Card>
	)
}

export function SuspendedScreen() {
	return (
		<Card title="Conta suspensa">
			<p className="mb-4 text-[14px] text-muted-foreground">
				Sua conta foi suspensa por um administrador. Seus dados continuam guardados, mas você não pode usar a comunidade por enquanto.
			</p>
			<button className="px-btn w-full" onClick={() => void signOut()}>Sair</button>
		</Card>
	)
}

/** Shown when the social tables are not in the database yet. */
export function SetupScreen({ detail }: { detail: string }) {
	const sync = useSync()
	return (
		<Card title="Falta preparar o banco">
			<p className="mb-3 text-[14px] text-muted-foreground">
				O banco de dados ainda não tem as tabelas da rede social. No Supabase, abra o <b>SQL Editor</b> e rode o arquivo <code>supabase/social.sql</code>. Depois toque em tentar de novo.
			</p>
			{detail !== 'setup' && <Error text={detail} />}
			<div className="mt-3 flex gap-2">
				<button className="px-btn-primary flex-1" onClick={() => sync.userId && void loadProfile(sync.userId)}>Tentar de novo</button>
				<button className="px-btn flex-1" onClick={() => void signOut()}>Sair</button>
			</div>
		</Card>
	)
}
