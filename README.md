# Financeiro

Sistema de organização financeira pessoal e compartilhada (casal), com importação automática de movimentações bancárias via Open Finance.

## Stack

- **Backend:** Python, Django, Django REST Framework, PostgreSQL (SQLite em dev local), JWT (SimpleJWT)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Recharts
- **Open Finance:** [Pluggy](https://pluggy.ai) — agregador certificado para Open Finance Brasil
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

- Cadastro, login, refresh de token, troca/recuperação de senha
- Categorias (30 padrão já populadas: despesa e receita)
- Transações: criar receita/despesa, registrar pagamento/recebimento (total ou parcial), status calculado automaticamente (Pendente → Parcial → Concluída), exclusão
- Dashboard: saldo do mês, receita/despesa prevista vs. realizada, resultado por caixa e por competência, gráfico de despesas por categoria, evolução mensal
- Metas financeiras com contribuições e progresso
- Dívidas (a pagar/a receber) com pagamentos parciais — pessoa pode ser um cliente cadastrado **ou** um nome digitado livremente
- Vínculo entre parceiros (convite/aceite/recusa) com permissões granulares de compartilhamento
- **Visão do casal no dashboard:** totais combinados dos dois parceiros, respeitando exatamente o que cada permissão de compartilhamento libera (testado nos dois sentidos do vínculo)
- **Importação via Open Finance (Pluggy):** conectar um banco, sincronizar automaticamente ao abrir o app, revisar cada movimentação importada atribuindo categoria e descrição antes dela virar uma transação real — exatamente o fluxo que você descreveu
- **Cartões de crédito:** compra no cartão vinculada à transação, cálculo automático do mês da fatura (considerando o dia de fechamento), visualização e pagamento em lote da fatura
- **Parcelamentos:** gera automaticamente as N transações mensais (última parcela absorve o arredondamento), exclusão remove todas de uma vez
- **Recorrências:** salário/aluguel/assinaturas geram lançamentos automaticamente ao abrir o dashboard, preenchendo até os meses que ficaram para trás (idempotente — não duplica)
- **Detalhamento de receita:** Salário (empresa, valor líquido/bruto, mês de referência), Atendimento e Freelancer (cliente, data, duração/prazo) — com cadastro de clientes
- **Orçamentos mensais** por categoria com alerta de percentual configurável
- **Relatórios:** exportação de transações em CSV/Excel com os mesmos filtros da tela de transações, resumo mensal em PDF
- **Exclusão de conta**, com confirmação de senha

## O que ainda não foi implementado (próximos passos)

- **Notificações** — decidido deliberadamente deixar de fora por enquanto (`apps/notifications` continua como esqueleto vazio)
- Testes automatizados do frontend (Vitest/Playwright, mencionados no documento original)
- Importação de planilhas antigas (o documento original menciona migrar dados de antes do sistema existir — baixa prioridade agora que o Open Finance cobre a entrada de dados bancários)
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

### 4. Com Docker (depois de instalar o Docker Desktop)

```bash
docker compose up --build
```

Sobe backend (Postgres real), frontend e banco juntos, já aplicando migrações e populando categorias.

## Configurando o Open Finance (Pluggy)

1. Crie uma conta em [dashboard.pluggy.ai](https://dashboard.pluggy.ai) — o sandbox é gratuito e tem bancos de teste.
2. Gere `Client ID` e `Client Secret` no dashboard.
3. Preencha no `.env`:
   ```
   PLUGGY_CLIENT_ID=...
   PLUGGY_CLIENT_SECRET=...
   ```
4. Reinicie o backend. Na tela **Importações** do app, clique em "Conectar banco".

> A integração com o widget de conexão da Pluggy (`react-pluggy-connect`) foi implementada com base na documentação pública disponível no momento — o formato exato do callback `onSuccess` não pôde ser confirmado nos documentos acessíveis e está tratado de forma defensiva em [`ImportsPage.tsx`](frontend/src/pages/ImportsPage.tsx). Ao configurar suas credenciais reais, se a conexão não completar, confira o retorno do evento no console do navegador e ajuste a extração do `itemId` conforme necessário — é a única peça desta implementação que não pude testar de ponta a ponta sem uma conta Pluggy real.

Sem as credenciais configuradas, o backend responde com um erro claro (503) em vez de quebrar — o app continua funcionando normalmente só com lançamentos manuais.

## Publicando em uma VPS

Veja o passo a passo completo em [docs/deployment.md](docs/deployment.md).

## Decisões tomadas nesta primeira versão

- **SQLite em dev, PostgreSQL em produção:** evita exigir Docker/Postgres instalado só para começar a mexer no projeto. `docker-compose.yml` já usa Postgres real quando você quiser paridade total com produção.
- **Sem Celery/Redis por enquanto:** a sincronização bancária roda sob demanda (ao abrir o dashboard, ou manualmente). Um comando `python manage.py sync_bank_connections` já existe pronto para ser chamado por cron na VPS.
- **Categorias sugeridas por palavra-chave:** ao importar uma transação bancária, o sistema tenta sugerir uma categoria por palavras-chave na descrição (ex: "ifood" → Restaurante). É só um ponto de partida — você sempre confirma ou troca antes de salvar.
- **Pacotes do frontend:** priorizei versões maduras e bem documentadas (React 19, React Router 6, Tailwind 3, Zod 3) em vez das versões mais recentes de cada biblioteca (Tailwind 4, Zod 4, React Router 7 mudam convenções o suficiente para valer a pena migrar depois, com calma, e não durante o scaffold inicial).
