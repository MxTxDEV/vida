'use client'

import { useId } from 'react'
import {
	Bell,
	Camera,
	Check,
	Clapperboard,
	Flag,
	Heart,
	Medal,
	MessageCircle,
	Repeat2,
	ShieldCheck,
	Trash2,
	UserRound,
	Users,
	Dumbbell,
	Flame,
	LayoutDashboard,
	NotebookPen,
	BookOpen,
	SlidersHorizontal,
	SquareCheckBig,
	Star,
	Trophy,
	Wallet,
	type LucideIcon,
} from 'lucide-react'

/* ------------------------------------------------------------------ *
 * Rank badges: a shield with a gradient and one emblem per rank
 * ------------------------------------------------------------------ */

const RANKS: { name: string; stops: [string, string, string]; inner: string }[] = [
	{ name: 'Bronze', stops: ['#f6c08c', '#d98b45', '#9a5322'], inner: '#5a2f12' },
	{ name: 'Prata', stops: ['#f8fafc', '#cbd5e1', '#8492a6'], inner: '#394557' },
	{ name: 'Ouro', stops: ['#fff1b0', '#fbbf24', '#c27a06'], inner: '#6b4203' },
	{ name: 'Platina', stops: ['#c8fff4', '#5eead4', '#0f9f90'], inner: '#0b4a45' },
	{ name: 'Diamante', stops: ['#e0f2fe', '#7dd3fc', '#818cf8'], inner: '#1e2a6b' },
]

const SHIELD = 'M24 2 L44 10 V28 C44 40 35 49 24 54 C13 49 4 40 4 28 V10 Z'
const INNER = 'M24 8 L38.5 14 V28 C38.5 37 32 43.5 24 47.5 C16 43.5 9.5 37 9.5 28 V14 Z'
const STAR = 'M24 17 L27.2 24.2 L35 25 L29.1 30.2 L30.9 38 L24 34 L17.1 38 L18.9 30.2 L13 25 L20.8 24.2 Z'
const GEM = 'M16 20 H32 L37 26 L24 40 L11 26 Z M11 26 H37 M20 20 L17 26 L24 40 L31 26 L28 20'

export function RankBadge({ index, size = 3 }: { index: number; size?: number }) {
	const i = Math.max(0, Math.min(4, index))
	const r = RANKS[i]
	const id = useId().replace(/:/g, '')
	const px = size * 14
	return (
		<svg
			viewBox="0 0 48 56"
			width={px}
			height={(px * 56) / 48}
			role="img"
			aria-label={`Insígnia ${r.name}`}
			style={{ flexShrink: 0, filter: `drop-shadow(0 4px 10px ${r.stops[1]}55)` }}>
			<defs>
				<linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={r.stops[0]} />
					<stop offset="0.5" stopColor={r.stops[1]} />
					<stop offset="1" stopColor={r.stops[2]} />
				</linearGradient>
			</defs>
			<path d={SHIELD} fill={`url(#g${id})`} />
			<path d={INNER} fill={r.inner} fillOpacity="0.9" />
			{i === 4 ? (
				<path d={GEM} fill={`url(#g${id})`} stroke={r.inner} strokeWidth="0.8" strokeLinejoin="round" />
			) : (
				<path d={STAR} fill={`url(#g${id})`} />
			)}
		</svg>
	)
}

/* ------------------------------------------------------------------ *
 * Line icons
 * ------------------------------------------------------------------ */

const ICONS: Record<string, LucideIcon> = {
	painel: LayoutDashboard,
	diario: NotebookPen,
	financas: Wallet,
	academia: Dumbbell,
	leitura: BookOpen,
	projetos: SquareCheckBig,
	conteudo: Clapperboard,
	metas: Trophy,
	opcoes: SlidersHorizontal,
	fogo: Flame,
	estrela: Star,
	check: Check,
	comunidade: Users,
	ranking: Medal,
	admin: ShieldCheck,
	perfil: UserRound,
	curtir: Heart,
	comentar: MessageCircle,
	denunciar: Flag,
	repostar: Repeat2,
	lixeira: Trash2,
	sino: Bell,
	foto: Camera,
}

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
	const Cmp = ICONS[name] ?? Star
	return <Cmp size={size} strokeWidth={1.75} aria-hidden="true" />
}

/* ------------------------------------------------------------------ *
 * Level ring: lifetime level inside a progress circle
 * ------------------------------------------------------------------ */

export function LevelRing({ level, pct, size = 72 }: { level: number; pct: number; size?: number }) {
	const r = 42
	const c = 2 * Math.PI * r
	return (
		<svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Nível ${level}`} style={{ flexShrink: 0 }}>
			<circle cx="50" cy="50" r={r} fill="none" strokeWidth="6" style={{ stroke: 'var(--border)' }} />
			<circle
				cx="50"
				cy="50"
				r={r}
				fill="none"
				strokeWidth="6"
				strokeLinecap="round"
				strokeDasharray={`${Math.max(0.001, pct) * c} ${c}`}
				transform="rotate(-90 50 50)"
				style={{ stroke: 'var(--primary)', transition: 'stroke-dasharray 0.6s ease' }}
			/>
			<text x="50" y="56" textAnchor="middle" fontSize="30" style={{ fill: 'var(--foreground)', fontFamily: 'var(--font-display), sans-serif', fontWeight: 600 }}>
				{level}
			</text>
		</svg>
	)
}
