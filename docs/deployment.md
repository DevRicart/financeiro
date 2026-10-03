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

## 7. Atualizando a aplicação (deploys seguintes)

```bash
cd /opt/financeiro
./infrastructure/scripts/deploy.sh
```

Isso faz `git pull`, reconstrói as imagens alteradas e sobe os containers novamente (migrações rodam automaticamente no start do backend).

## 8. Iniciar tudo no boot da VPS (opcional)

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

## E-mail transacional (confirmação de conta e recuperação de senha)

O Lumi Finance envia e-mail em dois momentos: o link de **confirmação de e-mail** (quem cria uma conta só consegue entrar depois de clicar nele) e o de **redefinição de senha**. Em produção o envio é por SMTP; este guia usa o [Resend](https://resend.com) com o domínio `lumifinance.com.br`.

### a. Resend: domínio verificado e chave de API

1. Em **Domains**, adicione o domínio e crie no DNS (Cloudflare) os registros que o Resend mostrar (SPF e DKIM). Registros de e-mail ficam sempre em **"DNS only"** (nuvem cinza) — não passam pelo proxy do Cloudflare. Espere o status **Verified**.
2. Em **API Keys**, crie uma chave com permissão **Sending access** e copie-a (ela só aparece uma vez).
3. **DMARC:** antes de criar qualquer coisa, veja se o domínio já tem um: `nslookup -type=TXT _dmarc.lumifinance.com.br`. Se já existir, mantenha-o — não troque por uma política mais fraca (o `lumifinance.com.br` já tem `p=reject`). Se não existir, crie um `TXT` em `_dmarc` com `v=DMARC1; p=none;` (só observa, não bloqueia nada) e endureça depois que os e-mails estiverem passando. Com `p=reject`, e-mail que falha no DMARC é recusado pelo Gmail/Outlook (nem chega ao spam), por isso o teste do passo **c** abaixo precisa mostrar `DMARC: PASS`.

### b. Variáveis no `.env` da VPS

```
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=re_xxxxxxxxxxxx
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=Lumi Finance <nao-responda@lumifinance.com.br>
FRONTEND_URL=https://lumifinance.com.br
```

`EMAIL_HOST_PASSWORD` é a chave de API do passo anterior. O remetente precisa ser do domínio verificado. `FRONTEND_URL` monta os links dos e-mails, então use o endereço público do site, sem barra no final.

### c. Testar o envio antes de publicar o código novo

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
docker compose -f docker-compose.prod.yml exec backend python manage.py sendtestemail seu-email@gmail.com
```

Se chegar (olhe o spam também), o SMTP está certo. Confira também a autenticação: no Gmail, abra o e-mail → menu ⋮ → **Mostrar original** e veja se `SPF`, `DKIM` e `DMARC` aparecem como `PASS`. Se der erro, leia `docker compose -f docker-compose.prod.yml logs backend`. Só depois disso rode `./infrastructure/scripts/deploy.sh`: com a confirmação ligada, um SMTP quebrado impede contas novas de entrar.

### d. Como a confirmação funciona

- **Contas que já existiam** são marcadas como verificadas pela própria migração — ninguém fica trancado para fora no deploy.
- **Contas novas** não recebem sessão ao se cadastrar: veem a tela "Confirme seu e-mail", e o login responde "Confirme seu e-mail" (com botão de reenviar) até o link ser aberto. O link vale 48 horas.
- **Redefinir a senha** por e-mail também confirma o endereço, já que o link só chegou à caixa de entrada.
- **Limites de tentativa** (por IP e por endereço) protegem cadastro, reenvio e redefinição de senha contra uso para spam. Os contadores ficam num cache em arquivo compartilhado pelos 3 workers do gunicorn. Se um dia ligar o proxy do Cloudflare (nuvem laranja), defina `NUM_PROXIES=2` no `.env`, senão o IP lido passa a ser o do Cloudflare.
- **Liberar alguém na mão** (o e-mail nunca chegou): `/admin/` → Usuários → preencha "E-mail verificado em" com a data/hora atual.

## Troubleshooting

- **E-mail de confirmação/redefinição não chega:** veja `docker compose -f docker-compose.prod.yml logs backend` — falhas de envio aparecem como "Falha ao enviar o e-mail" (o cadastro em si não quebra; a pessoa pode pedir "Reenviar"). Confira se o domínio está **Verified** no Resend e se o `DEFAULT_FROM_EMAIL` usa esse domínio.
- **502 Bad Gateway:** o backend ainda não terminou de subir (rodando migrations) — espere alguns segundos e recarregue, ou veja `docker compose -f docker-compose.prod.yml logs backend`.
- **Tela em branco / erro logo ao abrir, sem domínio ainda:** confira se `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE` e `CSRF_COOKIE_SECURE` estão como `False` no `.env` — com HTTPS ainda inexistente, os padrões (`True`) bloqueiam a própria página.
- **CORS bloqueado no navegador:** confira se `CORS_ALLOWED_ORIGINS` no `.env` usa exatamente o mesmo esquema (`http://` ou `https://`) + host que você está usando para acessar o site, sem barra final.
- **Certbot falha no desafio HTTP-01:** confirme que a porta 80 está aberta no firewall e que o DNS já propagou (`dig +short seu-dominio`).
