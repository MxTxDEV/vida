import { useSyncExternalStore } from 'react'
import { getSupabase } from './supabase'
import { clearProfile, loadProfile } from './social'
import { applyRemote, getState, onLocalChange, wipeLocal } from './store'

export type SyncStatus = 'off' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'

interface Info {
	status: SyncStatus
	email: string | null
	userId: string | null
	lastSync: number
	error: string
	/** True until Supabase has told us whether someone is signed in. */
	loading: boolean
	/** Arrived from a password-reset e-mail. */
	recovery: boolean
}

const SERVER: Info = { status: 'off', email: null, userId: null, lastSync: 0, error: '', loading: true, recovery: false }
let info: Info = SERVER
const subs = new Set<() => void>()

function setInfo(patch: Partial<Info>) {
	info = { ...info, ...patch }
	subs.forEach((s) => s())
}

export const useSync = () =>
	useSyncExternalStore(
		(fn) => {
			subs.add(fn)
			return () => {
				subs.delete(fn)
			}
		},
		() => info,
		() => SERVER,
	)

const LINK_KEY = 'vida:linked-user'
const PUSH_DELAY = 1500

let userId: string | null = null
let started = false
let timer = 0
let channel: ReturnType<NonNullable<ReturnType<typeof getSupabase>>['channel']> | null = null

const failure = (message: string) =>
	setInfo({ status: navigator.onLine ? 'error' : 'offline', error: message })

async function push() {
	const sb = getSupabase()
	if (!sb || !userId) return
	setInfo({ status: 'syncing' })
	const { ready, ...data } = getState()
	void ready
	const { error } = await sb
		.from('vida_state')
		.upsert({ user_id: userId, data, updated_at: new Date().toISOString() })
	if (error) failure(error.message)
	else setInfo({ status: 'idle', lastSync: Date.now(), error: '' })
}

const remoteStamp = (data: unknown) =>
	Number((data as { updatedAt?: number } | null)?.updatedAt) || 0

/**
 * Newest copy wins. On a device that was never linked to this account and
 * already holds data, the person chooses which copy to keep.
 */
async function pull(initial = false) {
	const sb = getSupabase()
	if (!sb || !userId) return
	const { data, error } = await sb
		.from('vida_state')
		.select('data')
		.eq('user_id', userId)
		.maybeSingle()
	if (error) return failure(error.message)

	const local = getState()
	if (!data) {
		if (local.updatedAt > 0) await push()
		else setInfo({ status: 'idle', lastSync: Date.now(), error: '' })
		localStorage.setItem(LINK_KEY, userId)
		return
	}
	const remote = remoteStamp(data.data)
	if (remote === local.updatedAt) {
		setInfo({ status: 'idle', lastSync: Date.now(), error: '' })
	} else if (local.updatedAt === 0) {
		applyRemote(data.data)
		setInfo({ status: 'idle', lastSync: Date.now(), error: '' })
	} else if (initial && localStorage.getItem(LINK_KEY) !== userId) {
		const cloud = window.confirm(
			'Há dados na nuvem e também neste aparelho.\n\nOK = usar os dados da NUVEM (os deste aparelho serão substituídos).\nCancelar = enviar os dados DESTE aparelho para a nuvem.',
		)
		if (cloud) {
			applyRemote(data.data)
			setInfo({ status: 'idle', lastSync: Date.now(), error: '' })
		} else await push()
	} else if (remote > local.updatedAt) {
		applyRemote(data.data)
		setInfo({ status: 'idle', lastSync: Date.now(), error: '' })
	} else {
		await push()
	}
	localStorage.setItem(LINK_KEY, userId)
}

function listen() {
	const sb = getSupabase()
	if (!sb || !userId) return
	channel = sb
		.channel(`vida:${userId}`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'vida_state', filter: `user_id=eq.${userId}` },
			(payload) => {
				const data = (payload.new as { data?: unknown } | null)?.data
				if (data && remoteStamp(data) > getState().updatedAt) {
					applyRemote(data)
					setInfo({ lastSync: Date.now() })
				}
			},
		)
		.subscribe()
}

function stopListening() {
	if (channel) void getSupabase()?.removeChannel(channel)
	channel = null
}

