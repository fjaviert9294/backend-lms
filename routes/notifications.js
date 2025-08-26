const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Obtener notificaciones del usuario autenticado
router.get('/', authenticateToken, async(req, res) => {
  try {
    const { is_read, type, limit = 20, offset = 0 } = req.query;
    
    let notifications = await db.getUserNotifications(req.user.id);

    // Filtrar por estado de lectura
    if (is_read !== undefined) {
      const isRead = is_read === 'true';
      notifications = notifications.filter(n => n.is_read === isRead);
    }

    // Filtrar por tipo
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    // Paginación
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        pagination: {
          total: notifications.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: endIndex < notifications.length
        },
        unread_count: notifications.filter(n => !n.is_read).length
      }
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Marcar notificación como leída
router.put('/:id/read', authenticateToken, async(req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la notificación existe y pertenece al usuario
    const notification = await db.notifications.find(n => 
      n.id === id && n.user_id === req.user.id
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    if (notification.is_read) {
      return res.status(400).json({
        success: false,
        message: 'La notificación ya está marcada como leída'
      });
    }

    // Marcar como leída
    const updatedNotification = await db.markNotificationAsRead(id);

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: {
        notification: updatedNotification
      }
    });

  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Marcar todas las notificaciones como leídas
router.put('/read-all', authenticateToken, async(req, res) => {
  try {
    const userNotifications = await db.notifications.filter(n => 
      n.user_id === req.user.id && !n.is_read
    );

    let updatedCount = 0;
    userNotifications.forEach(notification => {
      db.markNotificationAsRead(notification.id);
      updatedCount++;
    });

    res.json({
      success: true,
      message: `${updatedCount} notificaciones marcadas como leídas`,
      data: {
        updated_count: updatedCount
      }
    });

  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar notificación
router.delete('/:id', authenticateToken, async(req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la notificación existe y pertenece al usuario
    const notificationIndex = await db.notifications.findIndex(n => 
      n.id === id && n.user_id === req.user.id
    );

    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Eliminar notificación
    await db.notifications.splice(notificationIndex, 1);

    res.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear notificación (solo admin)
router.post('/', authenticateToken, requireAdmin, [
  body('user_id')
    .notEmpty()
    .withMessage('user_id es requerido'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El título es requerido y no puede exceder 255 caracteres'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('El mensaje no puede exceder 1000 caracteres'),
  body('type')
    .isIn(['new_course', 'badge_earned', 'reminder', 'content_update', 'achievement', 'event'])
    .withMessage('Tipo de notificación inválido'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Prioridad debe ser low, medium o high')
], async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { 
      user_id, 
      title, 
      message, 
      type, 
      priority = 'medium', 
      action_url,
      metadata 
    } = req.body;

    // Verificar que el usuario destinatario existe
    const targetUser = await db.findUserById(user_id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario destinatario no encontrado'
      });
    }

    // Crear nueva notificación
    const newNotification = {
      id: `not-${Date.now()}`,
      user_id,
      title,
      message: message || null,
      type,
      priority,
      is_read: false,
      action_url: action_url || null,
      metadata: metadata || null,
      created_at: new Date()
    };

    await db.notifications.push(newNotification);

    res.status(201).json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: {
        notification: newNotification
      }
    });

  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Enviar notificación a múltiples usuarios (solo admin)
router.post('/broadcast', authenticateToken, requireAdmin, [
  body('user_ids')
    .isArray({ min: 1 })
    .withMessage('user_ids debe ser un array con al menos un elemento'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El título es requerido y no puede exceder 255 caracteres'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('El mensaje no puede exceder 1000 caracteres'),
  body('type')
    .isIn(['new_course', 'badge_earned', 'reminder', 'content_update', 'achievement', 'event'])
    .withMessage('Tipo de notificación inválido'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Prioridad debe ser low, medium o high')
], async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { 
      user_ids, 
      title, 
      message, 
      type, 
      priority = 'medium', 
      action_url,
      metadata 
    } = req.body;

    // Verificar que todos los usuarios destinatarios existen
    const validUserIds = [];
    const invalidUserIds = [];

    user_ids.forEach(userId => {
      const user = db.findUserById(userId);
      if (user && user.is_active) {
        validUserIds.push(userId);
      } else {
        invalidUserIds.push(userId);
      }
    });

    // Crear notificaciones para usuarios válidos
    const createdNotifications = [];
    const timestamp = new Date();

    validUserIds.forEach((userId, index) => {
      const notification = {
        id: `not-${timestamp.getTime()}-${index}`,
        user_id: userId,
        title,
        message: message || null,
        type,
        priority,
        is_read: false,
        action_url: action_url || null,
        metadata: metadata || null,
        created_at: timestamp
      };

      db.notifications.push(notification);
      createdNotifications.push(notification);
    });

    res.status(201).json({
      success: true,
      message: `Notificaciones enviadas a ${validUserIds.length} usuarios`,
      data: {
        created_count: createdNotifications.length,
        valid_user_ids: validUserIds,
        invalid_user_ids: invalidUserIds,
        notifications: createdNotifications
      }
    });

  } catch (error) {
    console.error('Error enviando notificaciones broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener estadísticas de notificaciones del usuario
router.get('/stats', authenticateToken, async(req, res) => {
  try {
    const userNotifications = await db.getUserNotifications(req.user.id);
    
    const stats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.is_read).length,
      read: userNotifications.filter(n => n.is_read).length,
      by_type: {},
      by_priority: {}
    };

    // Estadísticas por tipo
    userNotifications.forEach(notification => {
      if (!stats.by_type[notification.type]) {
        stats.by_type[notification.type] = 0;
      }
      stats.by_type[notification.type]++;

      if (!stats.by_priority[notification.priority]) {
        stats.by_priority[notification.priority] = 0;
      }
      stats.by_priority[notification.priority]++;
    });

    res.json({
      success: true,
      data: {
        stats
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;