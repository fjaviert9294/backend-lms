const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Dashboard de administración - Estadísticas generales
router.get('/dashboard', authenticateToken, requireAdmin, async(req, res) => {
  try {
    // Estadísticas de usuarios
    const totalUsers = await db.users.filter(u => u.is_active).length;
    const usersByRole = {
      student: await db.users.filter(u => u.role === 'student' && u.is_active).length,
      instructor: await db.users.filter(u => u.role === 'instructor' && u.is_active).length,
      admin: await db.users.filter(u => u.role === 'admin' && u.is_active).length
    };

    // Estadísticas de cursos
    const totalCourses = await db.courses.length;
    const coursesByStatus = {
      published: await db.courses.filter(c => c.status === 'published').length,
      draft: await db.courses.filter(c => c.status === 'draft').length,
      archived: await db.courses.filter(c => c.status === 'archived').length
    };

    // Estadísticas de inscripciones
    const totalEnrollments = await db.courseEnrollments.length;
    const enrollmentsByStatus = {
      active: await db.courseEnrollments.filter(e => e.status === 'active').length,
      completed: await db.courseEnrollments.filter(e => e.status === 'completed').length,
      dropped: await db.courseEnrollments.filter(e => e.status === 'dropped').length
    };

    // Estadísticas de insignias
    const totalBadgesAwarded = await db.userBadges.length;
    const totalBadgesAvailable = await db.badges.filter(b => b.is_active).length;

    // Cursos más populares
    const coursesWithEnrollments = await Promise.all (db.courses.map(course => {
      const enrollmentCount = db.courseEnrollments.filter(e => e.course_id === course.id).length;
      const completionRate = enrollmentCount > 0 ? 
        (db.courseEnrollments.filter(e => e.course_id === course.id && e.status === 'completed').length / enrollmentCount) * 100 : 0;
      
      return {
        id: course.id,
        title: course.title,
        enrollments: enrollmentCount,
        completion_rate: Math.round(completionRate * 100) / 100,
        rating: course.rating_average
      };
    })).sort((a, b) => b.enrollments - a.enrollments).slice(0, 5);

    // Actividad reciente
    const recentEnrollments = await Promise.all (db.courseEnrollments
      .sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at))
      .slice(0, 10)
      .map(enrollment => {
        const user = db.findUserById(enrollment.user_id);
        const course = db.getCourseById(enrollment.course_id);
        return {
          id: enrollment.id,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
          course: course ? { id: course.id, title: course.title } : null,
          enrolled_at: enrollment.enrolled_at,
          status: enrollment.status
        };
      }));

    // Insignias recientes
    const recentBadges = await Promise.all (db.userBadges
      .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
      .slice(0, 10)
      .map(userBadge => {
        const user = db.findUserById(userBadge.user_id);
        const badge = db.badges.find(b => b.id === userBadge.badge_id);
        return {
          id: userBadge.id,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
          badge: badge ? { id: badge.id, name: badge.name, icon: badge.icon } : null,
          earned_at: userBadge.earned_at
        };
      }));

    res.json({
      success: true,
      data: {
        overview: {
          total_users: totalUsers,
          total_courses: totalCourses,
          total_enrollments: totalEnrollments,
          total_badges_awarded: totalBadgesAwarded,
          total_badges_available: totalBadgesAvailable
        },
        users_by_role: usersByRole,
        courses_by_status: coursesByStatus,
        enrollments_by_status: enrollmentsByStatus,
        popular_courses: coursesWithEnrollments,
        recent_activity: {
          enrollments: recentEnrollments,
          badges: recentBadges
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo dashboard admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Gestión de usuarios - Obtener lista completa
router.get('/users', authenticateToken, requireAdmin, async(req, res) => {
  try {
    const { 
      role, 
      department, 
      search, 
      status = 'active',
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    let users = await db.users;

    // Filtrar por estado
    if (status !== 'all') {
      const isActive = status === 'active';
      users = users.filter(user => user.is_active === isActive);
    }

    // Filtros adicionales
    if (role && role !== 'all') {
      users = users.filter(user => user.role === role);
    }

    if (department) {
      users = users.filter(user => 
        user.department && user.department.toLowerCase().includes(department.toLowerCase())
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.department && user.department.toLowerCase().includes(searchLower)) ||
        (user.position && user.position.toLowerCase().includes(searchLower))
      );
    }

    // Ordenamiento
    users.sort((a, b) => {
      let aValue = a[sort_by];
      let bValue = b[sort_by];
      
      if (sort_by === 'created_at' || sort_by === 'last_login') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sort_order === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Enriquecer con estadísticas
    const enrichedUsers = await Promise.all (paginatedUsers.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      const stats = db.getUserStats(user.id);
      const enrollments = db.getUserCourses(user.id);
      const badges = db.getUserBadges(user.id);
      
      return {
        ...userWithoutPassword,
        stats: {
          total_courses: enrollments.length,
          completed_courses: enrollments.filter(e => e.status === 'completed').length,
          total_badges: badges.length,
          current_streak: stats ? stats.current_streak_days : 0,
          total_time_spent: stats ? stats.total_time_spent_minutes : 0
        }
      };
    }));

    res.json({
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(users.length / limit),
          total_items: users.length,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Desactivar/Activar usuario
router.put('/users/:id/toggle-status', authenticateToken, requireAdmin, async(req, res) => {
  try {
    const { id } = req.params;
    
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    const user = await db.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const newStatus = !user.is_active;
    const updatedUser = await db.updateUser(id, { is_active: newStatus });

    res.json({
      success: true,
      message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          is_active: updatedUser.is_active
        }
      }
    });

  } catch (error) {
    console.error('Error cambiando estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Cambiar rol de usuario
router.put('/users/:id/role', authenticateToken, requireAdmin, [
  body('role')
    .isIn(['student', 'instructor', 'admin'])
    .withMessage('Rol debe ser student, instructor o admin')
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

    const { id } = req.params;
    const { role } = req.body;
    
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol de administrador'
      });
    }

    const user = await db.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const updatedUser = await db.updateUser(id, { role });

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      }
    });

  } catch (error) {
    console.error('Error cambiando rol del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Gestión de cursos - Estadísticas detalladas
router.get('/courses/stats', authenticateToken, requireAdmin, async(req, res) => {
  try {
    const coursesWithStats = await Promise.all (db.courses.map(course => {
      const enrollments = db.courseEnrollments.filter(e => e.course_id === course.id);
      const completedEnrollments = enrollments.filter(e => e.status === 'completed');
      const activeEnrollments = enrollments.filter(e => e.status === 'active');
      
      const totalChapters = db.getCourseChapters(course.id).length;
      const instructor = db.findUserById(course.instructor_id);
      const category = db.courseCategories.find(cat => cat.id === course.category_id);
      
      // Calcular tiempo promedio de finalización
      let avgCompletionTime = 0;
      if (completedEnrollments.length > 0) {
        const completionTimes = completedEnrollments
          .filter(e => e.completed_at && e.enrolled_at)
          .map(e => new Date(e.completed_at) - new Date(e.enrolled_at));
        
        if (completionTimes.length > 0) {
          avgCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
          avgCompletionTime = Math.round(avgCompletionTime / (1000 * 60 * 60 * 24)); // Convertir a días
        }
      }

      return {
        id: course.id,
        title: course.title,
        status: course.status,
        instructor: instructor ? { id: instructor.id, name: instructor.name } : null,
        category: category ? { id: category.id, name: category.name } : null,
        difficulty: course.difficulty,
        estimated_hours: course.estimated_duration_hours,
        total_chapters: totalChapters,
        rating_average: course.rating_average,
        created_at: course.created_at,
        stats: {
          total_enrollments: enrollments.length,
          active_enrollments: activeEnrollments.length,
          completed_enrollments: completedEnrollments.length,
          completion_rate: enrollments.length > 0 ? 
            Math.round((completedEnrollments.length / enrollments.length) * 100) : 0,
          avg_completion_time_days: avgCompletionTime
        }
      };
    }));

    // Ordenar por popularidad (inscripciones totales)
    coursesWithStats.sort((a, b) => b.stats.total_enrollments - a.stats.total_enrollments);

    res.json({
      success: true,
      data: {
        courses: coursesWithStats,
        total: coursesWithStats.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de cursos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Reportes de actividad
router.get('/reports/activity', authenticateToken, requireAdmin, async(req, res) => {
  try {
    const { period = '30', start_date, end_date } = req.query;
    
    let startDate, endDate;
    
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));
    }

    // Inscripciones en el período
    const enrollmentsInPeriod = await db.courseEnrollments.filter(e => {
      const enrollDate = new Date(e.enrolled_at);
      return enrollDate >= startDate && enrollDate <= endDate;
    });

    // Completaciones en el período
    const completionsInPeriod = await db.courseEnrollments.filter(e => {
      if (!e.completed_at) return false;
      const completeDate = new Date(e.completed_at);
      return completeDate >= startDate && completeDate <= endDate;
    });

    // Insignias otorgadas en el período
    const badgesInPeriod = await db.userBadges.filter(ub => {
      const earnedDate = new Date(ub.earned_at);
      return earnedDate >= startDate && earnedDate <= endDate;
    });

    // Actividad diaria
    const dailyActivity = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStr = currentDate.toISOString().split('T')[0];
      const dayEnrollments = enrollmentsInPeriod.filter(e => 
        e.enrolled_at.split('T')[0] === dayStr
      ).length;
      const dayCompletions = completionsInPeriod.filter(e => 
        e.completed_at && e.completed_at.split('T')[0] === dayStr
      ).length;
      
      dailyActivity.push({
        date: dayStr,
        enrollments: dayEnrollments,
        completions: dayCompletions
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Cursos más activos en el período
    const courseActivity = {};
    enrollmentsInPeriod.forEach(enrollment => {
      if (!courseActivity[enrollment.course_id]) {
        courseActivity[enrollment.course_id] = {
          enrollments: 0,
          completions: 0
        };
      }
      courseActivity[enrollment.course_id].enrollments++;
    });

    completionsInPeriod.forEach(completion => {
      if (courseActivity[completion.course_id]) {
        courseActivity[completion.course_id].completions++;
      }
    });

    const topActiveCourses = await Promise.all (Object.entries(courseActivity)
      .map(([courseId, activity]) => {
        const course = db.getCourseById(courseId);
        return {
          course: course ? { id: course.id, title: course.title } : null,
          ...activity
        };
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        summary: {
          total_enrollments: enrollmentsInPeriod.length,
          total_completions: completionsInPeriod.length,
          total_badges_awarded: badgesInPeriod.length,
          completion_rate: enrollmentsInPeriod.length > 0 ? 
            Math.round((completionsInPeriod.length / enrollmentsInPeriod.length) * 100) : 0
        },
        daily_activity: dailyActivity,
        top_active_courses: topActiveCourses
      }
    });

  } catch (error) {
    console.error('Error generando reporte de actividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Configuración del sistema
router.get('/settings', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Configuraciones simuladas del sistema
    const settings = {
      platform: {
        name: 'LMS Corporativo',
        version: '1.0.0',
        max_file_size_mb: 50,
        allowed_file_types: ['pdf', 'docx', 'pptx', 'mp4', 'webm'],
        default_language: 'es',
        timezone: 'America/Mexico_City'
      },
      notifications: {
        email_enabled: true,
        push_enabled: true,
        daily_digest: true,
        achievement_notifications: true
      },
      courses: {
        auto_enrollment: false,
        require_approval: false,
        default_visibility: 'published',
        max_chapters_per_course: 50
      },
      badges: {
        auto_award: true,
        require_admin_approval: false,
        show_progress: true
      }
    };

    res.json({
      success: true,
      data: {
        settings
      }
    });

  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;