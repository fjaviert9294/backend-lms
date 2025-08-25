const { query, transaction } = require('./connection');

// ================================
// FUNCIONES DE INSIGNIAS
// ================================

/**
 * Obtener todas las insignias disponibles
 */
const getBadges = async () => {
  const text = `
    SELECT id, name, description, icon, rarity, criteria, is_active
    FROM badges 
    WHERE is_active = true
    ORDER BY name ASC
  `;
  
  try {
    const result = await query(text);
    return result.rows.map(badge => ({
      ...badge,
      criteria: typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria
    }));
  } catch (error) {
    console.error('Error al obtener insignias:', error);
    throw error;
  }
};

/**
 * Obtener insignias de un usuario
 */
const getUserBadges = async (userId) => {
  const text = `
    SELECT ub.id, ub.earned_at, ub.course_id,
           b.id as badge_id, b.name, b.description, b.icon, b.rarity,
           c.title as course_title
    FROM user_badges ub
    JOIN badges b ON ub.badge_id = b.id
    LEFT JOIN courses c ON ub.course_id = c.id
    WHERE ub.user_id = $1
    ORDER BY ub.earned_at DESC
  `;
  
  try {
    const result = await query(text, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener insignias del usuario:', error);
    throw error;
  }
};

/**
 * Obtener insignias disponibles vs obtenidas para un usuario
 */
const getUserBadgeProgress = async (userId) => {
  try {
    // Obtener insignias obtenidas
    const earnedBadges = await getUserBadges(userId);
    const earnedBadgeIds = earnedBadges.map(b => b.badge_id);
    
    // Obtener insignias disponibles no obtenidas
    let availableQuery = `
      SELECT id, name, description, icon, rarity, criteria
      FROM badges 
      WHERE is_active = true
    `;
    
    let queryParams = [];
    
    if (earnedBadgeIds.length > 0) {
      const placeholders = earnedBadgeIds.map((_, index) => `$${index + 1}`).join(',');
      availableQuery += ` AND id NOT IN (${placeholders})`;
      queryParams = earnedBadgeIds;
    }
    
    availableQuery += ` ORDER BY name ASC`;
    
    const availableResult = await query(availableQuery, queryParams);
    const availableBadges = availableResult.rows.map(badge => ({
      ...badge,
      criteria: typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria,
      earned: false
    }));
    
    return {
      earned_badges: earnedBadges,
      available_badges: availableBadges,
      total_earned: earnedBadges.length,
      total_available: availableBadges.length
    };
    
  } catch (error) {
    console.error('Error al obtener progreso de insignias:', error);
    throw error;
  }
};

/**
 * Otorgar insignia a un usuario
 */
const awardBadge = async (userId, badgeId, courseId = null, awardedBy = null) => {
  try {
    return await transaction(async (client) => {
      // Verificar que la insignia existe
      const badgeResult = await client.query(
        'SELECT * FROM badges WHERE id = $1 AND is_active = true',
        [badgeId]
      );
      
      if (badgeResult.rows.length === 0) {
        throw new Error('Insignia no encontrada');
      }
      
      // Verificar que el usuario no tiene ya esta insignia
      const existingResult = await client.query(
        'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
        [userId, badgeId]
      );
      
      if (existingResult.rows.length > 0) {
        throw new Error('El usuario ya tiene esta insignia');
      }
      
      // Otorgar insignia
      const awardResult = await client.query(`
        INSERT INTO user_badges (user_id, badge_id, earned_at, course_id, awarded_by)
        VALUES ($1, $2, NOW(), $3, $4)
        RETURNING *
      `, [userId, badgeId, courseId, awardedBy]);
      
      // Actualizar estadísticas del usuario
      await client.query(`
        INSERT INTO user_stats (user_id, total_badges_earned, updated_at)
        VALUES ($1, 1, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET 
          total_badges_earned = user_stats.total_badges_earned + 1,
          updated_at = NOW()
      `, [userId]);
      
      return {
        user_badge: awardResult.rows[0],
        badge: badgeResult.rows[0]
      };
    });
    
  } catch (error) {
    console.error('Error al otorgar insignia:', error);
    throw error;
  }
};

/**
 * Verificar logros automáticos para un usuario
 */
const checkAchievements = async (userId) => {
  try {
    return await transaction(async (client) => {
      // Obtener datos del usuario para verificar criterios
      const userDataResult = await client.query(`
        SELECT 
          u.id,
          us.total_courses_completed,
          us.current_streak_days,
          COUNT(ce.id) as total_enrollments,
          COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completed_courses
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        LEFT JOIN course_enrollments ce ON u.id = ce.user_id
        WHERE u.id = $1
        GROUP BY u.id, us.total_courses_completed, us.current_streak_days
      `, [userId]);
      
      if (userDataResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }
      
      const userData = userDataResult.rows[0];
      
      // Obtener insignias ya obtenidas
      const earnedBadgesResult = await client.query(
        'SELECT badge_id FROM user_badges WHERE user_id = $1',
        [userId]
      );
      const earnedBadgeIds = earnedBadgesResult.rows.map(row => row.badge_id);
      
      // Obtener insignias disponibles no obtenidas
      let availableQuery = `
        SELECT id, name, description, icon, rarity, criteria
        FROM badges 
        WHERE is_active = true
      `;
      
      let queryParams = [userId];
      
      if (earnedBadgeIds.length > 0) {
        const placeholders = earnedBadgeIds.map((_, index) => `$${index + 2}`).join(',');
        availableQuery += ` AND id NOT IN (${placeholders})`;
        queryParams = queryParams.concat(earnedBadgeIds);
      }
      
      const availableResult = await client.query(availableQuery, queryParams.slice(1));
      const newlyEarnedBadges = [];
      
      // Verificar cada insignia disponible
      for (const badge of availableResult.rows) {
        const criteria = typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria;
        let qualifies = false;
        
        // Verificar criterios específicos
        if (criteria.courses_completed) {
          qualifies = userData.completed_courses >= criteria.courses_completed;
        }
        
        if (criteria.category && criteria.courses_completed) {
          // Verificar cursos completados por categoría
          const categoryResult = await client.query(`
            SELECT COUNT(*) as count
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            JOIN course_categories cat ON c.category_id = cat.id
            WHERE ce.user_id = $1 AND ce.status = 'completed' AND cat.name = $2
          `, [userId, criteria.category]);
          
          qualifies = parseInt(categoryResult.rows[0].count) >= criteria.courses_completed;
        }
        
        if (criteria.streak_days) {
          qualifies = (userData.current_streak_days || 0) >= criteria.streak_days;
        }
        
        // Si califica, otorgar la insignia
        if (qualifies) {
          try {
            const awardResult = await client.query(`
              INSERT INTO user_badges (user_id, badge_id, earned_at)
              VALUES ($1, $2, NOW())
              RETURNING *
            `, [userId, badge.id]);
            
            newlyEarnedBadges.push({
              user_badge: awardResult.rows[0],
              badge: badge
            });
            
          } catch (awardError) {
            // Ignorar errores de duplicado
            console.log('Insignia ya otorgada:', badge.name);
          }
        }
      }
      
      // Actualizar estadísticas si se obtuvieron nuevas insignias
      if (newlyEarnedBadges.length > 0) {
        await client.query(`
          INSERT INTO user_stats (user_id, total_badges_earned, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET 
            total_badges_earned = user_stats.total_badges_earned + $2,
            updated_at = NOW()
        `, [userId, newlyEarnedBadges.length]);
      }
      
      return {
        newly_earned: newlyEarnedBadges,
        total_new_badges: newlyEarnedBadges.length
      };
    });
    
  } catch (error) {
    console.error('Error al verificar logros:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas globales de insignias (admin)
 */
const getBadgeStats = async () => {
  const text = `
    SELECT 
      b.id,
      b.name,
      b.icon,
      b.rarity,
      COUNT(ub.id) as total_awarded,
      COUNT(DISTINCT ub.user_id) as unique_users,
      (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users
    FROM badges b
    LEFT JOIN user_badges ub ON b.id = ub.badge_id
    WHERE b.is_active = true
    GROUP BY b.id, b.name, b.icon, b.rarity
    ORDER BY total_awarded DESC, b.name ASC
  `;
  
  try {
    const result = await query(text);
    
    const badgeStats = result.rows.map(row => ({
      badge: {
        id: row.id,
        name: row.name,
        icon: row.icon,
        rarity: row.rarity
      },
      total_awarded: parseInt(row.total_awarded),
      unique_users: parseInt(row.unique_users),
      percentage_of_users: row.total_users > 0 ? 
        Math.round((parseInt(row.unique_users) / parseInt(row.total_users)) * 100) : 0
    }));
    
    // Calcular estadísticas generales
    const totalBadges = result.rows.length;
    const totalAwarded = result.rows.reduce((sum, row) => sum + parseInt(row.total_awarded), 0);
    const totalUsers = result.rows.length > 0 ? parseInt(result.rows[0].total_users) : 0;
    const avgBadgesPerUser = totalUsers > 0 ? totalAwarded / totalUsers : 0;
    
    return {
      overview: {
        total_badges: totalBadges,
        total_awarded: totalAwarded,
        total_users: totalUsers,
        average_badges_per_user: Math.round(avgBadgesPerUser * 100) / 100
      },
      badge_statistics: badgeStats
    };
    
  } catch (error) {
    console.error('Error al obtener estadísticas de insignias:', error);
    throw error;
  }
};

module.exports = {
  getBadges,
  getUserBadges,
  getUserBadgeProgress,
  awardBadge,
  checkAchievements,
  getBadgeStats
};