const VALIDATION_RULES = {
  email: {
    isEmail: true,
    normalizeEmail: true,
    message: 'Email debe ser válido'
  },
  password: {
    minLength: 6,
    message: 'La contraseña debe tener al menos 6 caracteres'
  },
  name: {
    minLength: 2,
    trim: true,
    message: 'El nombre debe tener al menos 2 caracteres'
  },
  role: {
    values: ['student', 'instructor', 'admin'],
    message: 'Rol debe ser student, instructor o admin'
  },
  notificationType: {
    values: ['new_course', 'badge_earned', 'reminder', 'content_update', 'achievement', 'event'],
    message: 'Tipo de notificación inválido'
  },
  priority: {
    values: ['low', 'medium', 'high'],
    message: 'Prioridad debe ser low, medium o high'
  },
  rating: {
    min: 1,
    max: 5,
    message: 'La calificación debe ser entre 1 y 5'
  }
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  USER_NOT_FOUND: 'Usuario no encontrado',
  COURSE_NOT_FOUND: 'Curso no encontrado',
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Permisos insuficientes',
  VALIDATION_ERROR: 'Error de validación',
  INTERNAL_ERROR: 'Error interno del servidor',
  TOKEN_REQUIRED: 'Token de acceso requerido',
  TOKEN_EXPIRED: 'Token expirado',
  TOKEN_INVALID: 'Token inválido',
  EMAIL_EXISTS: 'El email ya está registrado',
  ACCOUNT_DISABLED: 'Cuenta desactivada. Contacta al administrador'
};

module.exports = {
  VALIDATION_RULES,
  HTTP_STATUS,
  ERROR_MESSAGES
};