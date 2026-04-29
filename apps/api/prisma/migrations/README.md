# Migrations

Não há migration commitada ainda — gere uma local após configurar
`DATABASE_URL` no `.env`:

```bash
pnpm --filter @gestao-visitas/api run prisma:migrate -- --name init
```

Isso cria `prisma/migrations/<timestamp>_init/migration.sql` a partir
do `schema.prisma` e aplica no banco apontado por `DATABASE_URL`.

Em CI/produção use `prisma migrate deploy`.
