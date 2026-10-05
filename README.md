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
