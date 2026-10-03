# Financeiro

Sistema de organização financeira pessoal e compartilhada (casal), com importação de movimentações bancárias a partir de extratos OFX.

## Stack

- **Backend:** Python, Django, Django REST Framework, PostgreSQL (SQLite em dev local), JWT (SimpleJWT)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Recharts
- **Importação bancária:** extratos OFX (`ofxparse`) — sem integração com terceiros, veja [por quê](#importando-extratos-bancários-ofx)
- **Infraestrutura:** Docker, Docker Compose, Nginx, Gunicorn, Let's Encrypt

## Estrutura do repositório

```
financeiro/
├── backend/          Django + DRF
├── frontend/         React + Vite
├── infrastructure/   nginx, scripts de deploy/backup, systemd
└── docs/             documentação detalhada
```

Veja [docs/architecture.md](docs/architecture.md) para a visão geral de cada app do backend e cada pasta do frontend.

## O que já funciona (validado ponta a ponta)

- Cadastro com confirmação de e-mail (link enviado por e-mail, obrigatório para entrar), login, refresh de token, troca/recuperação de senha
- Categorias (30 padrão já populadas: despesa e receita)
- Transações: criar receita/despesa, registrar pagamento/recebimento (total ou parcial), status calculado automaticamente (Pendente → Parcial → Concluída), exclusão
- Dashboard: saldo do mês, receita/despesa prevista vs. realizada, resultado por caixa e por competência, gráfico de despesas por categoria, evolução mensal
- Metas financeiras com contribuições e progresso
- Dívidas (a pagar/a receber) com pagamentos parciais — pessoa pode ser um cliente cadastrado **ou** um nome digitado livremente
- Vínculo entre parceiros (convite/aceite/recusa) com permissões granulares de compartilhamento
- **Visão do casal no dashboard:** totais combinados dos dois parceiros, respeitando exatamente o que cada permissão de compartilhamento libera (testado nos dois sentidos do vínculo)
- **Importação de extrato bancário (OFX):** exporte o extrato do seu banco (funciona com qualquer banco que ofereça OFX — a grande maioria) e importe aqui; revise cada movimentação atribuindo categoria e descrição antes dela virar uma transação real
- **Cartões de crédito:** compra no cartão vinculada à transação, cálculo automático do mês da fatura (considerando o dia de fechamento), visualização e pagamento em lote da fatura
- **Parcelamentos:** gera automaticamente as N transações mensais (última parcela absorve o arredondamento), exclusão remove todas de uma vez
- **Recorrências:** salário/aluguel/assinaturas geram lançamentos automaticamente ao abrir o dashboard, preenchendo até os meses que ficaram para trás (idempotente — não duplica)
- **Detalhamento de receita:** Salário (empresa, valor líquido/bruto, mês de referência), Atendimento e Freelancer (cliente, data, duração/prazo) — com cadastro de clientes
- **Orçamentos mensais** por categoria com alerta de percentual configurável
- **Relatórios:** exportação de transações em CSV/Excel com os mesmos filtros da tela de transações, resumo mensal em PDF
- **Exclusão de conta**, com confirmação de senha
- **Testes automatizados:** 48 testes de backend (pytest) + 69 de frontend (Vitest + React Testing Library) — veja [Testes](#testes) abaixo

## O que ainda não foi implementado (próximos passos)

- **Notificações** — decidido deliberadamente deixar de fora por enquanto (`apps/notifications` continua como esqueleto vazio)
- Testes end-to-end de navegador (Playwright) — os testes de frontend hoje são unitários/integração (Vitest + Testing Library), sem um navegador real
- Importação de planilhas antigas (o documento original menciona migrar dados de antes do sistema existir — baixa prioridade agora que a importação de extrato OFX cobre a entrada de dados bancários correntes)
- Importação via CSV — hoje só OFX é suportado; CSV exigiria mapeamento manual de colunas por não ser um formato padronizado entre bancos
- `share_client_names` e `share_accounts` (duas das permissões do casal) ainda não são consultadas em nenhuma tela — hoje a visão do casal cobre totais de receita/despesa, metas e dívidas do parceiro

## Rodando localmente

### Pré-requisitos

- Python 3.11+ (testado com 3.14)
- Node.js 20+ (testado com 24)
- Git

Docker é opcional para desenvolvimento local — o backend já roda com SQLite sem precisar de banco separado. Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) quando quiser testar com PostgreSQL real ou preparar o deploy.

### 1. Variáveis de ambiente

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

O `.env` da raiz já vem com `DATABASE_HOST` em branco — assim o backend usa SQLite localmente sem esforço. Gere uma `SECRET_KEY` própria:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

e cole no lugar de `change-me` no `.env`.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac
pip install -r requirements/development.txt

python manage.py migrate
python manage.py seed_categories
python manage.py createsuperuser   # opcional, acesso a /admin/

python manage.py runserver
```

Backend em `http://localhost:8000`. Admin em `http://localhost:8000/admin/`.

Rodar os testes:

```bash
python -m pytest
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend em `http://localhost:5173`.

Rodar os testes:

```bash
npm test           # roda uma vez
npm run test:watch # modo watch
```

### 4. Com Docker (depois de instalar o Docker Desktop)

```bash
docker compose up --build
```

Sobe backend (Postgres real), frontend e banco juntos, já aplicando migrações e populando categorias.

## Importando extratos bancários (OFX ou CSV)

O projeto começou com integração via Open Finance (Pluggy), mas o custo de produção da Pluggy (a partir de R$ 2.500/mês, sem plano gratuito real — só um teste de 15 dias) inviabiliza esse caminho para um app pessoal/casal. A troca foi por importação de extrato:

- **OFX** — formato já padronizado e oferecido pela grande maioria dos bancos e fintechs brasileiros (Nubank, Santander, Itaú, Bradesco, Inter, C6, Caixa, Banco do Brasil, entre outros). Um único parser cobre qualquer banco que exporte OFX.
- **CSV** — alguns bancos (ex: PicPay) só oferecem PDF ou CSV, sem opção de OFX. Diferente do OFX, o CSV **não é padronizado** — cada banco usa colunas diferentes — então cada formato precisa de um parser próprio. Hoje só o CSV do **PicPay** é suportado; outros bancos podem ser adicionados depois em `backend/apps/bank_integration/services/parsers/`.

Passo a passo:

1. No app do seu banco, exporte o extrato do período desejado (formato OFX quando disponível; senão, CSV se for um dos bancos suportados).
2. Cadastre uma conta financeira no app (tela **Contas**), se ainda não tiver uma.
3. Na tela **Importações**, selecione a conta e envie o arquivo (`.ofx`, `.qfx` ou `.csv`) — o formato é detectado pela extensão.
4. Revise cada movimentação importada, confirmando categoria e descrição (ou ignore as que não interessam).

Reimportar um extrato com datas sobrepostas não duplica lançamentos — cada transação recebe um identificador único (o `FITID` no OFX; um hash das colunas da linha no CSV, já que ele não tem um ID próprio) usado para pular o que já foi importado antes para aquela conta.

## Testes

| Camada | Ferramenta | Comando | Cobertura |
|---|---|---|---|
| Backend | pytest + pytest-django | `python -m pytest` (dentro de `backend/`, venv ativa) | 96 testes — models, services, permissões entre usuários, exportações, visão do casal, confirmação de e-mail e limites de tentativa |
| Frontend | Vitest + React Testing Library | `npm test` (dentro de `frontend/`) | 98 testes — utils, schemas Zod, componentes de UI, `AuthContext`, fluxo de login, cadastro e confirmação de e-mail |

Escrever esses testes revelou dois bugs reais que passavam despercebidos em teste manual no navegador:

- **Valor com milhar quebrava o formulário:** `total_amount.replace(",", ".")` só troca a primeira vírgula, então "1.234,56" virava "1.234.56" (dois pontos, `NaN`). Qualquer lançamento a partir de R$ 1.000 falhava silenciosamente na validação. Corrigido com [`parseCurrencyInput`](frontend/src/utils/currency.ts), que remove os separadores de milhar antes de trocar a vírgula decimal — usado agora nos 9 lugares que antes faziam esse replace direto.
- **Mensagem de erro em português nunca aparecia:** os formulários não tinham `noValidate`, então o navegador (ou o jsdom, no teste) bloqueava o `submit` pela validação nativa do HTML5 (`type="email"` etc.) antes do React Hook Form/Zod rodarem — o usuário via a bolha genérica do navegador em vez de "E-mail inválido". Adicionado `noValidate` nos 7 formulários do app.

## Publicando em uma VPS

Veja o passo a passo completo em [docs/deployment.md](docs/deployment.md).

## Decisões tomadas nesta primeira versão

- **SQLite em dev, PostgreSQL em produção:** evita exigir Docker/Postgres instalado só para começar a mexer no projeto. `docker-compose.yml` já usa Postgres real quando você quiser paridade total com produção.
- **Sem Celery/Redis por enquanto:** a sincronização bancária roda sob demanda (ao abrir o dashboard, ou manualmente). Um comando `python manage.py sync_bank_connections` já existe pronto para ser chamado por cron na VPS.
- **Categorias sugeridas por palavra-chave:** ao importar uma transação bancária, o sistema tenta sugerir uma categoria por palavras-chave na descrição (ex: "ifood" → Restaurante). É só um ponto de partida — você sempre confirma ou troca antes de salvar.
- **Pacotes do frontend:** priorizei versões maduras e bem documentadas (React 19, React Router 6, Tailwind 3, Zod 3) em vez das versões mais recentes de cada biblioteca (Tailwind 4, Zod 4, React Router 7 mudam convenções o suficiente para valer a pena migrar depois, com calma, e não durante o scaffold inicial).
