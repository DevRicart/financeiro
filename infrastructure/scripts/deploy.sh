#!/bin/sh
# Roda na VPS, dentro da pasta do projeto, para publicar a versão mais recente.
set -e

cd "$(dirname "$0")/../.."

echo "Buscando código mais recente..."
git pull origin main

echo "Construindo e subindo os containers..."
docker compose -f docker-compose.prod.yml up -d --build

# O nginx.conf/default.conf são montados por volume, não fazem parte da imagem,
# então o container não pega mudanças neles sozinho, mesmo com --build. Também
# força reconsulta do IP de backend/frontend, que muda a cada rebuild deles.
echo "Recarregando configuração do nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "Removendo imagens antigas..."
docker image prune -f

echo "Deploy concluído."
docker compose -f docker-compose.prod.yml ps
