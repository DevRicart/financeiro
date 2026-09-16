# Deploy em VPS

Passo a passo para publicar o sistema em uma VPS (Ubuntu 22.04/24.04 como referência).

## 1. Preparar a VPS

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

## 2. Apontar o domínio

Crie um registro `A` no seu provedor de DNS apontando `financeiro.seudominio.com.br` para o IP da VPS. Confirme com:

```bash
dig +short financeiro.seudominio.com.br
```

## 3. Clonar o projeto

```bash
sudo mkdir -p /opt/financeiro
sudo chown $USER:$USER /opt/financeiro
git clone <url-do-seu-repositorio> /opt/financeiro
cd /opt/financeiro
```

## 4. Configurar variáveis de ambiente de produção

```bash
cp .env.example .env
nano .env
```

Preencha com valores reais e diferentes dos de desenvolvimento:

- `SECRET_KEY`: gere com `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
- `DEBUG=False`
- `DATABASE_PASSWORD`: uma senha forte
- `ALLOWED_HOSTS=financeiro.seudominio.com.br`
- `CORS_ALLOWED_ORIGINS=https://financeiro.seudominio.com.br`
- `FRONTEND_URL=https://financeiro.seudominio.com.br`
- `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`: suas credenciais de produção da Pluggy
- `PLUGGY_WEBHOOK_SECRET`: se a Pluggy oferecer assinatura de webhook, configure aqui

Edite `infrastructure/nginx/default.conf` e troque `financeiro.seudominio.com.br` pelo seu domínio real (aparece em dois arquivos: `default.conf` e `default.ssl.conf.example`).

## 5. Subir os containers (ainda sem HTTPS)

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Neste ponto o site já responde em `http://financeiro.seudominio.com.br` (sem cadeado). Isso é esperado — o certificado ainda não existe.

## 6. Emitir o certificado HTTPS (Let's Encrypt / Certbot)

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d financeiro.seudominio.com.br \
  --email seu-email@exemplo.com --agree-tos --no-eff-email
```

Se der certo, ative o HTTPS trocando a configuração do Nginx:

```bash
cp infrastructure/nginx/default.ssl.conf.example infrastructure/nginx/default.conf
# edite o domínio dentro do arquivo se ainda não tiver feito
docker compose -f docker-compose.prod.yml restart nginx
```

Teste em `https://financeiro.seudominio.com.br`.

### Renovação automática

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/financeiro && docker compose -f docker-compose.prod.yml run --rm certbot renew --quiet && docker compose -f docker-compose.prod.yml restart nginx") | crontab -
```

## 7. Criar o superusuário de produção

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_categories
```

## 8. Backups automáticos

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

## 9. Sincronizar bancos conectados periodicamente

Como o projeto ainda não usa Celery, a sincronização com a Pluggy roda sob demanda (quando você abre o dashboard). Para também sincronizar em segundo plano:

```bash
(crontab -l 2>/dev/null; echo "0 */6 * * * cd /opt/financeiro && docker compose -f docker-compose.prod.yml exec -T backend python manage.py sync_bank_connections") | crontab -
```

## 10. Atualizando a aplicação (deploys seguintes)

```bash
cd /opt/financeiro
./infrastructure/scripts/deploy.sh
```

Isso faz `git pull`, reconstrói as imagens alteradas e sobe os containers novamente (migrações rodam automaticamente no start do backend).

## 11. Iniciar tudo no boot da VPS (opcional)

```bash
sudo cp infrastructure/systemd/financeiro.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable financeiro.service
```

## Troubleshooting

- **502 Bad Gateway:** o backend ainda não terminou de subir (rodando migrations) — espere alguns segundos e recarregue, ou veja `docker compose -f docker-compose.prod.yml logs backend`.
- **CORS bloqueado no navegador:** confira se `CORS_ALLOWED_ORIGINS` no `.env` usa exatamente `https://` + o domínio, sem barra final.
- **Certbot falha no desafio HTTP-01:** confirme que a porta 80 está aberta no firewall e que o DNS já propagou (`dig +short seu-dominio`).
