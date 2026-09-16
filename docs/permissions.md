# Permissões

## Autenticação e autorização de objetos

Toda a API usa JWT (`rest_framework_simplejwt`). Por padrão, todo endpoint exige um usuário autenticado (`DEFAULT_PERMISSION_CLASSES = IsAuthenticated` em `config/settings/base.py`).

Cada recurso (transação, meta, dívida, conta, conexão bancária) é filtrado por dono já na consulta (`get_queryset` retorna só o que pertence a `request.user`) — não existe endpoint que devolva dados de outro usuário por engano. Isso é coberto por teste em `apps/transactions/tests/test_transactions.py::test_user_cannot_see_other_users_transactions`.

## Compartilhamento entre parceiros

O modelo implementado (`apps/couples`) segue o que o documento original pedia: **nada é compartilhado por padrão só por existir um vínculo** — cada vínculo (`Partnership`) tem uma `PartnershipPermission` associada com flags booleanas:

- `share_income_totals` / `share_income_details`
- `share_expense_totals` / `share_expense_details`
- `share_client_names`
- `share_goals`
- `share_debts`
- `share_accounts`

**Limitação conhecida:** essas flags são únicas por vínculo, não por direção. Ou seja, hoje não é possível a pessoa A compartilhar totais de despesa com B sem que B também compartilhe com A — é uma configuração simétrica. O documento original também sugeria isso implicitamente ("cada pessoa controla o que o parceiro vê sobre ela"), mas o modelo de dados fornecido (`PartnershipPermission` como `OneToOneField` para `Partnership`) só comporta uma configuração compartilhada. Se quiser controle assimétrico de verdade, o ajuste é trocar o `OneToOneField` por duas linhas (uma por direção) ou adicionar um `ForeignKey(User)` em `PartnershipPermission` indicando de quem é a configuração.

**Implementado:** `GET /api/dashboard/couple-summary/` (`apps/dashboards/views.py::CoupleSummaryView`) já cruza dados dos dois parceiros respeitando `share_income_totals`, `share_expense_totals`, `share_goals` e `share_debts` — testado nos dois sentidos do vínculo (quem convidou e quem foi convidado) e com o caso de "nada compartilhado" (ver `apps/dashboards/tests/test_couple_summary.py`).

**Ainda não implementado:** `share_client_names` (nomes de cliente dentro do detalhe de uma transação do parceiro) e `share_accounts` (contas financeiras do parceiro) — nenhuma tela consulta essas duas flags ainda.

## Dados sensíveis — o que este projeto deliberadamente não guarda

Seguindo a mesma lista do documento original:

- prontuários, diagnósticos ou qualquer informação clínica (o campo `service_type` de atendimentos, quando implementado, deve continuar sendo um texto livre curto, nunca um histórico)
- senhas de bancos, números completos de cartão, código de segurança, tokens bancários — a integração Pluggy nunca expõe isso à aplicação; o widget de conexão roda inteiramente no navegador do usuário, direto com a Pluggy

## Segurança já aplicada

- Senhas com hash do Django (PBKDF2 por padrão)
- JWT com rotação de refresh token e blacklist no logout (`rest_framework_simplejwt.token_blacklist`)
- CORS restrito por `CORS_ALLOWED_ORIGINS` (produção) — liberado só em `DEBUG=True`
- Todo valor financeiro em `DecimalField`, nunca `float`
- IDs sequenciais nas APIs (o documento original sugeria UUID como chave pública — **não implementado** nesta versão; se isso importar para você, é uma migração simples por app)

## Pendente antes de ir para produção de verdade

- Rate limiting (`django-ratelimit` ou similar) nos endpoints de autenticação
- Confirmar `SECURE_HSTS_SECONDS` e afins em `config/settings/production.py` contra as recomendações mais recentes do Django antes do primeiro deploy real
- Auditoria/logs de acesso (hoje só existe o log padrão do Gunicorn/Nginx)
