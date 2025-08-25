const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const mockDb = require('../data/mockDatabase');
const db = require('../database');

const router = express.Router();

// Obtener todas las insignias disponibles
router.get('/', (req, res) => {
  try {
    const badges = db.badges.filter(badge => badge.is_active);
    
    res.json({
      success: true,
      data: {
        badges: badges.map(badge => ({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity,
          criteria: badge.criteria
        }))
      }
    });

  } catch (error) {
    console.error('Error obteniendo insignias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener insignias de un usuario específico
router.get('/user/:userId', authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario puede acceder a estas insignias
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver las insignias de este usuario'
      });
    }

    const userBadges = db.userBadges.filter(ub => ub.user_id === userId);
    
    // Enriquecer con información de la insignia
    const enrichedBadges = userBadges.map(userBadge => {
      const badge = db.badges.find(b => b.id === userBadge.badge_id);
      const course = userBadge.course_id ? db.getCourseById(userBadge.course_id) : null;
      
      return {
        id: userBadge.id,
        earned_at: userBadge.earned_at,
        badge: badge ? {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity
        } : null,
        course: course ? {
          id: course.id,
          title: course.title
        } : null
      };
    });

    // Ordenar por fecha de obtención (más recientes primero)
    enrichedBadges.sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at));

    res.json({
      success: true,
      data: {
        badges: enrichedBadges,
        total: enrichedBadges.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo insignias del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener insignias del usuario autenticado
router.get('/my-badges', authenticateToken, (req, res) => {
  try {
    const userBadges = db.userBadges.filter(ub => ub.user_id === req.user.id);
    
    // Enriquecer con información de la insignia
    const enrichedBadges = userBadges.map(userBadge => {
      const badge = db.badges.find(b => b.id === userBadge.badge_id);
      const course = userBadge.course_id ? db.getCourseById(userBadge.course_id) : null;
      
      return {
        id: userBadge.id,
        earned_at: userBadge.earned_at,
        badge: badge ? {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity
        } : null,
        course: course ? {
          id: course.id,
          title: course.title
        } : null
      };
    });

    // Obtener insignias disponibles que aún no se han obtenido
    const earnedBadgeIds = userBadges.map(ub => ub.badge_id);
    const availableBadges = db.badges
      .filter(badge => badge.is_active && !earnedBadgeIds.includes(badge.id))
      .map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        criteria: badge.criteria,
        earned: false
      }));

    // Ordenar por fecha de obtención (más recientes primero)
    enrichedBadges.sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at));

    res.json({
      success: true,
      data: {
        earned_badges: enrichedBadges,
        available_badges: availableBadges,
        total_earned: enrichedBadges.length,
        total_available: availableBadges.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo mis insignias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Otorgar insignia a un usuario (solo admin)
router.post('/award', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { user_id, badge_id, course_id } = req.body;

    // Validar datos requeridos
    if (!user_id || !badge_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id y badge_id son requeridos'
      });
    }

    // Verificar que el usuario existe
    const user = db.findUserById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que la insignia existe
    const badge = db.badges.find(b => b.id === badge_id);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Insignia no encontrada'
      });
    }

    // Verificar que el usuario no tiene ya esta insignia
    const existingUserBadge = db.userBadges.find(ub => 
      ub.user_id === user_id && ub.badge_id === badge_id
    );

    if (existingUserBadge) {
      return res.status(409).json({
        success: false,
        message: 'El usuario ya tiene esta insignia'
      });
    }

    // Crear nueva insignia de usuario
    const newUserBadge = {
      id: `ub-${Date.now()}`,
      user_id,
      badge_id,
      earned_at: new Date(),
      awarded_by: req.user.id,
      course_id: course_id || null
    };

    db.userBadges.push(newUserBadge);

    // Actualizar estadísticas del usuario
    const stats = db.getUserStats(user_id);
    if (stats) {
      const statsIndex = db.userStats.findIndex(s => s.user_id === user_id);
      if (statsIndex !== -1) {
        db.userStats[statsIndex].total_badges_earned += 1;
        db.userStats[statsIndex].updated_at = new Date();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Insignia otorgada exitosamente',
      data: {
        user_badge: newUserBadge,
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity
        }
      }
    });

  } catch (error) {
    console.error('Error otorgando insignia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Verificar si un usuario puede obtener nuevas insignias automáticamente
router.post('/check-achievements', authenticateToken, (req, res) => {
  try {
    const { user_id } = req.body;
    const targetUserId = user_id || req.user.id;

    // Solo puede verificar sus propias insignias o ser admin
    if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para verificar logros de este usuario'
      });
    }

    const user = db.findUserById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener datos del usuario para verificar criterios
    const userStats = db.getUserStats(targetUserId);
    const userEnrollments = db.getUserCourses(targetUserId);
    const userBadges = db.userBadges.filter(ub => ub.user_id === targetUserId);
    const earnedBadgeIds = userBadges.map(ub => ub.badge_id);

    const newlyEarnedBadges = [];

    // Verificar cada insignia disponible
    db.badges.forEach(badge => {
      if (!badge.is_active || earnedBadgeIds.includes(badge.id)) {
        return; // Saltar insignias ya obtenidas o inactivas
      }

      const criteria = badge.criteria;
      let qualifies = false;

      // Verificar criterios específicos
      if (criteria.courses_completed) {
        const completedCourses = userEnrollments.filter(e => e.status === 'completed').length;
        qualifies = completedCourses >= criteria.courses_completed;
      }

      if (criteria.category && criteria.courses_completed) {
        const categoryObj = db.courseCategories.find(cat => 
          cat.name === criteria.category
        );
        if (categoryObj) {
          const categoryCompletedCourses = userEnrollments.filter(enrollment => {
            const course = db.getCourseById(enrollment.course_id);
            return course && 
                   course.category_id === categoryObj.id && 
                   enrollment.status === 'completed';
          }).length;
          qualifies = categoryCompletedCourses >= criteria.courses_completed;
        }
      }

      if (criteria.streak_days && userStats) {
        qualifies = userStats.current_streak_days >= criteria.streak_days;
      }

      // Si califica, agregar la insignia
      if (qualifies) {
        const newUserBadge = {
          id: `ub-${Date.now()}-${badge.id}`,
          user_id: targetUserId,
          badge_id: badge.id,
          earned_at: new Date(),
          awarded_by: null // Automático
        };
        
        db.userBadges.push(newUserBadge);
        newlyEarnedBadges.push({
          user_badge: newUserBadge,
          badge: {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity
          }
        });
      }
    });

    // Actualizar estadísticas si se obtuvieron nuevas insignias
    if (newlyEarnedBadges.length > 0 && userStats) {
      const statsIndex = db.userStats.findIndex(s => s.user_id === targetUserId);
      if (statsIndex !== -1) {
        db.userStats[statsIndex].total_badges_earned += newlyEarnedBadges.length;
        db.userStats[statsIndex].updated_at = new Date();
      }
    }

    res.json({
      success: true,
      message: `Se verificaron los logros. ${newlyEarnedBadges.length} nuevas insignias obtenidas.`,
      data: {
        newly_earned: newlyEarnedBadges,
        total_new_badges: newlyEarnedBadges.length
      }
    });

  } catch (error) {
    console.error('Error verificando logros:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener estadísticas globales de insignias (solo admin)
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const badgeStats = db.badges.map(badge => {
      const userBadgesCount = db.userBadges.filter(ub => ub.badge_id === badge.id).length;
      
      return {
        badge: {
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          rarity: badge.rarity
        },
        total_awarded: userBadgesCount,
        percentage_of_users: db.users.length > 0 ? 
          Math.round((userBadgesCount / db.users.length) * 100) : 0
      };
    });

    // Estadísticas generales
    const totalBadges = db.badges.length;
    const totalAwarded = db.userBadges.length;
    const totalUsers = db.users.length;
    const avgBadgesPerUser = totalUsers > 0 ? totalAwarded / totalUsers : 0;

    res.json({
      success: true,
      data: {
        overview: {
          total_badges: totalBadges,
          total_awarded: totalAwarded,
          total_users: totalUsers,
          average_badges_per_user: Math.round(avgBadgesPerUser * 100) / 100
        },
        badge_statistics: badgeStats.sort((a, b) => b.total_awarded - a.total_awarded)
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de insignias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;