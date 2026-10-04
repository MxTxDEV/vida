import { useSyncExternalStore } from 'react'
import { getSupabase } from './supabase'
import { applyRemote, getState, onLocalChange } from './store'

export type SyncStatus = 'off' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'

interface Info {
	status: SyncStatus
	email: string | null
	lastSync: number
	error: string
}

const SERVER: Info = { status: 'off', email: null, lastSync: 0, error: '' }
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

	sb.auth.onAuthStateChange((_event, session) => {
		const next = session?.user.id ?? null
		if (next === userId && next !== null) return
		stopListening()
		userId = next
		setInfo({ email: session?.user.email ?? null, status: next ? 'syncing' : 'signed-out', error: '' })
		// Do not call Supabase from inside this callback.
		if (next)
			setTimeout(() => {
				void pull(true)
				listen()
			}, 0)
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

export async function signIn(email: string, password: string) {
	const { error } = await getSupabase()!.auth.signInWithPassword({ email, password })
	return error?.message ?? null
}

export async function signUp(email: string, password: string) {
	const { data, error } = await getSupabase()!.auth.signUp({ email, password })
	if (error) return error.message
	return data.session ? null : 'Confirme seu e-mail (veja a caixa de entrada) e depois entre.'
}

export async function signOut() {
	window.clearTimeout(timer)
	await getSupabase()?.auth.signOut()
}
