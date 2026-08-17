# Nassau

Nassau é um jogo digital de estratégia e comércio para dois jogadores, com uma única base Expo/React Native para web, iOS e Android, um game engine determinístico compartilhado e uma API NestJS autoritativa para partidas online sem login.

## Estado do MVP

- `packages/game-engine`: regras completas de setup, porto, aquisição, troca, venda, contratos, Prestígio, fim de partida, desempates e views sanitizadas.
- `packages/game-ai`: IA offline em três níveis, consumindo somente a visão pública e a mão do próprio jogador.
- `apps/client`: menu, perfil local, configurações persistentes, contra a máquina, hotseat com tela de privacidade, venda com preview, inventário agregado, resultado e criação/entrada de salas online.
- `apps/api`: NestJS REST + Socket.IO, salas de dois jogadores, tokens de reconexão hashados, validação no engine, idempotência e versionamento de ações.

O backend inicia com um repositório em memória para o MVP local. O schema Prisma e o Docker Compose já definem a persistência PostgreSQL para a próxima etapa de deploy; substituir o repositório por Prisma não altera o engine nem o contrato de view.

## Requisitos

Node.js 22+, pnpm 9+ e, para mobile, Expo Go ou os toolchains nativos de iOS/Android.

```bash
pnpm install
cp .env.example .env
pnpm test
```

## Desenvolvimento

```bash
# Cliente Expo (web, iOS ou Android)
pnpm --filter @nassau/client dev
pnpm --filter @nassau/client web

# API NestJS
pnpm --filter @nassau/api dev

# documentação OpenAPI
open http://localhost:3000/docs
```

No web, o cliente usa `EXPO_PUBLIC_API_URL`; no mobile, configure-o para o IP acessível da máquina que executa a API. `PUBLIC_WEB_URL` define o domínio dos convites. O esquema de deep link é `nassau://join/ABCD12` e o link web é construído por ambiente.

## Banco e Docker

```bash
docker compose up --build
pnpm exec prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

O schema em `apps/api/prisma/schema.prisma` cobre `GameRoom`, `PlayerSeat` e `Game`, incluindo estado serializado versionado e hash do reconnect token. Segredos e URLs não devem ser versionados; use `.env` a partir de `.env.example`.

## Engine

O engine é TypeScript puro e não importa React, Expo, NestJS ou banco de dados. A ordem do baralho é derivada por seed. A API principal é:

```ts
createGame(config, seed)
getLegalActions(state, playerId)
applyAction(state, action)
getPlayerView(state, playerId)
getSalePreview(state, playerId, goodType, quantity)
isGameOver(state)
getResult(state)
```

O servidor nunca envia `GameState` completo: cada jogador recebe `PlayerView`, que contém sua mão e tripulação, mas só contagem pública da mão e Prestígio do oponente.

## Testes e qualidade

```bash
pnpm test
pnpm --filter @nassau/game-engine build
pnpm --filter @nassau/api build
pnpm --filter @nassau/client build
```

Os testes do engine cobrem setup com 55 itens, Porto, privacidade, aquisição, troca, mínimo de venda, valores decrescentes, contratos, esgotamento de trilhas e bônus de Tripulação. O próximo passo de produção é adicionar testes de integração Socket.IO usando o mesmo contrato de `RoomsService`.

## Cliente Unity

O projeto Unity inicial fica em [`apps/unity`](apps/unity). Ele porta o motor offline e a IA para C#, reaproveita o vídeo de carregamento e o verso das cartas, e monta a tela do jogo por código. Para abrir, instale Unity `2022.3 LTS` e adicione essa pasta no Unity Hub. A integração online continua planejada sobre a API NestJS existente; o cliente Expo segue como cliente online funcional durante essa migração.

## Builds

```bash
pnpm --filter @nassau/client exec expo export --platform web
pnpm --filter @nassau/client exec expo run:ios
pnpm --filter @nassau/client exec expo run:android
```

Assets finais podem substituir os elementos vetoriais/Unicode atuais sem alterar a lógica: mantenha a organização `assets/branding`, `assets/splash`, `assets/goods`, `assets/backgrounds`, `assets/ui` e `assets/audio`.
