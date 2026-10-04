import { useSyncExternalStore } from 'react'
import { uid, today } from './dates'
import { defaultGoals } from './game'
import type { AppState, CollKey } from './types'

const KEY = 'vida:v1'

const blank = (): AppState => ({
	ready: false,
	updatedAt: 0,
	logs: [],
	txs: [],
	workouts: [],
	books: [],
	readings: [],
	projects: [],
	tasks: [],
	posts: [],
	goals: defaultGoals(today()),
	settlements: [],
	unlocked: {},
	layout: [],
})

/** What the server (and the first client render) sees. */
const SERVER: AppState = { ...blank(), goals: [] }

let state: AppState = SERVER
let loaded = false
const listeners = new Set<() => void>()
const changeHooks = new Set<() => void>()

function merge(raw: unknown): AppState {
	const base = blank()
	if (!raw || typeof raw !== 'object') return { ...base, ready: true }
	const saved = raw as Partial<AppState>
	const next = { ...base, ready: true } as AppState
	for (const k of Object.keys(base) as (keyof AppState)[]) {
		if (k === 'ready' || saved[k] === undefined) continue
		if (typeof saved[k] === typeof base[k]) (next as unknown as Record<string, unknown>)[k] = saved[k]
	}
	return next
}

function load() {
	loaded = true
	try {
		const raw = localStorage.getItem(KEY)
		state = merge(raw ? JSON.parse(raw) : null)
	} catch {
		state = merge(null)
	}
}

function persist() {
	try {
		const { ready, ...rest } = state
		void ready
		localStorage.setItem(KEY, JSON.stringify(rest))
	} catch {
		/* storage full or blocked: keep working in memory */
	}
}

function getSnapshot() {
	if (!loaded) load()
	return state
}

function subscribe(fn: () => void) {
	listeners.add(fn)
	return () => {
		listeners.delete(fn)
	}
}

export const useApp = () => useSyncExternalStore(subscribe, getSnapshot, () => SERVER)

/** Writes `next`, saves it and tells React. Local edits also reach sync. */
function commit(next: AppState, local: boolean) {
	state = { ...next, ready: true, updatedAt: local ? Date.now() : next.updatedAt }
	persist()
	listeners.forEach((l) => l())
	if (local) changeHooks.forEach((h) => h())
}

export function mutate(fn: (s: AppState) => AppState) {
	if (!loaded) load()
	const next = fn(state)
	if (next === state) return
	commit(next, true)
}

export const getState = () => getSnapshot()

/** Called after every local edit (not after data arriving from the cloud). */
export function onLocalChange(fn: () => void) {
	changeHooks.add(fn)
	return () => {
		changeHooks.delete(fn)
	}
}

/** Replaces the data with a copy from the cloud. */
export function applyRemote(raw: unknown) {
	if (!loaded) load()
	commit(merge(raw), false)
}

type Item<K extends CollKey> = AppState[K][number]

export function addItem<K extends CollKey>(key: K, item: Omit<Item<K>, 'id'>) {
	mutate((s) => ({ ...s, [key]: [...s[key], { ...item, id: uid() }] }))
}

export function updateItem<K extends CollKey>(key: K, id: string, patch: Partial<Item<K>>) {
	mutate((s) => ({
		...s,
		[key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)),
	}))
}

export function removeItem(key: CollKey, id: string) {
	mutate((s) => ({ ...s, [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }))
}

export function exportData() {
	const { ready, ...rest } = getSnapshot()
	void ready
	return JSON.stringify(rest, null, 2)
}

export function importData(json: string) {
	commit(merge(JSON.parse(json)), true)
}

export function resetData() {
	commit({ ...blank(), ready: true }, true)
}
