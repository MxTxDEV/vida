/** Shrinks a photo on the device before upload, so it is fast and cheap to store. */

export const MAX_RAW_BYTES = 15 * 1024 * 1024

export async function prepareImage(file: File, opts: { max: number; square?: boolean; quality?: number }): Promise<{ blob: Blob } | { error: string }> {
	if (!file.type.startsWith('image/')) return { error: 'Escolha um arquivo de imagem (JPG, PNG ou WebP).' }
	if (file.size > MAX_RAW_BYTES) return { error: 'A imagem é muito grande (máximo 15 MB).' }
	let bitmap: ImageBitmap
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
	} catch {
		return { error: 'Não consegui abrir essa imagem.' }
	}
	let sx = 0
	let sy = 0
	let sw = bitmap.width
	let sh = bitmap.height
	if (opts.square) {
		const side = Math.min(sw, sh)
		sx = Math.floor((sw - side) / 2)
		sy = Math.floor((sh - side) / 2)
		sw = sh = side
	}
	const scale = Math.min(1, opts.max / Math.max(sw, sh))
	const w = Math.max(1, Math.round(sw * scale))
	const h = Math.max(1, Math.round(sh * scale))
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const ctx = canvas.getContext('2d')
	if (!ctx) return { error: 'Seu navegador não conseguiu preparar a imagem.' }
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, w, h)
	ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h)
	bitmap.close()
	const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', opts.quality ?? 0.82))
	if (!blob) return { error: 'Não consegui preparar a imagem.' }
	return { blob }
}
