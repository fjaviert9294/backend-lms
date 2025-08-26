const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Obtener todos los cursos (público)
router.get('/', optionalAuth, async(req, res) => {
  try {
    const { category, difficulty, search, status = 'published' } = req.query;
    
    let courses = await db.getAllCourses(course => course.status === status);

    // Filtrar por categoría
    if (category) {
      const categoryObj = await db.courseCategories.find(cat => 
        cat.name.toLowerCase() === category.toLowerCase()
      );
      if (categoryObj) {
        courses = courses.filter(course => course.category_id === categoryObj.id);
      }
    }

    // Filtrar por dificultad
    if (difficulty) {
      courses = courses.filter(course => 
        course.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }

    // Búsqueda por texto
    if (search) {
      const searchLower = search.toLowerCase();
      courses = courses.filter(course => 
        course.title.toLowerCase().includes(searchLower) ||
        course.description.toLowerCase().includes(searchLower) ||
        (course.tags && course.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Enriquecer con información de instructor y categoría
    const enrichedCourses = await Promise.all (courses.map(course => {
      const instructor = db.findUserById(course.instructor_id);
      const category = db.getCourseCategories(cat => cat.id === course.category_id);
      
      return {
        ...course,
        instructor: instructor ? {
          id: instructor.id,
          name: instructor.name,
          avatar_url: instructor.avatar_url
        } : null,
        category: category ? {
          id: category.id,
          name: category.name,
          color_hex: category.color_hex
        } : null,
        is_enrolled: req.user ? 
          db.courseEnrollments.some(e => 
            e.user_id === req.user.id && e.course_id === course.id
          ) : false
      };
    }));

    res.json({
      success: true,
      data: {
        courses: enrichedCourses,
        total: enrichedCourses.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo cursos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener curso específico
router.get('/:id', optionalAuth, async(req, res) => {
  try {
    const { id } = req.params;
    const course = await db.getCourseById(id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Información del instructor
    const instructor = await db.findUserById(course.instructor_id);
    const category = await db.courseCategories.find(cat => cat.id === course.category_id);
    
    // Capítulos del curso
    const chapters = await db.getCourseChapters(id);
    
    // Información de inscripción si el usuario está autenticado
    let enrollmentInfo = null;
    let chapterProgress = [];
    
    if (req.user) {
      const enrollment = await db.courseEnrollments.find(e => 
        e.user_id === req.user.id && e.course_id === id
      );
      
      if (enrollment) {
        enrollmentInfo = enrollment;
        chapterProgress = await db.getChapterProgress(req.user.id, id);
      }
    }

    // Enriquecer capítulos con progreso
    const enrichedChapters = chapters.map(chapter => {
      const progress = chapterProgress.find(cp => cp.chapter_id === chapter.id);
      return {
        ...chapter,
        is_completed: progress ? progress.is_completed : false,
        completed_at: progress ? progress.completed_at : null,
        time_spent_minutes: progress ? progress.time_spent_minutes : 0
      };
    });

    res.json({
      success: true,
      data: {
        course: {
          ...course,
          instructor: instructor ? {
            id: instructor.id,
            name: instructor.name,
            avatar_url: instructor.avatar_url,
            position: instructor.position
          } : null,
          category: category ? {
            id: category.id,
            name: category.name,
            color_hex: category.color_hex
          } : null,
          chapters: enrichedChapters,
          enrollment: enrollmentInfo,
          is_enrolled: !!enrollmentInfo
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Inscribirse a un curso
router.post('/:id/enroll', authenticateToken, async(req, res) => {
  try {
    const { id } = req.params;
    const course = await db.getCourseById(id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'El curso no está disponible para inscripción'
      });
    }

    // Verificar si ya está inscrito
    const existingEnrollment = await db.courseEnrollments.find(e => 
      e.user_id === req.user.id && e.course_id === id
    );

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'Ya estás inscrito en este curso'
      });
    }

    // Crear inscripción
    const enrollment = await db.addCourseEnrollment(req.user.id, id);

    res.status(201).json({
      success: true,
      message: 'Inscripción exitosa',
      data: {
        enrollment
      }
    });

  } catch (error) {
    console.error('Error en inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Marcar capítulo como completado
router.put('/:courseId/chapters/:chapterId/complete', authenticateToken, async(req, res) => {
  try {
    const { courseId, chapterId } = req.params;
    
    // Verificar que el usuario está inscrito en el curso
    const enrollment = await db.courseEnrollments.find(e => 
      e.user_id === req.user.id && e.course_id === courseId
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'No estás inscrito en este curso'
      });
    }

    // Verificar que el capítulo existe
    const chapter = await db.courseChapters.find(ch => 
      ch.id === chapterId && ch.course_id === courseId
    );

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Capítulo no encontrado'
      });
    }

    // Actualizar progreso del capítulo
    const updatedProgress = await db.updateChapterProgress(req.user.id, chapterId, true);

    // Calcular nuevo progreso del curso
    const allChapters = await db.getCourseChapters(courseId);
    const completedChapters = await db.getChapterProgress(req.user.id, courseId)
      .filter(cp => cp.is_completed).length;
    
    const progressPercentage = (completedChapters / allChapters.length) * 100;

    // Actualizar progreso de la inscripción
    const enrollmentIndex = await db.courseEnrollments.findIndex(e => e.id === enrollment.id);
    if (enrollmentIndex !== -1) {
        db.courseEnrollments[enrollmentIndex] = {
        ...db.courseEnrollments[enrollmentIndex],
        progress_percentage: progressPercentage,
        last_accessed_at: new Date(),
        status: progressPercentage === 100 ? 'completed' : 'active',
        completed_at: progressPercentage === 100 ? new Date() : null
      };
    }

    res.json({
      success: true,
      message: 'Capítulo marcado como completado',
      data: {
        chapter_progress: updatedProgress,
        course_progress: progressPercentage,
        is_course_completed: progressPercentage === 100
      }
    });

  } catch (error) {
    console.error('Error completando capítulo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Calificar un curso
router.post('/:id/rate', authenticateToken, [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser entre 1 y 5'),
  body('review')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La reseña no puede exceder 500 caracteres')
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
    const { rating, review } = req.body;

    // Verificar que el curso existe
    const course = await db.getCourseById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Verificar que el usuario completó el curso
    const enrollment = await db.courseEnrollments.find(e => 
      e.user_id === req.user.id && e.course_id === id && e.status === 'completed'
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Debes completar el curso para calificarlo'
      });
    }

    // Crear o actualizar calificación
    const existingRatingIndex = await db.courseRatings.findIndex(cr => 
      cr.user_id === req.user.id && cr.course_id === id
    );

    const ratingData = {
      user_id: req.user.id,
      course_id: id,
      rating,
      review: review || null,
      updated_at: new Date()
    };

    if (existingRatingIndex !== -1) {
        db.courseRatings[existingRatingIndex] = {
        ...db.courseRatings[existingRatingIndex],
        ...ratingData
      };
    } else {
      await db.courseRatings.push({
        id: `cr-${Date.now()}`,
        created_at: new Date(),
        ...ratingData
      });
    }

    // Actualizar promedio del curso
    const courseRatings = await db.courseRatings.filter(cr => cr.course_id === id);
    const averageRating = courseRatings.reduce((sum, cr) => sum + cr.rating, 0) / courseRatings.length;
    
    const courseIndex = await db.courses.findIndex(c => c.id === id);
    if (courseIndex !== -1) {
      db.courses[courseIndex].rating_average = Math.round(averageRating * 100) / 100;
    }

    res.json({
      success: true,
      message: 'Calificación guardada exitosamente',
      data: {
        rating: ratingData,
        course_average: Math.round(averageRating * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error calificando curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener categorías de cursos
router.get('/categories/list', async(req, res) => {
  try {
    res.json({
      success: true,
      data: {
        categories: await db.courseCategories
      }
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;