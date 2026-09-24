# Deploy em VPS

Passo a passo para publicar o sistema em uma VPS (Ubuntu 22.04/24.04 como referência).

Este guia parte do cenário mais simples: **você tem só o IP da VPS, ainda sem domínio.** O site já fica acessível e funcional em `http://SEU_IP` ao final do passo 4. Quando você registrar um domínio, veja [Ativando HTTPS quando você tiver um domínio](#ativando-https-quando-você-tiver-um-domínio) — é a única parte que muda.

## 1. Preparar a VPS

> Usando Oracle Cloud (OCI)? Antes de tudo, veja [oracle-cloud-setup.md](oracle-cloud-setup.md) — lá tem como criar a instância certa e evitar a pegadinha de rede/firewall específica da Oracle.

```bash
sudo apt update && sudo apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# saia e entre de novo na sessão SSH para o grupo fazer efeito

# Firewall básico
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Clonar o projeto

```bash
sudo mkdir -p /opt/financeiro
sudo chown $USER:$USER /opt/financeiro
git clone <url-do-seu-repositorio> /opt/financeiro
cd /opt/financeiro
```

## 3. Configurar variáveis de ambiente de produção

```bash
cp .env.example .env
nano .env
```

Preencha com valores reais e diferentes dos de desenvolvimento:

- `SECRET_KEY`: gere com `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
- `DEBUG=False`
- `DATABASE_PASSWORD`: uma senha forte
- `ALLOWED_HOSTS=SEU_IP` (o IP público da VPS, ex: `203.0.113.10`)
- `CORS_ALLOWED_ORIGINS=http://SEU_IP`
- `FRONTEND_URL=http://SEU_IP`
- `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`: suas credenciais de produção da Pluggy
- `PLUGGY_WEBHOOK_SECRET`: se a Pluggy oferecer assinatura de webhook, configure aqui
- Descomente e deixe como `False` as três linhas `SECURE_SSL_REDIRECT` / `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` (já vêm comentadas no `.env.example`) — sem isso o Django tenta redirecionar tudo para HTTPS, que ainda não existe nesta fase, e a tela fica em branco/erro.

Não precisa editar nada em `infrastructure/nginx/default.conf` — ele já aceita qualquer host (`server_name _;`), então funciona tanto por IP quanto, mais tarde, pelo domínio.

## 4. Subir os containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Acesse `http://SEU_IP` — o site já deve estar no ar (sem cadeado, HTTP mesmo — é esperado nesta fase).

## 5. Criar o superusuário de produção

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_categories
```

## 6. Backups automáticos

```bash
chmod +x infrastructure/scripts/*.sh

(crontab -l 2>/dev/null; cat <<'EOF'
0 3 * * *   cd /opt/financeiro && set -a && source .env && set +a && ./infrastructure/scripts/backup.sh daily
0 4 * * 0   cd /opt/financeiro && set -a && source .env && set +a && ./infrastructure/scripts/backup.sh weekly
0 5 1 * *   cd /opt/financeiro && set -a && source .env && set +a && ./infrastructure/scripts/backup.sh monthly
EOF
) | crontab -
```

Restaurar um backup, se precisar:

```bash
set -a && source .env && set +a
./infrastructure/scripts/restore.sh infrastructure/backups/daily/financeiro_20260101_030000.sql.gz
```

## 7. Sincronizar bancos conectados periodicamente

Como o projeto ainda não usa Celery, a sincronização com a Pluggy roda sob demanda (quando você abre o dashboard). Para também sincronizar em segundo plano:

```bash
(crontab -l 2>/dev/null; echo "0 */6 * * * cd /opt/financeiro && docker compose -f docker-compose.prod.yml exec -T backend python manage.py sync_bank_connections") | crontab -
```

## 8. Atualizando a aplicação (deploys seguintes)

```bash
cd /opt/financeiro
./infrastructure/scripts/deploy.sh
```

Isso faz `git pull`, reconstrói as imagens alteradas e sobe os containers novamente (migrações rodam automaticamente no start do backend).

## 9. Iniciar tudo no boot da VPS (opcional)

```bash
sudo cp infrastructure/systemd/financeiro.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable financeiro.service
```

## Ativando HTTPS quando você tiver um domínio

Quando registrar um domínio (ex: `financeiro.seudominio.com.br`), siga estes passos — nada do resto muda.

### a. Apontar o domínio

Crie um registro `A` no seu provedor de DNS apontando `financeiro.seudominio.com.br` para o IP da VPS. Confirme com:

```bash
dig +short financeiro.seudominio.com.br
```

### b. Atualizar as variáveis de ambiente

No `.env` da VPS:

- `ALLOWED_HOSTS=financeiro.seudominio.com.br`
- `CORS_ALLOWED_ORIGINS=https://financeiro.seudominio.com.br`
- `FRONTEND_URL=https://financeiro.seudominio.com.br`
- Remova (ou comente de novo) as três linhas `SECURE_SSL_REDIRECT` / `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` — os padrões (`True`) voltam a fazer sentido assim que o HTTPS existir.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### c. Emitir o certificado HTTPS (Let's Encrypt / Certbot)

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d financeiro.seudominio.com.br \
  --email seu-email@exemplo.com --agree-tos --no-eff-email
```

Se der certo, ative o HTTPS trocando a configuração do Nginx:

```bash
cp infrastructure/nginx/default.ssl.conf.example infrastructure/nginx/default.conf
nano infrastructure/nginx/default.conf   # troque financeiro.seudominio.com.br pelo seu domínio real (duas ocorrências)
docker compose -f docker-compose.prod.yml restart nginx
```

Teste em `https://financeiro.seudominio.com.br`.

### d. Renovação automática

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/financeiro && docker compose -f docker-compose.prod.yml run --rm certbot renew --quiet && docker compose -f docker-compose.prod.yml restart nginx") | crontab -
```

## Troubleshooting

- **502 Bad Gateway:** o backend ainda não terminou de subir (rodando migrations) — espere alguns segundos e recarregue, ou veja `docker compose -f docker-compose.prod.yml logs backend`.
- **Tela em branco / erro logo ao abrir, sem domínio ainda:** confira se `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE` e `CSRF_COOKIE_SECURE` estão como `False` no `.env` — com HTTPS ainda inexistente, os padrões (`True`) bloqueiam a própria página.
- **CORS bloqueado no navegador:** confira se `CORS_ALLOWED_ORIGINS` no `.env` usa exatamente o mesmo esquema (`http://` ou `https://`) + host que você está usando para acessar o site, sem barra final.
- **Certbot falha no desafio HTTP-01:** confirme que a porta 80 está aberta no firewall e que o DNS já propagou (`dig +short seu-dominio`).
