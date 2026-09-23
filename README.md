# CoCTrack

Plataforma web para administrar y monitorear un clan de Clash of Clans usando la API oficial + PostgreSQL histórico.

## Arquitectura
Clash API -> Laravel (CocClient throttled 9/s, SyncService, RotationService, RuleEngine 3/6/9) -> PostgreSQL -> React (TanStack Query)

## Requisitos diseño
Ver análisis funcional v1.1, requisitos, casos de uso, modelo datos, arquitectura en conversación.

Reglas congeladas: 4 consecutivas rotación, capital 5/5 + 75% 3/4, inactividad 3/6/9, vencimiento 30/60/90, CWL incluido.

## Uso con Docker (todo dentro de contenedores)

```bash
# 1. Configura token
cp backend/.env.example backend/.env  # si existe
# edita backend/.env: COC_API_TOKEN=xxx  COC_CLAN_TAG=#XXXX

# 2. Levanta
docker compose up --build -d

# 3. Migra + seed
docker compose exec php php artisan migrate --force
docker compose exec php php artisan db:seed --class=RuleSeeder

# 4. Frontend deps (si no auto)
docker compose exec frontend npm install

# Accede
# API: http://localhost:8000/api/health (directo) | http://localhost:8081/api/health (vía nginx)
# Frontend: http://localhost:5174 (docker 5174→5173) | http://localhost:5173 (vite local)
# Nginx SPA: http://localhost:8081 (proxy frontend + fallback /miembros/:tag)

# Logs
docker compose logs -f php
docker compose logs -f postgres
```

## Endpoints API
`POST /api/sync {clanTag}` (throttle 10m) | `GET /api/dashboard` | `GET /api/clan` | `GET /api/members` | `GET /api/members/{tag}` (history+war/capital) | `GET /api/rotation?teamSize=15` (equipo/banca) | `GET /api/wars` | `GET /api/capital-seasons` | `GET /api/cwl/groups|/cwl/wars` | `GET /api/rules` | `GET /api/sync-logs` | `GET /api/alerts` | `GET /api/warnings`

## Estado
Perfil individual ✓, war participations reales (inWar) ✓, capital details con nombre ✓, CWL groups/wars ✓, 100% width/height, orden por cabecera + limpiar filtros, nginx SPA fallback ✓ — ver `docker/nginx/default.conf`
