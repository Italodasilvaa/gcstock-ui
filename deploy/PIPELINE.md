# Publicação do front-end

A esteira do front-end está no `azure-pipelines.yml` desta pasta raiz. O fluxo completo (branches, aprovação de produção,
backup do banco, rollback e a configuração única no Azure DevOps/DNS) está documentado junto da API, em
`gcstock-api/deploy/PIPELINE.md`.

Resumo:

- PR: só valida (`npm run lint` + `ng build`).
- Push em `stg`: publica em https://app-nprd.iwsolutions.cloud (usa a API `api-nprd`).
- Push em `prod`: publica em https://app.iwsolutions.cloud (usa a API `api`), com aprovação manual no Environment.
- A URL da API de cada ambiente é definida no build: `src/environments/environment.staging.ts` e `environment.ts` (produção).
- Build local de cada ambiente: `npx ng build --configuration staging` ou `--configuration production`.
