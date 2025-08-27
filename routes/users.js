const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireSelfOrAdmin, requireAdmin } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Obtener perfil del usuario
router.get('/:id', authenticateToken, requireSelfOrAdmin, async(req, res) => {
  try {
    const { id } = req.params;
    const user = await db.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener estadísticas del usuario
    const stats = await db.getUserStats(id);
    const badges = await db.getUserBadges(id);
    const enrollments = await db.getUserCourses(id);
  
    // Enriquecer inscripciones con información del curso
    const enrichedEnrollments = await Promise.all (enrollments.map(enrollment => {
      const course = db.getCourseById(enrollment.course_id);
      const category = course ? db.getCourseCategories(cat => cat.id === course.category_id) : null;

      return {
        ...enrollment,
        course: course ? {
          id: course.id,
          title: course.title,
          thumbnail_url: course.thumbnail_url,
          difficulty: course.difficulty,
          category: category ? {
            name: category.name,
            color_hex: category.color_hex
          } : null
        } : null
      };
    }));

    // Remover contraseña de la respuesta
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      data: {
        user: userResponse,
        stats: stats || {
          total_courses_completed: 0,
          total_badges_earned: 0,
          current_streak_days: 0,
          longest_streak_days: 0,
          total_time_spent_minutes: 0
        },
        badges,
        enrollments: enrichedEnrollments
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar perfil del usuario
router.put('/:id', authenticateToken, requireSelfOrAdmin, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El departamento no puede exceder 100 caracteres'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El puesto no puede exceder 100 caracteres'),
  body('avatar_url')
    .optional()
    .isURL()
    .withMessage('URL del avatar debe ser válida')
], async (req, res) => {
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
    const { name, department, position, avatar_url } = req.body;

    const user = await db.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear objeto con solo los campos que se van a actualizar
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const updatedUser = await db.updateUser(id, updateData);

    // Remover contraseña de la respuesta
    const { password: _, ...userResponse } = updatedUser;

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Cambiar contraseña
router.put('/:id/password', authenticateToken, requireSelfOrAdmin, [
  body('current_password')
    .if((value, { req }) => req.user.id === req.params.id)
    .notEmpty()
    .withMessage('Contraseña actual es requerida'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    })
], async (req, res) => {
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
    const { current_password, new_password } = req.body;

    const user = await db.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si el usuario está cambiando su propia contraseña, verificar la actual
    if (req.user.id === id) {
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }
    }

    // Encriptar nueva contraseña
    const hashedNewPassword = await bcrypt.hash(new_password, 12);

    // Actualizar contraseña
    await db.updateUser(id, { password: hashedNewPassword });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener cursos del usuario
router.get('/:id/courses', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // active, completed, all

    let enrollments = await db.getUserCourses(id);
    // Filtrar por estado si se especifica
    if (status && status !== 'all') {
      enrollments = enrollments.filter(enrollment => enrollment.status === status);
    }

    // Enriquecer con información del curso
    const enrichedEnrollments = await Promise.all (enrollments.map(async enrollment => {
      const course = db.getCourseById(enrollment.course_id);
      const category = course ? db.getCourseCategories(cat => cat.id === course.category_id) : null;
      const instructor = course ? db.findUserById(course.instructor_id) : null;

      // Obtener progreso de capítulos
      const chapterProgress = await db.getChapterProgress(id, enrollment.course_id);
      const courseChapters = course ? db.getCourseChapters(course.id) : [];
      
      return {
        ...enrollment,
        course: course ? {
          ...course,
          category: category ? {
            name: category.name,
            color_hex: category.color_hex
          } : null,
          instructor: instructor ? {
            name: instructor.name,
            avatar_url: instructor.avatar_url
          } : null,
          total_chapters: courseChapters.length,
          completed_chapters: chapterProgress.filter(cp => cp.is_completed).length
        } : null
      };
    }));
    

    res.json({
      success: true,
      data: {
        enrollments: enrichedEnrollments,
        total: enrichedEnrollments.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo cursos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener estadísticas del usuario
router.get('/:id/stats', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const stats = await db.getUserStats(id);
    const badges = await db.getUserBadges(id);
    const enrollments = await db.getUserCourses(id);

    // Calcular estadísticas adicionales
    const completedCourses = enrollments.filter(e => e.status === 'completed');
    const activeCourses = enrollments.filter(e => e.status === 'active');
    
    // Progreso por categoría
    const progressByCategory = {};
    enrollments.forEach(enrollment => {
      const course = db.getCourseById(enrollment.course_id);
      if (course) {
        const category = db.getCourseCategories(cat => cat.id === course.category_id);
        if (category) {
          if (!progressByCategory[category.name]) {
            progressByCategory[category.name] = {
              total: 0,
              completed: 0,
              in_progress: 0
            };
          }
          progressByCategory[category.name].total++;
          if (enrollment.status === 'completed') {
            progressByCategory[category.name].completed++;
          } else if (enrollment.status === 'active') {
            progressByCategory[category.name].in_progress++;
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          total_enrollments: enrollments.length,
          completed_courses: completedCourses.length,
          active_courses: activeCourses.length,
          total_badges: badges.length,
          ...stats
        },
        badges: await Promise.all(badges.map(badge => ({
          ...badge,
          earned_date: db.getUserBadges(badge.user_id)?.earned_at
        }))),
        progress_by_category: progressByCategory
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener lista de usuarios (solo admin)
router.get('/', authenticateToken, requireAdmin, async(req, res) => {
  try {
    const { role, department, search, page = 1, limit = 20 } = req.query;
    
    let users = await db.users.filter(user => user.is_active);

    // Filtros
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
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Remover contraseñas y enriquecer con estadísticas básicas
    const enrichedUsers = await Promise.all (paginatedUsers.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      const stats = db.getUserStats(user.id);
      const enrollments = db.getUserCourses(user.id);
      
      return {
        ...userWithoutPassword,
        stats: {
          total_courses: enrollments.length,
          completed_courses: enrollments.filter(e => e.status === 'completed').length,
          total_badges: db.getUserBadges(user.id).length
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
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;