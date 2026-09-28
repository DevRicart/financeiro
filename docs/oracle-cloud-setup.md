# Provisionando a VPS na Oracle Cloud (OCI)

Guia para criar a máquina na Oracle Cloud Infrastructure (OCI) usando o nível **Always Free** — não custa nada, mesmo depois do período de teste gratuito. Depois de terminar aqui, siga normalmente o [deployment.md](deployment.md).

## 1. Criar a instância (VM)

1. Entre em [cloud.oracle.com](https://cloud.oracle.com) e faça login.
2. Menu ☰ (canto superior esquerdo) → **Compute** → **Instances** → **Create instance**.
3. **Name**: algo como `financeiro-vps`.
4. Em **Image and shape**, clique em **Edit**:
   - **Image**: troque para **Canonical Ubuntu**, versão **24.04**.
   - **Shape**: troque para **Ampere** → `VM.Standard.A1.Flex`. Ajuste os sliders para **2 OCPUs** e **12 GB** de memória (o limite Always Free vai até 4 OCPU/24GB no total da conta, mas 2/12 já sobra bastante para este projeto).
5. **Networking**: deixe marcada a opção padrão "Create new virtual cloud network" — ela cria rede, sub-rede e gateway de internet automaticamente. Confirme que **"Assign a public IPv4 address"** está marcado.
6. **Add SSH keys**: deixe selecionado **"Generate a key pair for me"** e clique em **Save private key** — baixa um arquivo `.key`. Guarde bem esse arquivo, é a sua credencial de acesso (sem ele, sem acesso).
7. Clique em **Create**. Em ~1 minuto o status vira **Running**.
8. Na página da instância, anote o **Public IP Address** — é o `SEU_IP` usado no [deployment.md](deployment.md).

> Se aparecer erro **"Out of host capacity"** ao criar: é a capacidade Arm gratuita esgotada naquele momento na sua região, não é erro seu — é o efeito colateral de ser um recurso gratuito bastante procurado. Espere um pouco e tente de novo (às vezes leva algumas tentativas ao longo do dia).

## 2. Abrir as portas 80 e 443 (Security List)

Por padrão a Oracle libera só a porta 22 (SSH) no nível de rede. O site não vai responder até abrir 80/443 **aqui**, além do firewall dentro da VM (próximo passo).

1. Na página da instância, clique no link da sua VCN em "Primary VNIC" → **Virtual cloud network**.
2. Clique na **Subnet** listada, depois no **Security List** padrão ("Default Security List for ...").
3. **Add Ingress Rules** → adicione duas regras:
   - Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `80`
   - Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `443`
4. Salve.

## 3. Conectar via SSH (do Windows)

```bash
ssh -i "caminho\para\sua-chave.key" ubuntu@SEU_IP
```

O usuário padrão da imagem Ubuntu da Oracle é `ubuntu` (não `root`, não `opc` — esse último é o padrão do Oracle Linux, imagem diferente). Se o Windows reclamar que a chave está com permissões abertas demais, rode antes no PowerShell:

```powershell
icacls "caminho\para\sua-chave.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

## 4. Abrir 80/443 no firewall da própria VM (a armadilha mais comum da Oracle)

A imagem Ubuntu da Oracle já vem com o `ufw` ativo, liberando por padrão só a porta 22 — isso é **além** da Security List do passo 2, e é o motivo nº1 de "abri a porta mas continua não funcionando" em VMs da Oracle. Para liberar 80/443:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status numbered
```

> **Nunca rode `sudo iptables -F`** nessa imagem para "resetar" o firewall. A chain `INPUT` vem com política `DROP` por padrão — um flush apaga inclusive a regra que libera sua própria conexão SSH, te trancando pra fora na hora (a conexão cai antes de dar tempo de desfazer). Se isso acontecer: reinicie a instância pelo **console da Oracle** (Compute → Instances → sua instância → **Reboot**) — se a mudança não chegou a ser salva com `netfilter-persistent save`, o reboot restaura as regras originais.

## 5. Continuar o deploy

Daqui em diante é o fluxo normal — siga o [deployment.md](deployment.md) a partir do passo 2 (clonar o projeto), usando o `SEU_IP` anotado no passo 1.

## Notas

- **Custo:** os recursos acima (2 OCPU/12GB Ampere, disco padrão de 50GB) estão dentro do limite Always Free — não gera cobrança enquanto você ficar dentro dele. A Oracle pede cartão de crédito na criação da conta só para verificação antifraude.
- **O IP muda se eu reiniciar a instância?** Não — o IP público (ephemeral) só muda se você desanexar ou terminar a instância. Parar/iniciar (`stop`/`start`) mantém o mesmo IP.
- **Guarde o arquivo `.key` fora da VPS** (ex: num gerenciador de senhas) — sem ele não tem como recriar o acesso SSH.
