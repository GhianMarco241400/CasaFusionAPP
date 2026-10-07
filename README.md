# 🍽️ CasaFusionAPP

Aplicación móvil desarrollada para **Punto Fusión**, orientada a centralizar la gestión de pedidos, comandas, delivery, cobros, fiados y reportes de ventas en un solo sistema.

CasaFusion organiza el trabajo mediante accesos diferenciados por rol, permitiendo que cada usuario visualice únicamente las funciones necesarias para sus tareas.

---

## 📱 Funcionalidades principales

- 🧾 Registro de pedidos por mesa.
- 🛵 Registro y seguimiento de pedidos por delivery.
- 👨‍🍳 Gestión de comandas y estados de preparación en cocina.
- 💵 Registro de cobros en efectivo.
- 📲 Registro de pagos mediante Yape.
- 📒 Gestión y seguimiento de pedidos fiados.
- 📊 Reportes de ventas por fecha.
- 📈 Resumen de ventas por canal.
- 🔔 Actualización de pedidos en tiempo real.
- 🔐 Autenticación y control de acceso según el rol.
- 🍽️ Administración del menú, entradas, extras y platos especiales.

---

## 👥 Roles del sistema

| Rol | Funciones principales |
|---|---|
| **Mesero** | Gestiona mesas, registra pedidos y realiza cobros. |
| **Cocina** | Visualiza comandas y actualiza el estado de preparación. |
| **Delivery** | Registra pedidos de reparto, datos del cliente, cobros y fiados. |
| **Administrador** | Consulta reportes, controla ventas y fiados, gestiona el menú y supervisa las operaciones. |

> CasaFusion es **una sola aplicación móvil** con funcionalidades diferenciadas según el rol asignado al usuario.

---

## 🛠️ Tecnologías utilizadas

### Mobile
- React Native
- Expo SDK 57
- TypeScript
- Axios

### Backend
- NestJS 11
- TypeScript
- JWT
- Socket.IO
- Mongoose

### Base de datos
- MongoDB
- MongoDB Atlas

### Herramientas
- Visual Studio Code
- Git
- GitHub
- Render

---

## 🏗️ Arquitectura general

```text
┌──────────────────────────────┐
│        CasaFusion Mobile     │
│   React Native + Expo        │
└──────────────┬───────────────┘
               │
        HTTPS / Axios
               │
┌──────────────▼───────────────┐
│       Backend NestJS         │
│ Auth · Orders · Menu ·       │
│ Reports · WebSockets         │
└──────────────┬───────────────┘
               │
          Mongoose
               │
┌──────────────▼───────────────┐
│       MongoDB Atlas          │
└──────────────────────────────┘

Actualizaciones en tiempo real: Socket.IO
```

---

## 📂 Estructura del repositorio

```text
CasaFusionAPP/
│
├── backend/          # API, autenticación, pedidos, reportes y conexión a MongoDB
├── mobile/           # Aplicación móvil desarrollada con React Native + Expo
├── DEPLOY.md         # Información relacionada con el despliegue
├── render.yaml       # Configuración de despliegue
└── README.md
```

---

## 🔄 Flujo general de trabajo

```text
Cliente
   ↓
Mesero / Delivery
   ↓
Registro del pedido en CasaFusion
   ↓
Cocina recibe la comanda
   ↓
Pendiente → En preparación → Listo
   ↓
Entrega del pedido
   ↓
Cobro / Fiado
   ↓
Registro de la venta
   ↓
Reporte administrativo
```

---

## 🚀 Ejecución del proyecto

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Aplicación móvil

```bash
cd mobile
npm install
npx expo start
```

> Para ejecutar el proyecto correctamente se deben configurar previamente las variables de entorno correspondientes al backend, autenticación y conexión con MongoDB.

---

## 🎯 Objetivo del proyecto

Implementar una aplicación móvil que permita **mejorar la gestión de pedidos y el control de ventas del restaurante Punto Fusión**, centralizando la información y facilitando la coordinación entre atención, cocina, delivery y administración.

---

## 📌 Estado del proyecto

**Versión actual:** funcional e implementada.

Actualmente CasaFusion permite gestionar el flujo principal del restaurante desde el registro del pedido hasta su preparación, entrega, cobro y consulta administrativa.

---

## 👨‍💻 Autor

**Ghian Marco Escalante Cardenas**  
Ingeniería de Software con Inteligencia Artificial  
SENATI — 2026

---

## 📄 Proyecto académico

Proyecto desarrollado como parte del programa de **Implementación** de la carrera de Ingeniería de Software con Inteligencia Artificial de SENATI.

**Caso de aplicación:** Restaurante Punto Fusión — Lima, Perú.

---

> **CasaFusion** — Gestión de pedidos, cocina, delivery y ventas en un solo sistema.
