# 🔊 Barulheira pra Dormir

> Skill Alexa de sons ambiente para dormir — feita para o mercado brasileiro.

Uma skill de voz construída do zero por alguém que não é dev, usando IA como copiloto técnico. O objetivo foi validar uma oportunidade real de mercado (a saída do Sleep Jar do Brasil em julho/2026) com infraestrutura de custo zero e zero risco de direitos autorais nos áudios.

---

## Por que esse projeto existe

O **Sleep Jar** — skill de sons para dormir mais popular do Brasil — encerrou operações no país em 01/07/2026, citando custos de streaming, resistência dos usuários a autenticação obrigatória e falta de ferramentas de monetização regional da Amazon. Isso deixou o mercado sem concorrente ativo.

A **Barulheira pra Dormir** foi construída para ocupar esse espaço, com uma proposta deliberadamente oposta:

| Sleep Jar | Barulheira pra Dormir |
|---|---|
| Exigia login/autenticação | Sem fricção — zero cadastro |
| Streaming de servidores nos EUA | Áudio via Cloudflare R2 (CDN global) |
| Custos variáveis de bandwidth | R2 free tier permanente, sem egress |
| Saiu do Brasil | Feita para o Brasil 🇧🇷 |

---

## Stack técnica

```
Voz do usuário
    └── Alexa Cloud (NLU, pt-BR.json)
            └── AWS Lambda (Node.js 20, ASK SDK v2)
                    ├── DynamoDB (estado: som atual, posição, loop)
                    └── Cloudflare R2 (25 MP3s, streaming direto p/ Echo)
```

**Custo operacional:** zero até dezenas de milhares de usuários (todos dentro dos free tiers de Lambda, DynamoDB e R2).

---

## 25 Sons disponíveis

Todos sintetizados do zero em Python (`numpy`/`scipy`) — zero direitos autorais.

| Categoria | Sons |
|---|---|
| Ruídos coloridos | Branco, Rosa, Marrom, Azul, Violeta |
| Chuva | Chuva, Chuva na floresta, Trovão |
| Natureza | Ondas do mar, Riacho, Floresta, Grilos, Pássaros |
| Fogo | Lareira, Fogueira |
| Ventilação | Ventilador, Ar-condicionado |
| Espacial | Nave espacial, Nave do Buda |
| Transporte | Trem, Avião |
| Corpo / Tons | Batimento cardíaco, Respiração, Tom 432Hz, OM |

---

## Como funciona

O usuário fala com o Echo e a skill responde aos comandos naturais em português:

```
"Alexa, abrir Barulheira pra Dormir"
"toque chuva"
"toque ondas do mar"
"pausar" / "continuar"
"ativar repetição" / "desativar repetição"
"parar"
```

A skill salva o som atual e a posição no DynamoDB, então uma pausa e retomada dias depois continua do mesmo ponto.

---

## Estrutura do repositório

```
barulheira-pra-dormir/
├── lambda/
│   ├── index.js          # Código principal da skill (ASK SDK v2)
│   └── package.json      # Dependências Node.js
├── models/
│   └── pt-BR.json        # Modelo de voz (intents, slots, sinônimos)
├── history/              # Versões anteriores documentadas
│   ├── v1.0-mvp-7-sons/  # Primeira versão funcional
└── CHANGELOG.md          # Evolução técnica e de produto
```

> **Os arquivos MP3 não estão no repositório** — ficam no Cloudflare R2.

---

## Sobre o projeto

Construído em julho/2026 como case de portfólio e produto real.
Todo o código foi desenvolvido com assistência de IA (Claude, Anthropic).
