#!/bin/sh
# Roda na VPS, dentro da pasta do projeto, para publicar a versão mais recente.
set -e

cd "$(dirname "$0")/../.."

echo "Buscando código mais recente..."
git pull origin main

echo "Construindo e subindo os containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Removendo imagens antigas..."
docker image prune -f

echo "Deploy concluído."
docker compose -f docker-compose.prod.yml ps
