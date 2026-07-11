# Como subir esse projeto no GitHub com histórico real

Este guia recria o histórico de commits que conta a evolução do projeto,
do MVP inicial até a versão atual com 25 sons.

---

## 1. Criar o repositório no GitHub

1. Acesse https://github.com/new
2. Nome sugerido: `barulheira-pra-dormir`
3. Deixe **público** (é o portfólio)
4. **Não** marque "Add a README" — vamos subir o nosso
5. Clique **Create repository**

---

## 2. Criar os commits históricos

### Commit 1 — Estrutura inicial do projeto

```bash
git add .gitignore README.md CHANGELOG.md
git commit --date="2026-07-09T10:00:00" -m "chore: estrutura inicial do projeto"
```

### Commit 2 — v1.0: MVP com 7 sons CC0

```bash
git add lambda/index.js
git commit --date="2026-07-09T11:30:00" -m "feat: v1.0 MVP com 7 sons CC0 e loop básico"
```

### Commit 3 — v1.1: Simplificação para som único + DynamoDB

```bash
git add lambda/index.js
git commit --date="2026-07-09T18:00:00" -m "feat: v1.1 MVP som único (Nave do Buda) + DynamoDB"
```

### Commit 4 — v2.0

```bash
git add lambda/index.js lambda/package.json
git commit --date="2026-07-11T02:00:00" -m "feat: v2.0 — 25 sons sintéticos, loop gapless, slot SOM, segurança R2"
```

### Commit 5 — Histórico de versões e docs

```bash
git add history/ CHANGELOG.md SETUP-GIT.md
git commit --date="2026-07-11T03:00:00" -m "docs: histórico de versões e guia de setup"
```

---

## 3. Subir para o GitHub

```bash
git remote add origin https://github.com/feevideira/barulheira-pra-dormir.git
git branch -M main
git push -u origin main
```

---

## ⚠️ Checklist de segurança antes de tornar público

- [ ] `R2_BASE_URL` não aparece em nenhum arquivo commitado
- [ ] Nenhum arquivo `.env` foi commitado
- [ ] `node_modules/` não foi commitado
- [ ] Nenhuma chave AWS, ARN ou token no código
