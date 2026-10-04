'use client'

import { useState } from 'react'
import { field, button, buttonPrimary } from './bits'

export interface Opt {
	value: string
	label: string
}

export interface Col<T> {
	key: keyof T & string
	label: string
	type: 'text' | 'number' | 'date' | 'time' | 'select' | 'check'
	/** CSS grid track, e.g. `120px` or `minmax(160px,1fr)`. */
	w: string
	options?: Opt[]
	placeholder?: string
}

interface Props<T extends { id: string }> {
	cols: Col<T>[]
	rows: T[]
	blank: () => Omit<T, 'id'>
	onAdd: (draft: Omit<T, 'id'>) => void
	onUpdate: (id: string, patch: Partial<T>) => void
	onRemove: (id: string) => void
	canAdd?: (draft: Omit<T, 'id'>) => boolean
	empty?: string
	/** Adds a copy button to every row. */
	onDuplicate?: (row: T) => void
}

type Val = string | number | boolean

const toNumber = (v: string) => Number(v.replace(',', '.')) || 0

function Input({
	col,
	value,
	onValue,
	onEnter,
	live,
}: {
	col: Col<never>
	value: Val
	onValue: (v: Val) => void
	onEnter?: () => void
	live: boolean
}) {
	const label = col.label
	if (col.type === 'check')
		return (
			<input
				type="checkbox"
				aria-label={label}
				checked={Boolean(value)}
				onChange={(e) => onValue(e.target.checked)}
				className="size-4 justify-self-start accent-[var(--primary)]"
			/>
		)
	if (col.type === 'select')
		return (
			<select
				aria-label={label}
				value={String(value)}
				onChange={(e) => onValue(e.target.value)}
				className={field}>
				{col.placeholder !== undefined && <option value="">{col.placeholder}</option>}
				{col.options?.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
				{live && value !== '' && !col.options?.some((o) => o.value === value) && (
					<option value={String(value)}>{String(value)}</option>
				)}
			</select>
		)
	const common = {
		'aria-label': label,
		placeholder: col.placeholder ?? label,
		className: `${field} ${col.type === 'number' ? 'text-right tabular-nums' : ''}`,
	}
	const type = col.type === 'number' ? 'text' : col.type
	const inputMode = col.type === 'number' ? ('decimal' as const) : undefined
	const parse = (v: string): Val => (col.type === 'number' ? toNumber(v) : v)
	const shown = col.type === 'number' && value === 0 ? '' : String(value)
	if (live)
		// Saved rows: commit when the field loses focus or Enter is pressed.
		return (
			<input
				{...common}
				type={type}
				inputMode={inputMode}
				key={shown}
				defaultValue={shown}
				onBlur={(e) => {
					const v = parse(e.target.value)
					if (v !== value) onValue(v)
				}}
				onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
			/>
		)
	return (
		<input
			{...common}
			type={type}
			inputMode={inputMode}
			value={shown}
			onChange={(e) => onValue(col.type === 'number' ? e.target.value : e.target.value)}
			onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
		/>
	)
}

/** An editable table: add a row at the top, edit any cell in place. */
export function Sheet<T extends { id: string }>({
	cols,
	rows,
	blank,
	onAdd,
	onUpdate,
	onRemove,
	canAdd,
	empty = 'Nada por aqui ainda.',
	onDuplicate,
}: Props<T>) {
	const [draft, setDraft] = useState(blank)
	const template = `${cols.map((c) => c.w).join(' ')} ${onDuplicate ? '84px' : '40px'}`
	const draftValue = (c: Col<T>) => (draft as Record<string, Val>)[c.key] ?? ''
	// Number fields are held as text while typing; validate and save numbers.
	const clean = { ...draft } as Record<string, Val>
	for (const c of cols) if (c.type === 'number') clean[c.key] = toNumber(String(clean[c.key]))
	const ok = canAdd ? canAdd(clean as Omit<T, 'id'>) : true

	const submit = () => {
		if (!ok) return
		onAdd(clean as Omit<T, 'id'>)
		setDraft(blank())
	}

	return (
		<div className="overflow-x-auto">
			<div className="min-w-[640px]">
				<div
					className="px-label grid gap-2 px-1 pb-2 !text-[11px]"
					style={{ gridTemplateColumns: template }}>
					{cols.map((c) => (
						<span key={c.key} className={c.type === 'number' ? 'text-right' : ''}>
							{c.label}
						</span>
					))}
					<span />
				</div>
				<div
					className="grid items-center gap-2 rounded-xl bg-foreground/[0.05] p-1.5"
					style={{ gridTemplateColumns: template }}>
					{cols.map((c) => (
						<Input
							key={c.key}
							col={c as Col<never>}
							live={false}
							value={draftValue(c) as Val}
							onValue={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}
							onEnter={submit}
						/>
					))}
					<button
						type="button"
						aria-label="Adicionar"
						disabled={!ok}
						onClick={submit}
						className={`${buttonPrimary} !px-0`}>
						+
					</button>
				</div>
				{rows.length === 0 && (
					<p className="px-1 py-6 text-center text-[14px] text-muted-foreground">{empty}</p>
				)}
				{rows.map((row) => (
					<div
						key={row.id}
						className="grid items-center gap-2 border-b border-border/60 p-1 last:border-0"
						style={{ gridTemplateColumns: template }}>
						{cols.map((c) => (
							<Input
								key={c.key}
								col={c as Col<never>}
								live
								value={(row as Record<string, Val>)[c.key]}
								onValue={(v) => onUpdate(row.id, { [c.key]: v } as Partial<T>)}
							/>
						))}
						<div className="flex gap-1">
							{onDuplicate && (
								<button type="button" aria-label="Duplicar linha" title="Duplicar" onClick={() => onDuplicate(row)} className={`${button} !min-h-9 !px-0 w-10`}>
									⧉
								</button>
							)}
							<button type="button" aria-label="Remover linha" title="Remover" onClick={() => onRemove(row.id)} className={`${button} !min-h-9 !px-0 w-10 text-px-red`}>
								×
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
