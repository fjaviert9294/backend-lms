const { query, transaction } = require('./connection');

// ================================
// FUNCIONES DE NOTIFICACIONES
// ================================

/**
 * Obtener notificaciones de un usuario
 */
const getUserNotifications = async (userId, filters = {}) => {
  const { is_read, type, limit = 20, offset = 0 } = filters;
  
  let whereConditions = ['user_id = $1'];
  let queryParams = [userId];
  let paramCount = 2;
  
  // Filtrar por estado de lectura
  if (is_read !== undefined) {
    whereConditions.push(`is_read = $${paramCount}`);
    queryParams.push(is_read === 'true' || is_read === true);
    paramCount++;
  }
  
  // Filtrar por tipo
  if (type) {
    whereConditions.push(`type = $${paramCount}`);
    queryParams.push(type);
    paramCount++;
  }
  
  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
  
  const text = `
    SELECT id, title, message, type, priority, is_read, action_url, 
           metadata, created_at, read_at
    FROM notifications 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;
  
  queryParams.push(limit, offset);
  
  // Query para contar no leídas
  const unreadCountText = `
    SELECT COUNT(*) as unread_count
    FROM notifications 
    WHERE user_id = $1 AND is_read = false
  `;
  
  try {
    const [notificationsResult, unreadResult] = await Promise.all([
      query(text, queryParams),
      query(unreadCountText, [userId])
    ]);
    
    return {
      notifications: notificationsResult.rows.map(notification => ({
        ...notification,
        metadata: typeof notification.metadata === 'string' ? 
          JSON.parse(notification.metadata) : notification.metadata
      })),
      pagination: {
        total: notificationsResult.rowCount,
        limit,
        offset,
        has_more: notificationsResult.rows.length === limit
      },
      unread_count: parseInt(unreadResult.rows[0].unread_count)
    };
    
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    throw error;
  }
};

/**
 * Marcar notificación como leída
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const text = `
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = $1 AND user_id = $2 AND is_read = false
    RETURNING *
  `;
  
  try {
    const result = await query(text, [notificationId, userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Notificación no encontrada o ya está marcada como leída');
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
};

/**
 * Marcar todas las notificaciones como leídas
 */
const markAllNotificationsAsRead = async (userId) => {
  const text = `
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE user_id = $1 AND is_read = false
    RETURNING count(*)
  `;
  
  try {
    const result = await query(text, [userId]);
    return result.rowCount || 0;
    
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    throw error;
  }
};

/**
 * Crear nueva notificación
 */
const createNotification = async (notificationData) => {
  const { 
    user_id, 
    title, 
    message, 
    type, 
    priority = 'medium', 
    action_url, 
    metadata 
  } = notificationData;
  
  const text = `
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `;
  
  try {
    // Verificar que el usuario destinatario existe
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      throw new Error('Usuario destinatario no encontrado');
    }
    
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    
    const result = await query(text, [
      user_id, title, message, type, priority, action_url, metadataJson
    ]);
    
    return {
      ...result.rows[0],
      metadata: result.rows[0].metadata ? JSON.parse(result.rows[0].metadata) : null
    };
    
  } catch (error) {
    console.error('Error al crear notificación:', error);
    throw error;
  }
};

/**
 * Enviar notificación a múltiples usuarios
 */
const broadcastNotification = async (userIds, notificationData) => {
  const { title, message, type, priority = 'medium', action_url, metadata } = notificationData;
  
  try {
    return await transaction(async (client) => {
      // Verificar que todos los usuarios existen
      const userCheckResult = await client.query(
        `SELECT id FROM users WHERE id = ANY($1) AND is_active = true`,
        [userIds]
      );
      
      const validUserIds = userCheckResult.rows.map(row => row.id);
      const invalidUserIds = userIds.filter(id => !validUserIds.includes(id));
      
      if (validUserIds.length === 0) {
        throw new Error('No se encontraron usuarios válidos');
      }
      
      // Crear notificaciones para usuarios válidos
      const metadataJson = metadata ? JSON.stringify(metadata) : null;
      const createdNotifications = [];
      
      for (const userId of validUserIds) {
        const result = await client.query(`
          INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING *
        `, [userId, title, message, type, priority, action_url, metadataJson]);
        
        createdNotifications.push({
          ...result.rows[0],
          metadata: result.rows[0].metadata ? JSON.parse(result.rows[0].metadata) : null
        });
      }
      
      return {
        created_count: createdNotifications.length,
        valid_user_ids: validUserIds,
        invalid_user_ids: invalidUserIds,
        notifications: createdNotifications
      };
    });
    
  } catch (error) {
    console.error('Error al enviar notificaciones broadcast:', error);
    throw error;
  }
};

/**
 * Eliminar notificación
 */
const deleteNotification = async (notificationId, userId) => {
  const text = `
    DELETE FROM notifications 
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  
  try {
    const result = await query(text, [notificationId, userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Notificación no encontrada');
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de notificaciones de un usuario
 */
const getUserNotificationStats = async (userId) => {
  const text = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
      COUNT(CASE WHEN is_read = true THEN 1 END) as read,
      COUNT(CASE WHEN type = 'new_course' THEN 1 END) as new_course,
      COUNT(CASE WHEN type = 'badge_earned' THEN 1 END) as badge_earned,
      COUNT(CASE WHEN type = 'reminder' THEN 1 END) as reminder,
      COUNT(CASE WHEN type = 'content_update' THEN 1 END) as content_update,
      COUNT(CASE WHEN type = 'achievement' THEN 1 END) as achievement,
      COUNT(CASE WHEN type = 'event' THEN 1 END) as event,
      COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
      COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
      COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority
    FROM notifications 
    WHERE user_id = $1
  `;
  
  try {
    const result = await query(text, [userId]);
    const stats = result.rows[0];
    
    return {
      total: parseInt(stats.total),
      unread: parseInt(stats.unread),
      read: parseInt(stats.read),
      by_type: {
        new_course: parseInt(stats.new_course),
        badge_earned: parseInt(stats.badge_earned),
        reminder: parseInt(stats.reminder),
        content_update: parseInt(stats.content_update),
        achievement: parseInt(stats.achievement),
        event: parseInt(stats.event)
      },
      by_priority: {
        low: parseInt(stats.low_priority),
        medium: parseInt(stats.medium_priority),
        high: parseInt(stats.high_priority)
      }
    };
    
  } catch (error) {
    console.error('Error al obtener estadísticas de notificaciones:', error);
    throw error;
  }
};

/**
 * Limpiar notificaciones antiguas (admin/maintenance)
 */
const cleanupOldNotifications = async (daysOld = 90) => {
  const text = `
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '${daysOld} days'
    RETURNING count(*)
  `;
  
  try {
    const result = await query(text);
    return result.rowCount || 0;
    
  } catch (error) {
    console.error('Error al limpiar notificaciones antiguas:', error);
    throw error;
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  broadcastNotification,
  deleteNotification,
  getUserNotificationStats,
  cleanupOldNotifications
};