/** Starts sync once. Safe to call from an effect. */
export function initSync() {
	if (started) return
	const sb = getSupabase()
	if (!sb) return
	started = true
	setInfo({ status: 'signed-out' })

	sb.auth.onAuthStateChange((event, session) => {
		if (event === 'PASSWORD_RECOVERY') setInfo({ recovery: true })
		const next = session?.user.id ?? null
		if (next === userId && next !== null) return setInfo({ loading: false })
		stopListening()
		userId = next
		setInfo({
			email: session?.user.email ?? null,
			userId: next,
			loading: false,
			status: next ? 'syncing' : 'signed-out',
			error: '',
		})
		// Do not call Supabase from inside this callback.
		if (next)
			setTimeout(() => {
				void pull(true)
				listen()
				void loadProfile(next)
			}, 0)
		else {
			clearProfile()
			// Someone else may sign in on this device next: leave nothing behind.
			if (event === 'SIGNED_OUT') wipeLocal()
		}
	})

	onLocalChange(() => {
		if (!userId) return
		window.clearTimeout(timer)
		timer = window.setTimeout(() => void push(), PUSH_DELAY)
	})

	const refresh = () => {
		if (userId && document.visibilityState === 'visible') void pull()
	}
	document.addEventListener('visibilitychange', refresh)
	window.addEventListener('online', refresh)
	window.addEventListener('focus', refresh)
}

/** Turns the most common Supabase messages into something actionable. */
export function friendlyAuthError(message: string) {
	const m = message.toLowerCase()
	if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos. Se você esqueceu, use "Esqueci a senha".'
	if (m.includes('email not confirmed')) return 'Seu e-mail ainda não foi confirmado. Abra o e-mail que enviamos e clique no link (veja também o spam).'
	if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem conta. Volte e use "Entrar" (ou "Esqueci a senha").'
	if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
		return 'Muitas tentativas ou e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.'
	if (m.includes('email signups are disabled') || m.includes('email_provider_disabled') || m.includes('provider is not enabled'))
		return `O provedor de E-mail está desligado no Supabase. Ligue em Authentication > Sign In / Providers > Email > Enable Email provider, e salve. (Supabase: ${message})`
	if (m.includes('signups not allowed') || m.includes('signup is disabled') || m.includes('signups are disabled'))
		return `Novos cadastros estão desativados no Supabase. Ligue "Allow new users to sign up" em Authentication > Sign In / Providers, e salve. (Supabase: ${message})`
	if (m.includes('database error saving new user'))
		return 'O banco recusou criar o perfil. Rode o arquivo supabase/social.sql inteiro no SQL Editor e tente de novo.'
	if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed'))
		return 'Sem conexão com o servidor. Confira sua internet e tente de novo.'
	if (m.includes('invalid api key') || m.includes('apikey')) return 'Chave do Supabase inválida na Vercel. Confira NEXT_PUBLIC_SUPABASE_ANON_KEY.'
	if (m.includes('password')) return `Senha recusada: ${message}`
	return message
}

export async function signIn(email: string, password: string) {
	try {
		const { error } = await getSupabase()!.auth.signInWithPassword({ email, password })
		return error ? friendlyAuthError(error.message) : null
	} catch (e) {
		return friendlyAuthError(String(e))
	}
}

/**
 * Creates the account. The username is turned into a public profile by the
 * database. Returns an error, or a notice when the e-mail must be confirmed.
 */
export async function signUp(email: string, password: string, username: string): Promise<{ error?: string; notice?: string }> {
	try {
		const { data, error } = await getSupabase()!.auth.signUp({ email, password, options: { data: { username } } })
		if (error) return { error: friendlyAuthError(error.message) }
		// Supabase hides existing accounts: no error, but the user has no identities.
		if (data.user && data.user.identities?.length === 0)
			return { error: friendlyAuthError('already registered') }
		if (!data.session) return { notice: 'Conta criada! Enviamos um e-mail de confirmação: abra-o e clique no link, depois volte e entre. Veja também a caixa de spam.' }
		return {}
	} catch (e) {
		return { error: friendlyAuthError(String(e)) }
	}
}

export async function usernameAvailable(username: string) {
	try {
		const { data, error } = await getSupabase()!.rpc('username_available', { u: username })
		// If the database is not prepared yet, let the sign-up continue.
		return error ? true : Boolean(data)
	} catch {
		return true
	}
}

export async function resetPassword(email: string) {
	const { error } = await getSupabase()!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
	return error?.message ?? null
}

export async function updatePassword(password: string) {
	const { error } = await getSupabase()!.auth.updateUser({ password })
	if (!error) setInfo({ recovery: false })
	return error?.message ?? null
}

export async function signOut() {
	window.clearTimeout(timer)
	// Send anything still waiting before this device is cleared.
	await push()
	await getSupabase()?.auth.signOut()
}
