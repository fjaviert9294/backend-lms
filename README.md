# LMS Banco de Bogota - Backend API

Sistema de gestión de aprendizaje Banco de Bogotá (Node.js, Express)

## 🚀 Instalación Rápida

```bash
npm install
npm run dev
```

Servidor disponible en `http://localhost:3001`

## 🔑 Usuarios de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Estudiante | `estudiante@bancodebogota.com.co` | `123456` |
| Administrador | `admin@bancodebogota.com.co` | `123456` |
| Instructor | `ana.martinez@bancodebogota.com.co` | `123456` |

## 📡 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/me` - Perfil actual

### Cursos
- `GET /api/courses` - Lista de cursos
- `GET /api/courses/:id` - Detalle del curso
- `POST /api/courses/:id/enroll` - Inscribirse
- `PUT /api/courses/:courseId/chapters/:chapterId/complete` - Completar capítulo

### Usuarios
- `GET /api/users/:id` - Perfil de usuario
- `GET /api/users/:id/courses` - Cursos del usuario
- `GET /api/users/:id/stats` - Estadísticas

### Insignias
- `GET /api/badges` - Lista de insignias
- `GET /api/badges/my-badges` - Mis insignias
- `POST /api/badges/check-achievements` - Verificar logros

### Notificaciones
- `GET /api/notifications` - Mis notificaciones
- `PUT /api/notifications/:id/read` - Marcar como leída

### Admin
- `GET /api/admin/dashboard` - Dashboard administrativo
- `GET /api/admin/users` - Gestión de usuarios
- `GET /api/admin/reports/activity` - Reportes

## 🔐 Autenticación

Incluir token JWT en header:
```
Authorization: Bearer <token>
```

## 🏗️ Estructura

```
backend/
├── server.js           # Servidor principal
├── data/              # Datos mockeados
├── routes/            # Rutas de la API
├── middleware/        # Middleware de autenticación
├── utils/             # Utilidades compartidas
└── constants/         # Constantes del sistema
```

## 📊 Datos Incluidos

- 3 usuarios con diferentes roles
- 4 cursos con capítulos
- 7 tipos de insignias
- Progreso y estadísticas de ejemplo
- Notificaciones de muestra

## 🚦 Scripts

```bash
npm start          # Producción
npm run dev        # Desarrollo con nodemon
npm test           # Ejecutar tests
npm run lint       # Verificar código
```

## ⚙️ Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
NODE_ENV=development
PORT=3001
JWT_SECRET=lms-corporativo-secret-key-2024
JWT_EXPIRES_IN=24h
```

## 🔧 Health Check

- `GET /health` - Estado del servidor
- `GET /` - Información de la API

---

Para más detalles técnicos, ver la documentación completa en el código fuente.