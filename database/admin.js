const { query } = require('./connection');

// ================================
// FUNCIONES DE ADMINISTRACIÓN
// ================================

/**
 * Obtener estadísticas del dashboard de administración
 */
const getDashboardStats = async () => {
  const text = `
    SELECT 
      -- Estadísticas de usuarios
      (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = true) as students,
      (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND is_active = true) as instructors,
      (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true) as admins,
      
      -- Estadísticas de cursos
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM courses WHERE status = 'published') as published_courses,
      (SELECT COUNT(*) FROM courses WHERE status = 'draft') as draft_courses,
      (SELECT COUNT(*) FROM courses WHERE status = 'archived') as archived_courses,
      
      -- Estadísticas de inscripciones
      (SELECT COUNT(*) FROM course_enrollments) as total_enrollments,
      (SELECT COUNT(*) FROM course_enrollments WHERE status = 'active') as active_enrollments,
      (SELECT COUNT(*) FROM course_enrollments WHERE status = 'completed') as completed_enrollments,
      (SELECT COUNT(*) FROM course_enrollments WHERE status = 'dropped') as dropped_enrollments,
      
      -- Estadísticas de insignias
      (SELECT COUNT(*) FROM user_badges) as total_badges_awarded,
      (SELECT COUNT(*) FROM badges WHERE is_active = true) as total_badges_available
  `;
  
  try {
    const result = await query(text);
    const stats = result.rows[0];
    
    return {
      overview: {
        total_users: parseInt(stats.total_users),
        total_courses: parseInt(stats.total_courses),
        total_enrollments: parseInt(stats.total_enrollments),
        total_badges_awarded: parseInt(stats.total_badges_awarded),
        total_badges_available: parseInt(stats.total_badges_available)
      },
      users_by_role: {
        student: parseInt(stats.students),
        instructor: parseInt(stats.instructors),
        admin: parseInt(stats.admins)
      },
      courses_by_status: {
        published: parseInt(stats.published_courses),
        draft: parseInt(stats.draft_courses),
        archived: parseInt(stats.archived_courses)
      },
      enrollments_by_status: {
        active: parseInt(stats.active_enrollments),
        completed: parseInt(stats.completed_enrollments),
        dropped: parseInt(stats.dropped_enrollments)
      }
    };
    
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    throw error;
  }
};

/**
 * Obtener cursos más populares
 */
const getPopularCourses = async (limit = 5) => {
  const text = `
    SELECT 
      c.id,
      c.title,
      c.rating_average,
      COUNT(ce.id) as enrollments,
      COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completions,
      CASE 
        WHEN COUNT(ce.id) > 0 
        THEN ROUND((COUNT(CASE WHEN ce.status = 'completed' THEN 1 END)::DECIMAL / COUNT(ce.id)) * 100, 2)
        ELSE 0 
      END as completion_rate
    FROM courses c
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    WHERE c.status = 'published'
    GROUP BY c.id, c.title, c.rating_average
    ORDER BY enrollments DESC, completion_rate DESC
    LIMIT $1
  `;
  
  try {
    const result = await query(text, [limit]);
    return result.rows.map(course => ({
      ...course,
      enrollments: parseInt(course.enrollments),
      completions: parseInt(course.completions),
      completion_rate: parseFloat(course.completion_rate),
      rating: parseFloat(course.rating_average) || 0
    }));
    
  } catch (error) {
    console.error('Error al obtener cursos populares:', error);
    throw error;
  }
};

/**
 * Obtener actividad reciente
 */
