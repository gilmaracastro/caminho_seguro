<img width="1892" height="908" alt="image" src="https://github.com/user-attachments/assets/f14b2796-f953-4805-822c-6c039b59faad" />


# Caminhos Seguros — Sudeste (Leaflet + OSRM)

Mapa que prioriza **rotas mais seguras** no Sudeste usando pontos de risco de acidentes.  
Front em **Leaflet**, roteamento com **OSRM**. Clone, rode e use — sem novela.

---

## ✅ Pré-requisitos

- **Git**
- **Docker + Docker Compose**
- **Servidor HTTP simples** (um destes):
  - `php -S 0.0.0.0:8000 -t public`
  - `python -m http.server 8000 -d public`

> Abrir via `file://` quebra as chamadas. Sirva via HTTP.


## 🚀 Como baixar e rodar

### 1) Clonar o repositório
```bash
git clone <URL_DO_SEU_REPO>.git
cd <PASTA_DO_PROJETO>
```

# Caminhos Seguros — Sudeste (Leaflet + OSRM)

Mapa que prioriza **rotas mais seguras** no Sudeste usando pontos de risco de acidentes.  
Front em **Leaflet**, roteamento com **OSRM**. Clone, rode e use — sem novela.


## ✅ Pré-requisitos

- **Git**
- **Docker + Docker Compose**
- **Servidor HTTP simples** (um destes):
  - `php -S 0.0.0.0:8000 -t public`
  - `python -m http.server 8000 -d public`

> Abrir via `file://` quebra as chamadas. Sirva via HTTP.


## 🚀 Como baixar e rodar

### 1) Clonar o repositório
```bash
git clone <URL_DO_SEU_REPO>.git
cd <PASTA_DO_PROJETO>
```

data/osrm/sudeste.pbf


Gere os arquivos do OSRM (extract → partition → customize):

## Extract
```bash
docker run --rm -t -v "$(pwd)/data/osrm:/data" osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/sudeste.pbf
```

## Partition
```bash
docker run --rm -t -v "$(pwd)/data/osrm:/data" osrm/osrm-backend \
  osrm-partition /data/sudeste.osrm
```

## Customize
```bash
docker run --rm -t -v "$(pwd)/data/osrm:/data" osrm/osrm-backend \
  osrm-customize /data/sudeste.osrm
```


Você deve ter pelo menos:
```bash
data/osrm/sudeste.osrm
data/osrm/sudeste.osrm.partition
data/osrm/sudeste.osrm.cells
...
```

## 3) Subir o roteador OSRM
```bash
docker compose up -d osrm
```
# disponível em http://localhost:5000


## Teste rápido:
```bash
curl "http://localhost:5000/route/v1/driving/-46.63,-23.55;-43.17,-22.90?overview=false"
``

## 4) Servir o front (Leaflet)
# opção PHP
```bash
php -S 0.0.0.0:8000 -t public
# opção Python
python -m http.server 8000 -d public
Acesse: http://localhost:8000
```


## ⚙️ Configuração

```bash
No public/js/main.js, aponte o endpoint do OSRM:

const OSRM_URL = 'http://localhost:5000'; // ou sua URL pública
```

## 🗂️ Estrutura sugerida
```bash
/public
  index.html
  /css/style.css
  /js/main.js
  /data/acidentes.geojson   # pontos de risco (1 baixo, 2 médio, 3 alto)

/data/osrm/                 # sudeste.pbf + arquivos .osrm gerados
/docker-compose.yml
README.md


.gitignore (dica)

/data/osrm/*
!/data/osrm/.gitkeep
node_modules
.env
.DS_Store
```

## 🧭 Uso

Informar Origem e Destino (lat,lon) ou clicar no mapa.

Clicar em Traçar rota segura.

A rota aparece com pontos de atenção (curvas, trechos críticos).
O algoritmo penaliza trechos com maior risco (3 > 2 > 1). Em empate, leva a rota mais rápida.

## 🧯 Problemas comuns

```bash
Mapa não carrega → sirva via HTTP (PHP/Python), não file://.

Porta 5000 ocupada → troque a porta no docker-compose.yml.

Rotas vazias → confirme que sudeste.osrm existe e cobre a área.

CORS → usar localhost:8000 (front) + localhost:5000 (OSRM) ajuda.
```

```bash
📝 docker-compose (incluído)
services:
  osrm:
    image: osrm/osrm-backend:latest
    container_name: osrm_sudeste
    command: ["osrm-routed","--algorithm","mld","/data/sudeste.osrm"]
    ports:
      - "5000:5000"
    volumes:
      - ./data/osrm:/data:ro
    restart: unless-stopped
```

## 📄 Licença

MIT — pode usar, brincar e melhorar. Culpar o mapa pelo trânsito na véspera de feriado… já é pedir milagre. 😅

