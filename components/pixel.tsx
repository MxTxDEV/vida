import type { CSSProperties } from 'react'

/**
 * Pixel art drawn from text grids. Each character is one pixel; `.` is
 * empty. Rows are padded to the widest one so a typo cannot break the art.
 */
export function Pixel({
	art,
	colors,
	size = 3,
	label,
	className,
}: {
	art: string[]
	colors: Record<string, string>
	size?: number
	label?: string
	className?: string
}) {
	const w = Math.max(...art.map((r) => r.length))
	const rects: { x: number; y: number; w: number; c: string }[] = []
	art.forEach((row, y) => {
		const line = row.padEnd(w, '.')
		for (let x = 0; x < w; ) {
			const c = line[x]
			if (c === '.' || !colors[c]) {
				x++
				continue
			}
			let n = 1
			while (line[x + n] === c) n++
			rects.push({ x, y, w: n, c })
			x += n
		}
	})
	return (
		<svg
			viewBox={`0 0 ${w} ${art.length}`}
			width={w * size}
			height={art.length * size}
			shapeRendering="crispEdges"
			role={label ? 'img' : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			className={className}
			style={{ imageRendering: 'pixelated', flexShrink: 0 } as CSSProperties}>
			{rects.map((r, i) => (
				<rect key={i} x={r.x} y={r.y} width={r.w} height={1} style={{ fill: colors[r.c] }} />
			))}
		</svg>
	)
}

/* ------------------------------------------------------------------ *
 * Rank badges: o outline, h light, b base, s shade, e emblem
 * ------------------------------------------------------------------ */

const SHIELD = [
	'..oooooooooo..',
	'.ohhhbbbbbbso.',
	'ohhhbbbbbbbbso',
	'ohhbbbbbbbbbso',
	'ohhbbbbeebbbso',
	'ohhbbbeeeebbso',
	'ohhbeeeeeeebso',
	'ohhbbbeeeebbso',
	'ohhbbeebbeebso',
	'ohhbbbbbbbbbso',
	'.ohhbbbbbbbso.',
	'..ohbbbbbbso..',
	'...ohbbbbso...',
	'....ohbbso....',
	'.....obbo.....',
	'......oo......',
]

const GEM = [
	'..oooooooooo..',
	'.ohhwwbbbbbbo.',
	'ohhwwbbbbbbbbo',
	'oooooooooooooo',
	'.ohhwbbbbbbso.',
	'..ohhbbbbbso..',
	'...ohbbbbso...',
	'....ohbbso....',
	'.....obbo.....',
	'......oo......',
]

const BADGE_COLORS: Record<string, string>[] = [
	{ o: '#3a1f0a', h: '#e8a56a', b: '#cd7f32', s: '#8a5320', e: '#ffe9c9' }, // bronze
	{ o: '#2b3340', h: '#f1f4f9', b: '#c0c7d1', s: '#8791a1', e: '#ffffff' }, // prata
	{ o: '#5a3a00', h: '#fff0a0', b: '#ffc83d', s: '#c98a00', e: '#fff8d6' }, // ouro
	{ o: '#0b3b3a', h: '#b8fff4', b: '#5fd7c8', s: '#2a9d8f', e: '#ffffff' }, // platina
	{ o: '#0b2a4a', h: '#c9f4ff', b: '#4cc9f0', s: '#1e88c9', w: '#ffffff', e: '#ffffff' }, // diamante
]

export function RankBadge({ index, size = 3 }: { index: number; size?: number }) {
	const i = Math.max(0, Math.min(4, index))
	const names = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante']
	return (
		<Pixel
			art={i === 4 ? GEM : SHIELD}
			colors={BADGE_COLORS[i]}
			size={size}
			label={`Insígnia ${names[i]}`}
		/>
	)
}

/* ------------------------------------------------------------------ *
 * Menu icons: single colour, follows the text colour
 * ------------------------------------------------------------------ */

const ICONS: Record<string, string[]> = {
	painel: ['xxxx.xxxx', 'xxxx.xxxx', 'xxxx.xxxx', 'xxxx.xxxx', '.........', 'xxxx.xxxx', 'xxxx.xxxx', 'xxxx.xxxx', 'xxxx.xxxx'],
	diario: ['xxxxxxxx.', 'x......x.', 'x.xxxx.x.', 'x......x.', 'x.xxxx.x.', 'x......x.', 'x.xxx..x.', 'x......x.', 'xxxxxxxx.'],
	financas: ['..xxxxx..', '.xx...xx.', 'xx..x..xx', 'x..xxx..x', 'x...x...x', 'x..xxx..x', 'xx..x..xx', '.xx...xx.', '..xxxxx..'],
	academia: ['.........', 'x.......x', 'xx.....xx', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx', 'xx.....xx', 'x.......x', '.........'],
	leitura: ['xxxxxxxxx', 'x...x...x', 'x.x.x.x.x', 'x...x...x', 'x.x.x.x.x', 'x...x...x', 'x.x.x.x.x', 'x...x...x', 'xxxxxxxxx'],
	projetos: ['xxxxxxxxx', 'x.......x', 'x......xx', 'x.....x.x', 'xx...x..x', 'x.x.x...x', 'x..x....x', 'x.......x', 'xxxxxxxxx'],
	conteudo: ['x........', 'xxx......', 'xxxxx....', 'xxxxxxx..', 'xxxxxxxxx', 'xxxxxxx..', 'xxxxx....', 'xxx......', 'x........'],
	metas: ['xxxxxxxxx', 'x.xxxxx.x', 'x.xxxxx.x', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....', '...xxx...', '..xxxxx..'],
	opcoes: ['.........', 'xxxxxxxxx', '....xx...', '.........', 'xxxxxxxxx', '.xx......', '.........', 'xxxxxxxxx', '......xx.'],
	fogo: ['....x....', '...xx....', '...xxx.x.', '..xxxxxx.', '.xxxxxxxx', '.xxx.xxxx', '.xxx..xxx', '..xxx.xx.', '...xxxx..'],
	estrela: ['....x....', '....x....', '...xxx...', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '..xx.xx..', '.xx...xx.', '.x.....x.'],
	check: ['.........', '.......xx', '......xx.', 'xx...xx..', 'xxx.xx...', '.xxxx....', '..xx.....', '.........', '.........'],
}

export function PixelIcon({ name, size = 2 }: { name: keyof typeof ICONS | string; size?: number }) {
	const art = ICONS[name] ?? ICONS.estrela
	return <Pixel art={art} colors={{ x: 'currentColor' }} size={size} />
}

/* ------------------------------------------------------------------ *
 * Hero sprite for the level card
 * ------------------------------------------------------------------ */

const HERO = [
	'....oooo....',
	'...ohhhho...',
	'..ohhhhhho..',
	'..offffffo..',
	'..ofkffkfo..',
	'..offffffo..',
	'...oooooo...',
	'..obbbbbbo..',
	'.ofobbbbofo.',
	'.ofobbyybofo.',
	'..oobbbbboo.',
	'...obbbbbo..',
	'...obo.obo..',
	'...ooo.ooo..',
]

export function Hero({ size = 4 }: { size?: number }) {
	return (
		<Pixel
			art={HERO}
			size={size}
			label="Seu herói"
			colors={{ o: '#1a1030', h: '#ffd84a', f: '#ffcba4', k: '#1a1030', b: '#4cc9f0', y: '#ffd84a' }}
		/>
	)
}
