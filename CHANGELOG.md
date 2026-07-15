# Changelog — Barulheira pra Dormir

Todas as decisões técnicas e de produto relevantes, versão a versão.
Formato: [Semver simplificado] · data · descrição

---

## [2.0.0] — julho 2026 · 25 Sons Sintéticos + Loop Perfeito

### O que mudou
- **25 sons novos**, todos sintetizados do zero em Python (`numpy`/`scipy`)  
  → Zero risco de direitos autorais. Nenhum arquivo de terceiros.
- **Loop gapless**: o Lambda escuta `AudioPlayer.PlaybackNearlyFinished` e
  enfileira a próxima repetição *antes* do arquivo terminar, eliminando o
  corte audível entre loops.
- **Slot de voz `SOM`**: o usuário agora diz o nome do som ("toque chuva",
  "toque ondas do mar") em vez de receber sempre o mesmo som.
- **Gerenciamento de loop por estado**: `LoopOnIntent` e `LoopOffIntent`
  salvam a preferência no DynamoDB.
- **Segurança**: URL do R2 movida para variável de ambiente (`R2_BASE_URL`)
  — não fica mais hardcoded no código.
- `nave-do-buda` e `nave-espacial` resolvem para o mesmo arquivo no R2
  (ruído marrom filtrado, sem tons sintéticos — mais fiel ao Sleep Jar).

### Decisões técnicas aprendidas
- Normalização RMS pura enterra camadas contínuas sob transientes esparsos.
  Solução: `set_rms()` por camada *antes* do mix.
- Limiter `tanh` (soft) > limiter de pico duro para loudness percebido uniforme.
- Sons com >95% de energia abaixo de 150Hz são quase inaudíveis em Echo Dot.
- Técnica de loop sem costura: sinal construído por FFT inversa (periodicamente
  intrínseco), LFOs com ciclos inteiros, transientes via convolução circular.

---

## [1.1.0] — julho 2026 · Som Único (Nave do Buda) + DynamoDB

### O que mudou
- **Decisão estratégica**: simplificar o MVP de 7 sons para 1 único som
  (ruído rosa rebatizado como "Nave do Buda") para validar o loop.
- **DynamoDB adicionado**: a skill agora salva `currentSound`, `offsetMs`
  e `loop` entre sessões.
- **Renomeação**: projeto migrou de "Jarra de Sonhos" para
  "Barulheira pra Dormir".
- **Bug introduzido** (corrigido na v2.0): arquivo no R2 salvo com extensão
  dupla (`pink_noise.mp3.mp3`).

---

## [1.0.0] — julho 2026 · MVP de 7 Sons

### O que era
- Primeira versão funcional de ponta a ponta.
- 7 sons baixados de repositórios CC0: chuva, ruído branco, ruído rosa,
  ventilador, ondas do mar, lareira, nave espacial.
- Sem slot de voz — a skill abria e já tocava a nave espacial.
- Sem persistência — cada abertura começava do zero.
- Loop básico via `PlaybackNearlyFinished`.
- URL do R2 hardcoded no código (risco corrigido na v2.0).

### Contexto de mercado
- Projeto iniciado após confirmação de que o Sleep Jar encerrou operações
  no Brasil em 01/07/2026.
- TAM estimado: 15M usuários Alexa MAU no Brasil.
- Stack para custo zero: Lambda + R2 + DynamoDB (todos free tier).

---

## [3.0.0] — julho 2026 · Refinamento do MVP (7 Sons Curados)

### O que mudou
- **Catálogo reduzido de 25 para 7 sons**: removidos 18 sons que não passaram
  no critério de qualidade subjetiva para dormir.
- **Sons mantidos**: cachoeira, om, ondas-do-mar, ruido-branco, ruido-rosa,
  submerso, tigela-tibetana.
- **Sons removidos**: ar-condicionado, aviao, batimento-cardiaco, chuva,
  chuva-forte, espaco-profundo, floresta-noturna, grilos, lareira, nave-do-buda,
  nave-espacial, riacho, ruido-marrom, secador, tempestade, trem, ventilador, vento.
- **DEFAULT_SOUND_ID**: `chuva` → `cachoeira`.
- **R2 limpo**: 18 arquivos de áudio deletados do bucket.
- **ListSoundsIntent com fluxo de 2 etapas**: welcome curto → usuário pede
  "lista completa" → Alexa lista as 7 opções por categoria.
- **Categorias**: Natureza (cachoeira, ondas-do-mar), Relaxamento (om,
  tigela-tibetana, submerso), Ruídos (ruido-branco, ruido-rosa).
- **R2_BASE hardcoded**: revertido para URL direta (sem env var) para simplificar.
- **ZIP de deploy corrigido**: recriado do zero com `npm install` limpo para
  garantir `node_modules/` na raiz (sem prefixo `lambda/`).

### Decisões técnicas aprendidas
- ZIP do Lambda deve ser criado com `cd <dir> && zip -r out.zip .` — nunca
  `zip -r out.zip <dir>/` de fora, pois isso nesta a estrutura e causa
  `Runtime.ImportModuleError: Cannot find module 'index'`.
- Solução mais robusta: criar diretório fresh + `npm install` + zip, em vez de
  baixar o ZIP existente do Lambda e reutilizá-lo.
- Slot `samples` dentro da definição do slot (e não do intent) causa erro
  "not supported in a skill without a dialog model" no build do modelo Alexa.
