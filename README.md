# Vida

Diário, finanças, academia, leitura, projetos e conteúdo, com metas, XP e conquistas.

Os dados ficam salvos no próprio aparelho. Com uma conta, sincronizam entre celular e computador.

## Rodar localmente

```bash
npm install
npm run dev
```

## Ativar a sincronização (Supabase + Vercel)

1. **Supabase:** crie um projeto em https://supabase.com.
2. No **SQL Editor**, cole e rode o arquivo `supabase/schema.sql`.
3. Em **Authentication > Providers > Email**, deixe e-mail e senha ligados. Para entrar logo após criar a conta, desligue "Confirm email" (ou confirme pelo e-mail recebido).
4. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.
5. **Vercel:** importe este repositório em https://vercel.com/new e, em **Environment Variables**, crie:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Faça o deploy. Em **Authentication > URL Configuration** do Supabase, ponha o endereço da Vercel em *Site URL*.
7. Abra o app no celular e no computador, clique em **Entrar** no topo e use a mesma conta nos dois.

Para testar localmente com sincronização, copie `.env.example` para `.env.local` e preencha os valores.

### Como a sincronização funciona

- O aparelho continua funcionando sem internet. As edições sobem para a nuvem cerca de 1,5 s depois.
- Ao abrir o app, voltar para a aba ou reconectar, ele busca a versão mais recente.
- Vale a cópia mais nova. Na primeira vez que um aparelho que já tem dados entra numa conta que também tem dados, o app pergunta qual cópia manter.
- Cada pessoa só enxerga a própria linha no banco (Row Level Security).
- Use o menu **Dados > Exportar backup** de tempos em tempos.

## Rede social (perfis, comunidade, ranking e administração)

Depois de ativar a sincronização, rode também o arquivo `supabase/social.sql` (SQL Editor > New query > Run). Ele cria perfis, publicações, curtidas, comentários, seguidores, denúncias e o ranking, com segurança por linha.

1. **Entrar:** com o Supabase configurado, o app exige login. Cada pessoa cria a conta com **nome de usuário**, e-mail e senha.
2. **Primeiro superadmin:** no SQL Editor, rode uma vez (troque o e-mail pelo da sua conta):

   ```sql
   update public.profiles set role = 'superadmin'
   where id = (select id from auth.users where email = 'seu@email.com');
   ```

   Recarregue o app: aparece a aba **Admin**.
3. **Cargos:** `user` (usuário), `moderator` (apaga conteúdo, trata denúncias e suspende) e `superadmin` (tudo isso, mais promover cargos e excluir contas).

### O que é público e o que é privado

- **Privado (só a própria pessoa, nem o superadmin):** diário, finanças, academia, leitura, projetos, conteúdo, metas.
- **Público para quem tem conta:** nome de usuário, nome, bio, avatar, nível, XP do mês, rank, sequência, número de conquistas e as publicações que a pessoa fizer.

### Observações

- O XP é calculado no aparelho de cada pessoa e enviado ao ranking. Num grupo de amigos isso basta, mas alguém técnico poderia mandar números falsos.
- Para impedir cadastros novos, desligue **Authentication > Sign In / Providers > Allow new users to sign up** no Supabase.
- Excluir uma conta pelo painel apaga o login e todos os dados dela.

## Fotos, notificações e feed "Para você"

Rode também o arquivo `supabase/social2.sql` (SQL Editor > New query > Run). Ele cria:

- **Foto de perfil** e **fotos nas publicações** (dois buckets públicos: `avatars` até 1 MB e `posts` até 3 MB; as fotos são reduzidas no aparelho antes do envio; cada pessoa só grava na própria pasta);
- **Notificações** de novo seguidor, curtida e comentário (criadas por gatilhos no banco, sem duplicar);
- proteção para que moderadores não troquem a foto de ninguém.

Sem esse arquivo o app continua funcionando, mas a Comunidade avisa que falta rodá-lo.

### Como o feed "Para você" ordena

Não é o algoritmo do Instagram (ele é proprietário e usa aprendizado de máquina). É uma fórmula transparente, em `lib/rank.ts`, com os mesmos tipos de sinal que o Instagram descreve publicamente:

- **Atualidade:** o peso cai pela metade a cada 10 horas;
- **Relacionamento e interesse:** quem você segue pesa mais; seguir de volta e quanto você curte/comenta nos posts da pessoa aumentam o peso;
- **Popularidade:** curtidas e comentários (comentários valem o dobro), em escala logarítmica;
- **Tipo de conteúdo:** posts com foto ganham um bônus;
- **Descoberta:** estranhos muito populares ainda aparecem;
- **Variedade:** nunca três posts seguidos do mesmo autor, e posts que você já curtiu descem.

As abas **Seguindo** e **Recentes** continuam em ordem cronológica. As sugestões de quem seguir (`lib/suggest.ts`) priorizam quem já segue você, amigos em comum, rank parecido e quem é novo.

## Limites e regras oficiais (anti-spam e anti-trapaça)

Rode também `supabase/limits.sql` (depois do `social2.sql`). Os números de XP ficam em `lib/rules.ts` e precisam bater com esse arquivo.

**XP e ranking (iguais para todos, não editáveis no app)**

| Ação | XP | Limite |
|---|---|---|
| Diário | 5 | 3 por dia |
| Lançamento financeiro | 3 | 3 por dia |
| Treino | 30 | 1 por dia, mínimo 20 min |
| Leitura | 1 a cada 5 págs | 20 XP por dia |
| Tarefa concluída | 10 | 3 por dia |
| Conteúdo postado | 25 | 2 por dia |
| Bônus de 3 missões no dia | 20 | 1 por dia |
| Meta ganha | até 100 | 300 XP por mês |

- Máximo possível: **174 XP por dia**. Registros com data futura não contam.
- **Ranking do mês** (zera todo mês): Prata 500, Ouro 1.200, Platina 2.200, Diamante 3.400 XP. Diamante exige ~20 dias perfeitos.
- **Nível** (XP de toda a vida): nível 10 = 20.250 XP, nível 20 = 90.250, máximo (50) = 600.250. Conquistas contam só para o nível.
- O servidor **recalcula** rank e nível e **recusa** XP acima do máximo possível.

**Limites da comunidade:** 10 publicações/hora e 30/dia, 10 fotos/dia, 40 comentários/hora, 60 novos seguidos/hora e 500 no total, 20 denúncias/dia, nome de usuário só muda a cada 14 dias, no máximo 8 metas ativas.

**Limite honesto:** o diário, as finanças etc. são privados e ficam no aparelho; por isso o servidor não consegue conferir cada registro, só se o total é *possível*. Quem trapacear pela API não passa de 174 XP por dia, o mesmo teto de quem joga certo.
