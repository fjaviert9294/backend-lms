const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'lms-corporativo-secret-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generar JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, JWT_SECRET, async(err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }

    // Verificar que el usuario aún existe y está activo
    const user = await db.findUserById(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido o inactivo'
      });
    }

    req.user = decoded;
    next();
  });
};

// Middleware para verificar roles específicos
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      });
    }

    next();
  };
};

// Middleware para verificar que es admin
const requireAdmin = requireRole('admin');

// Middleware para verificar que es instructor o admin
const requireInstructorOrAdmin = requireRole('instructor', 'admin');

// Middleware para verificar que es el mismo usuario o admin
const requireSelfOrAdmin = (req, res, next) => {
  const targetUserId = req.params.id || req.params.userId;
  
  if (req.user.role === 'admin' || req.user.id === targetUserId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Solo puedes acceder a tu propia información'
    });
  }
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        const user = db.findUserById(decoded.id);
        if (user && user.is_active) {
          req.user = decoded;
        }
      }
    });
  }
  
  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requireAdmin,
  requireInstructorOrAdmin,
  requireSelfOrAdmin,
  optionalAuth
};