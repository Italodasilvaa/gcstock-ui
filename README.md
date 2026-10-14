# GC Stock - ERP Multi-Empresas

Plataforma multi-empresa para gestão de açougues, boutiques de carnes, frigoríficos, desossa, kits de churrasco e controle financeiro.

Aplicação Angular standalone (sem backend real): todos os dados são simulados pelo `MockDataService` e persistidos no `localStorage` do navegador, com um console de "API Mock" para inspecionar as chamadas simuladas.

## Rodando localmente

Pré-requisitos: Node.js 22+.

```bash
npm install
npm start
```

A aplicação sobe em `http://localhost:3000`.

## Build de produção

```bash
npm run build
```

## Estrutura

- `src/app/core` — modelos de dados, serviços (`MockDataService`, `AppStateService`) e guards de rota.
- `src/app/shell` — layout autenticado (sidebar, navbar, modais globais).
- `src/app/features` — telas do sistema (dashboard, produtos, kits, estoque, compras, PDV, financeiro, clientes, relatórios, configurações, login).
