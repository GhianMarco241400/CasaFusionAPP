# Plan de despliegue a producción — CasaFusion

Guía para llevar el sistema a producción y distribuir una **APK de uso interno** para el personal del restaurante: backend en **Render** (gratis) + base de datos **MongoDB Atlas** (gratis, ya en uso) + **APK** compilada con **EAS Build** (gratis).

> Horario de atención: **9:00 – 19:00**. El keep-alive se programa solo para ese horario (`8:00 – 19:00`) para que el servidor esté despierto al abrir.

---

## Arquitectura objetivo

```text
Teléfonos (mesero / cocina / admin)
        │  HTTPS (REST + Socket.IO)
        ▼
Backend NestJS ──► MongoDB Atlas
(Render, gratis)    (Cluster M0, gratis)
        ▲
Ping cada 5 min (Cron-Job.org, solo 8:00–19:00)
```

- **Backend**: NestJS corriendo en Render (`https://casa-fusion-backend.onrender.com`). HTTPS automático.
- **Base de datos**: MongoDB Atlas `M0` (gratis, nunca expira). **No** hace falta desplegar BD — ya está en la nube.
- **Keep-alive**: evita que Render duerma el servidor tras 15 min sin tráfico. Sin esto, la primera petición tras inactividad tarda 30–50 s.

---

## Fase 1 — Preparar el backend y el repo

1. **Git**: inicializar el repositorio en la raíz `casa-fusion-mobile/` y crear `.gitignore` con `node_modules/`, `dist/`, `.env`, `.expo/`, `.DS_Store`. Commit inicial y push a un repo **GitHub privado**.
2. **Helmet**: activarlo en `backend/src/main.ts` (dependencia ya instalada):
   ```ts
   import helmet from 'helmet';
   // dentro de bootstrap():
   app.use(helmet());
   ```
3. **`render.yaml`** (blueprint) en la raíz del repo para que Render construya el backend del monorepo:
   ```yaml
   services:
     - type: web
       name: casa-fusion-backend
       runtime: node
       rootDir: backend
       plan: free
       buildCommand: npm install && npm run build
       startCommand: npm run start:prod
       envVars:
         - key: NODE_ENV
           value: production
         - key: MONGODB_URI
           sync: false
         - key: JWT_SECRET
           sync: false
   ```
4. **Atlas — Network Access**: en la consola de MongoDB, permitir conexiones desde **cualquier IP (`0.0.0.0/0`)** para que Render pueda conectarse (Render usa IPs variables).

---

## Fase 2 — Desplegar en Render

1. Crear cuenta en [render.com](https://render.com) (gratis).
2. **New → Web Service** → conectar el repo de GitHub → Render detecta `render.yaml`.
3. Asignar valores de entorno en el dashboard:
   - `MONGODB_URI=mongodb+srv://…` (la misma de `backend/.env` → **reutiliza usuarios y menú existentes**, no hay que reseedar).
   - `JWT_SECRET=<secreto fuerte aleatorio>`.
4. Esperar el primer deploy. Verificar con:
   ```bash
   curl https://casa-fusion-backend.onrender.com/        # → 200
   curl https://casa-fusion-backend.onrender.com/menu/entradas   # → 200 (público)
   curl https://casa-fusion-backend.onrender.com/orders  # → 401 (protegido)
   ```

> Render gratis da **750 h de instancia/mes**; un mes son 720 h, así que 24/7 también cabe. Con el horario 8–19 se usa menos.

---

## Fase 3 — Keep-alive (evitar el sleep de 15 min)

El backend **duerme tras 15 min sin tráfico** en el plan gratis → la primera petición tardaría 30–50 s.

**Opción elegida — horario de atención (9:00–19:00)**, con [Cron-Job.org](https://cron-job.org):

1. Crear cuenta y un **cron job** nuevo.
2. URL: `https://casa-fusion-backend.onrender.com/` (endpoint **público que devuelve 200**; ojo: un endpoint con login 401 lo marcaría como caído).
3. Expresión cron: `*/5 8-19 * * *` → ping cada 5 min entre 8:00 y 19:00 (se despierta antes de las 9:00).
4. Guardar (método GET, intervalo libre).

Alternativa sin programación horaria: **UptimeRobot** con monitor HTTP cada 5 min durante 24/7. Más simple, también cabe en el free tier.

---

## Fase 4 — Hacer configurable la URL del API en la app

Hoy la app apunta a la IP local en `mobile/src/services/api.ts`:

```ts
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.101.70:3000';
```

- `EXPO_PUBLIC_API_URL` (variable pública de Expo, se inyecta en build) apunta a Render en el build de producción.
- El socket usa `BASE_URL` → se actualiza solo.
- El default local se mantiene para desarrollo con `expo start`.

---

## Fase 5 — Compilar la APK con EAS Build

1. **Configurar `app.json`** (Android):
   ```json
   {
     "expo": {
       "name": "CasaFusion",
       "android": {
         "package": "com.casafusion.pos",
         "versionCode": 1
       }
     }
   }
   ```
   - Sin `usesCleartextTraffic`: Render usa **HTTPS**, y Android bloquea `http://` por defecto (aquí va por HTTPS, correcto).
2. **Crear `eas.json`**:
   ```json
   {
     "cli": { "version": ">= 12.0.0" },
     "build": {
       "preview": {
         "android": { "buildType": "apk" },
         "env": { "EXPO_PUBLIC_API_URL": "https://casa-fusion-backend.onrender.com" }
       },
       "production": {
         "android": { "buildType": "app-bundle" },
         "env": { "EXPO_PUBLIC_API_URL": "https://casa-fusion-backend.onrender.com" }
       }
     }
   }
   ```
3. **Cuenta Expo** (gratis):
   ```bash
   cd mobile
   npx eas-cli login
   npx eas-cli init
   ```
4. **Compilar** (firma del APK automática en el primer build):
   ```bash
   npx eas-cli build -p android --profile preview
   ```
   → Entrega un **enlace de descarga del APK** para compartir por Drive/WhatsApp.

---

## Fase 6 — Verificación final

1. `npx tsc --noEmit` en `backend/` y en `mobile/` (0 errores) antes de compilar.
2. Instalar el APK en un teléfono **fuera del WiFi local**.
3. Probar el flujo completo:
   - Login admin y mesero.
   - Comanda en vivo → cocina ve el ticket al instante (socket).
   - Marcar listo → cobrar mesa.
   - Reporte del día y **exportar Excel** desde el admin.

---

## Notas y pendientes de seguridad

- Cambiar las contraseñas por defecto (`Admin0006` / `Alexandra0006`) cuando haya usuarios reales.
- CORS está abierto (`app.enableCors()` y socket `origin: '*'`); válido para app nativa, pero se puede acotar luego.
- `JWT_SECRET` en producción debe ser distinto y fuerte.
- Cold start: con el keep-alive activo no hay demoras en horario de atención. Si el servidor duerme de noche, la primera petición de la mañana (antes del ping de las 8:00) puede tardar ~60 s — el botón "Reintentar" de la app lo cubre.
- Para liberar a la segunda sede o acceso remoto más adelante, no hay cambio de arquitectura: solo apuntar `EXPO_PUBLIC_API_URL` a la nueva URL y recompilar.