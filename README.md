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
