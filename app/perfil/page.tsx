'use client'

import { useRef, useState } from 'react'
import { PageHeader, Panel } from '@/components/bits'
import { Avatar } from '@/components/social-ui'
import { prepareImage } from '@/lib/images'
import { ROLE_LABEL, setMyAvatar, updateMyProfile, USERNAME_RE, useMe, type Profile } from '@/lib/social'
import { updatePassword } from '@/lib/sync'

const EMOJIS = ['🙂', '😎', '🤓', '🧠', '💪', '🏃', '📚', '🚀', '🔥', '🌱', '🎯', '🦊', '🐺', '🦉', '🐙', '⚡']
const COLORS = ['#8ab4ff', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#2dd4bf', '#f97316', '#e879f9']

function Form({ me }: { me: Profile }) {
	const [username, setUsername] = useState(me.username)
	const [name, setName] = useState(me.display_name)
	const [bio, setBio] = useState(me.bio)
	const [avatar, setAvatar] = useState(me.avatar)
	const [color, setColor] = useState(me.color)
	const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
	const [pw, setPw] = useState('')
	const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

	const photoInput = useRef<HTMLInputElement>(null)
	const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null)
	const [photoBusy, setPhotoBusy] = useState(false)

	const changePhoto = async (f: File | undefined) => {
		if (!f) return
		setPhotoBusy(true)
		setPhotoMsg(null)
		const r = await prepareImage(f, { max: 512, square: true, quality: 0.85 })
		if ('error' in r) {
			setPhotoBusy(false)
			return setPhotoMsg({ ok: false, text: r.error })
		}
		const err = await setMyAvatar(r.blob)
		setPhotoBusy(false)
		setPhotoMsg(err ? { ok: false, text: err } : { ok: true, text: 'Foto atualizada.' })
	}

	const save = async () => {
		const u = username.trim().toLowerCase()
		if (!USERNAME_RE.test(u)) return setMsg({ ok: false, text: 'Use de 3 a 20 letras minúsculas, números ou _ no nome de usuário.' })
		const err = await updateMyProfile({ username: u, display_name: name.trim(), bio: bio.trim(), avatar, color })
		setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Perfil salvo.' })
	}

	return (
		<div className="grid gap-4">
			<Panel title="Aparência pública">
				<div className="grid gap-5 sm:grid-cols-[auto_1fr]">
					<div className="flex flex-col items-center gap-3">
						<Avatar emoji={avatar} color={color} path={me.avatar_path} size={96} />
						<input ref={photoInput} type="file" accept="image/*" hidden data-testid="avatar-file" onChange={(e) => { void changePhoto(e.target.files?.[0]); e.target.value = '' }} />
						<button className="px-btn !min-h-8 text-[13px]" disabled={photoBusy} onClick={() => photoInput.current?.click()}>
							{photoBusy ? 'Enviando…' : me.avatar_path ? 'Trocar foto' : 'Enviar foto'}
						</button>
						{me.avatar_path && (
							<button className="text-[12px] text-muted-foreground hover:text-px-red" disabled={photoBusy} onClick={async () => { setPhotoBusy(true); const err = await setMyAvatar(null); setPhotoBusy(false); setPhotoMsg(err ? { ok: false, text: err } : { ok: true, text: 'Foto removida.' }) }}>
								Remover foto
							</button>
						)}
						{photoMsg && <span className={`max-w-[200px] text-center text-[12px] ${photoMsg.ok ? 'text-px-green' : 'text-px-red'}`}>{photoMsg.text}</span>}
						<span className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-muted-foreground">{ROLE_LABEL[me.role]}</span>
					</div>
					<div className="grid gap-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="grid gap-1.5"><span className="px-label">Nome de usuário</span>
								<input className="px-input" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
							</label>
							<label className="grid gap-1.5"><span className="px-label">Nome de exibição</span>
								<input className="px-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
							</label>
						</div>
						<label className="grid gap-1.5"><span className="px-label">Bio ({bio.length}/160)</span>
							<textarea className="px-input !h-auto min-h-[70px] py-2" value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} />
						</label>
						<div>
							<p className="px-label mb-2">Ou escolha um emoji (aparece quando você não tem foto)</p>
							<div className="flex flex-wrap gap-1.5">
								{EMOJIS.map((e) => (
									<button key={e} aria-pressed={avatar === e} aria-label={`Avatar ${e}`} onClick={() => setAvatar(e)} className="px-btn !min-h-10 !w-10 !p-0 text-[20px]">{e}</button>
								))}
							</div>
						</div>
						<div>
							<p className="px-label mb-2">Cor</p>
							<div className="flex flex-wrap gap-2">
								{COLORS.map((c) => (
									<button key={c} aria-label={`Cor ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={`size-8 rounded-full ${color === c ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''}`} style={{ background: c }} />
								))}
							</div>
						</div>
						<div className="flex items-center gap-3">
							<button className="px-btn-primary" onClick={save}>Salvar perfil</button>
							{msg && <span className={`text-[13px] ${msg.ok ? 'text-px-green' : 'text-px-red'}`}>{msg.text}</span>}
						</div>
					</div>
				</div>
			</Panel>

			<Panel title="Senha">
				<form
					className="flex flex-wrap items-center gap-3"
					onSubmit={async (e) => {
						e.preventDefault()
						if (pw.length < 6) return setPwMsg({ ok: false, text: 'A senha precisa ter pelo menos 6 caracteres.' })
						const err = await updatePassword(pw)
						setPwMsg(err ? { ok: false, text: err } : { ok: true, text: 'Senha alterada.' })
						if (!err) setPw('')
					}}>
					<input className="px-input w-64" type="password" autoComplete="new-password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} />
					<button className="px-btn" type="submit">Alterar senha</button>
					{pwMsg && <span className={`text-[13px] ${pwMsg.ok ? 'text-px-green' : 'text-px-red'}`}>{pwMsg.text}</span>}
				</form>
			</Panel>
		</div>
	)
}

export default function Page() {
	const { profile } = useMe()
	return (
		<>
			<PageHeader title="Meu perfil" hint="É isto que as outras pessoas veem. Seu diário, finanças e treinos continuam privados." />
			{profile && <Form key={profile.id + profile.username} me={profile} />}
		</>
	)
}