const getRecentActivity = async (limit = 10) => {
  const enrollmentsText = `
    SELECT 
      ce.id,
      ce.enrolled_at as activity_date,
      'enrollment' as activity_type,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      c.id as course_id,
      c.title as course_title,
      ce.status
    FROM course_enrollments ce
    JOIN users u ON ce.user_id = u.id
    JOIN courses c ON ce.course_id = c.id
    ORDER BY ce.enrolled_at DESC
    LIMIT $1
  `;
  
  const badgesText = `
    SELECT 
      ub.id,
      ub.earned_at as activity_date,
      'badge_earned' as activity_type,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      b.id as badge_id,
      b.name as badge_name,
      b.icon as badge_icon
    FROM user_badges ub
    JOIN users u ON ub.user_id = u.id
    JOIN badges b ON ub.badge_id = b.id
    ORDER BY ub.earned_at DESC
    LIMIT $1
  `;
  
  try {
    const [enrollmentsResult, badgesResult] = await Promise.all([
      query(enrollmentsText, [limit]),
      query(badgesText, [limit])
    ]);
    
    return {
      enrollments: enrollmentsResult.rows,
      badges: badgesResult.rows
    };
    
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas detalladas de cursos
 */
const getCourseStats = async () => {
  const text = `
    SELECT 
      c.id,
      c.title,
      c.status,
      c.difficulty,
      c.estimated_duration_hours,
      c.rating_average,
      c.created_at,
      c.published_at,
      u.name as instructor_name,
      cat.name as category_name,
      COUNT(cc.id) as total_chapters,
      COUNT(ce.id) as total_enrollments,
      COUNT(CASE WHEN ce.status = 'active' THEN 1 END) as active_enrollments,
      COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completed_enrollments,
      CASE 
        WHEN COUNT(ce.id) > 0 
        THEN ROUND((COUNT(CASE WHEN ce.status = 'completed' THEN 1 END)::DECIMAL / COUNT(ce.id)) * 100, 2)
        ELSE 0 
      END as completion_rate,
      -- Calcular tiempo promedio de finalización en días
      CASE 
        WHEN COUNT(CASE WHEN ce.status = 'completed' AND ce.completed_at IS NOT NULL THEN 1 END) > 0
        THEN ROUND(AVG(CASE WHEN ce.status = 'completed' AND ce.completed_at IS NOT NULL 
                          THEN EXTRACT(EPOCH FROM (ce.completed_at - ce.enrolled_at)) / 86400 
                          END), 1)
        ELSE 0 
      END as avg_completion_time_days
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_categories cat ON c.category_id = cat.id
    LEFT JOIN course_chapters cc ON c.id = cc.course_id
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    GROUP BY c.id, c.title, c.status, c.difficulty, c.estimated_duration_hours, 
             c.rating_average, c.created_at, c.published_at, u.name, cat.name
    ORDER BY total_enrollments DESC
  `;
  
  try {
    const result = await query(text);
    return result.rows.map(course => ({
      ...course,
      total_chapters: parseInt(course.total_chapters),
      total_enrollments: parseInt(course.total_enrollments),
      active_enrollments: parseInt(course.active_enrollments),
      completed_enrollments: parseInt(course.completed_enrollments),
      completion_rate: parseFloat(course.completion_rate),
      rating_average: parseFloat(course.rating_average) || 0,
      avg_completion_time_days: parseFloat(course.avg_completion_time_days)
    }));
    
  } catch (error) {
    console.error('Error al obtener estadísticas de cursos:', error);
    throw error;
  }
};

/**
 * Obtener reportes de actividad por período
 */
const getActivityReport = async (filters = {}) => {
  const { startDate, endDate, period = 30 } = filters;
  
  let dateCondition;
  let queryParams = [];
  
  if (startDate && endDate) {
    dateCondition = 'BETWEEN $1 AND $2';
    queryParams = [startDate, endDate];
  } else {
    dateCondition = `>= NOW() - INTERVAL '${period} days'`;
  }
  
  const enrollmentsText = `
    SELECT 
      DATE(enrolled_at) as activity_date,
      COUNT(*) as enrollments,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completions
    FROM course_enrollments
    WHERE enrolled_at ${dateCondition}
    GROUP BY DATE(enrolled_at)
    ORDER BY activity_date ASC
  `;
  
  const badgesText = `
    SELECT 
      DATE(earned_at) as activity_date,
      COUNT(*) as badges_earned
    FROM user_badges
    WHERE earned_at ${dateCondition}
    GROUP BY DATE(earned_at)
    ORDER BY activity_date ASC
  `;
  
  const summaryText = `
    SELECT 
      COUNT(DISTINCT ce.id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.id END) as total_completions,
      COUNT(DISTINCT ub.id) as total_badges_awarded,
      CASE 
        WHEN COUNT(DISTINCT ce.id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.id END)::DECIMAL / COUNT(DISTINCT ce.id)) * 100, 2)
        ELSE 0 
      END as completion_rate
    FROM course_enrollments ce
    FULL OUTER JOIN user_badges ub ON DATE(ce.enrolled_at) = DATE(ub.earned_at)
    WHERE ce.enrolled_at ${dateCondition} OR ub.earned_at ${dateCondition}
  `;
  
  // Actividad por curso
  const courseActivityText = `
    SELECT 
      c.id as course_id,
      c.title as course_title,
      COUNT(ce.id) as enrollments,
      COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completions
    FROM courses c
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.enrolled_at ${dateCondition}
    GROUP BY c.id, c.title
    HAVING COUNT(ce.id) > 0
    ORDER BY enrollments DESC
    LIMIT 10
  `;
  
  try {
    const [enrollmentsResult, badgesResult, summaryResult, courseActivityResult] = await Promise.all([
      query(enrollmentsText, queryParams),
      query(badgesText, queryParams),
      query(summaryText, queryParams),
      query(courseActivityText, queryParams)
    ]);
    
    // Combinar datos diarios
    const dailyActivity = [];
    const enrollmentsByDate = new Map();
    const badgesByDate = new Map();
    
    enrollmentsResult.rows.forEach(row => {
      enrollmentsByDate.set(row.activity_date.toISOString().split('T')[0], {
        enrollments: parseInt(row.enrollments),
        completions: parseInt(row.completions)
      });
    });
    
    badgesResult.rows.forEach(row => {
      badgesByDate.set(row.activity_date.toISOString().split('T')[0], {
        badges_earned: parseInt(row.badges_earned)
      });
    });
    
    // Crear array combinado
    const allDates = new Set([...enrollmentsByDate.keys(), ...badgesByDate.keys()]);
    allDates.forEach(date => {
      const enrollment = enrollmentsByDate.get(date) || { enrollments: 0, completions: 0 };
      const badge = badgesByDate.get(date) || { badges_earned: 0 };
      
      dailyActivity.push({
        date,
        enrollments: enrollment.enrollments,
        completions: enrollment.completions,
        badges_earned: badge.badges_earned
      });
    });
    
    dailyActivity.sort((a, b) => a.date.localeCompare(b.date));
    
    const summary = summaryResult.rows[0];
    
    return {
      period: {
        start_date: startDate || new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: endDate || new Date().toISOString().split('T')[0],
        days: period
      },
      summary: {
        total_enrollments: parseInt(summary.total_enrollments) || 0,
        total_completions: parseInt(summary.total_completions) || 0,
        total_badges_awarded: parseInt(summary.total_badges_awarded) || 0,
        completion_rate: parseFloat(summary.completion_rate) || 0
      },
      daily_activity: dailyActivity,
      top_active_courses: courseActivityResult.rows.map(course => ({
        course: {
          id: course.course_id,
          title: course.course_title
        },
        enrollments: parseInt(course.enrollments),
        completions: parseInt(course.completions)
      }))
    };
    
  } catch (error) {
    console.error('Error al obtener reporte de actividad:', error);
    throw error;
  }
};

/**
 * Obtener configuración del sistema
 */
const getSystemSettings = async () => {
  // En una implementación real, esto vendría de una tabla de configuración
  return {
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
};

module.exports = {
  getDashboardStats,
  getPopularCourses,
  getRecentActivity,
  getCourseStats,
  getActivityReport,
  getSystemSettings
};