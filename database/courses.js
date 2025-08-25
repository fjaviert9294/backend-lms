const { query, transaction } = require('./connection');

// ================================
// FUNCIONES DE CURSOS
// ================================

/**
 * Obtener todos los cursos con filtros
 */
const getCourses = async (filters = {}) => {
  const { category, difficulty, search, status = 'published', userId } = filters;
  
  let whereConditions = [`c.status = $1`];
  let queryParams = [status];
  let paramCount = 2;
  
  // Filtro por categoría
  if (category) {
    whereConditions.push(`cat.name ILIKE $${paramCount}`);
    queryParams.push(`%${category}%`);
    paramCount++;
  }
  
  // Filtro por dificultad
  if (difficulty) {
    whereConditions.push(`c.difficulty = $${paramCount}`);
    queryParams.push(difficulty);
    paramCount++;
  }
  
  // Búsqueda por texto
  if (search) {
    whereConditions.push(`(c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount + 1})`);
    queryParams.push(`%${search}%`, `%${search}%`);
    paramCount += 2;
  }
  
  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
  
  const text = `
    SELECT c.*, 
           u.name as instructor_name,
           u.avatar_url as instructor_avatar,
           cat.name as category_name,
           cat.color_hex as category_color,
           COUNT(ce.id) as total_enrollments,
           AVG(cr.rating) as rating_average,
           ${userId ? `EXISTS(SELECT 1 FROM course_enrollments WHERE user_id = $${paramCount} AND course_id = c.id) as is_enrolled` : 'false as is_enrolled'}
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_categories cat ON c.category_id = cat.id
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    LEFT JOIN course_ratings cr ON c.id = cr.course_id
    ${whereClause}
    GROUP BY c.id, u.name, u.avatar_url, cat.name, cat.color_hex
    ORDER BY c.created_at DESC
  `;
  
  if (userId) {
    queryParams.push(userId);
  }
  
  try {
    const result = await query(text, queryParams);
    return result.rows.map(course => ({
      ...course,
      tags: course.tags || [],
      rating_average: parseFloat(course.rating_average) || 0,
      total_enrollments: parseInt(course.total_enrollments) || 0
    }));
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    throw error;
  }
};

/**
 * Obtener curso por ID con detalles completos
 */
const getCourseById = async (courseId, userId = null) => {
  const text = `
    SELECT c.*, 
           u.name as instructor_name,
           u.avatar_url as instructor_avatar,
           u.position as instructor_position,
           cat.name as category_name,
           cat.color_hex as category_color,
           COUNT(ce.id) as total_enrollments,
           AVG(cr.rating) as rating_average
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_categories cat ON c.category_id = cat.id
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    LEFT JOIN course_ratings cr ON c.id = cr.course_id
    WHERE c.id = $1
    GROUP BY c.id, u.name, u.avatar_url, u.position, cat.name, cat.color_hex
  `;
  
  try {
    const courseResult = await query(text, [courseId]);
    
    if (courseResult.rows.length === 0) {
      return null;
    }
    
    const course = courseResult.rows[0];
    
    // Obtener capítulos del curso
    const chaptersResult = await query(`
      SELECT id, title, description, content_type, estimated_duration_minutes, order_index
      FROM course_chapters
      WHERE course_id = $1
      ORDER BY order_index ASC
    `, [courseId]);
    
    // Si hay un usuario, obtener su progreso
    let enrollmentInfo = null;
    let chapterProgress = [];
    
    if (userId) {
      const enrollmentResult = await query(`
        SELECT * FROM course_enrollments 
        WHERE user_id = $1 AND course_id = $2
      `, [userId, courseId]);
      
      if (enrollmentResult.rows.length > 0) {
        enrollmentInfo = enrollmentResult.rows[0];
        
        const progressResult = await query(`
          SELECT cp.* 
          FROM chapter_progress cp
          WHERE cp.enrollment_id = $1
        `, [enrollmentInfo.id]);
        
        chapterProgress = progressResult.rows;
      }
    }
    
    // Enriquecer capítulos con progreso
    const enrichedChapters = chaptersResult.rows.map(chapter => {
      const progress = chapterProgress.find(cp => cp.chapter_id === chapter.id);
      return {
        ...chapter,
        is_completed: progress ? progress.is_completed : false,
        completed_at: progress ? progress.completed_at : null,
        time_spent_minutes: progress ? progress.time_spent_minutes : 0
      };
    });
    
    return {
      ...course,
      tags: course.tags || [],
      rating_average: parseFloat(course.rating_average) || 0,
      total_enrollments: parseInt(course.total_enrollments) || 0,
      chapters: enrichedChapters,
      enrollment: enrollmentInfo,
      is_enrolled: !!enrollmentInfo
    };
    
  } catch (error) {
    console.error('Error al obtener curso por ID:', error);
    throw error;
  }
};

/**
 * Obtener categorías de cursos
 */
const getCourseCategories = async () => {
  const text = `
    SELECT * FROM course_categories 
    ORDER BY name ASC
  `;
  
  try {
    const result = await query(text);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};

/**
 * Inscribir usuario a un curso
 */
const enrollUserToCourse = async (userId, courseId) => {
  const text = `
    INSERT INTO course_enrollments (user_id, course_id, enrolled_at, progress_percentage, status)
    VALUES ($1, $2, NOW(), 0, 'active')
    RETURNING *
  `;
  
  try {
    // Verificar que el curso existe y está publicado
    const courseCheck = await query(
      'SELECT id, status FROM courses WHERE id = $1', 
      [courseId]
    );
    
    if (courseCheck.rows.length === 0) {
      throw new Error('Curso no encontrado');
    }
    
    if (courseCheck.rows[0].status !== 'published') {
      throw new Error('El curso no está disponible para inscripción');
    }
    
    // Verificar que el usuario no esté ya inscrito
    const existingEnrollment = await query(
      'SELECT id FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    
    if (existingEnrollment.rows.length > 0) {
      throw new Error('Ya estás inscrito en este curso');
    }
    
    const result = await query(text, [userId, courseId]);
    return result.rows[0];
    
  } catch (error) {
    console.error('Error al inscribir usuario al curso:', error);
    throw error;
  }
};

/**
 * Completar un capítulo
 */
const completeChapter = async (userId, courseId, chapterId) => {
  try {
    return await transaction(async (client) => {
      // Verificar inscripción
      const enrollmentResult = await client.query(
        'SELECT * FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );
      
      if (enrollmentResult.rows.length === 0) {
        throw new Error('No estás inscrito en este curso');
      }
      
      const enrollment = enrollmentResult.rows[0];
      
      // Verificar que el capítulo existe
      const chapterResult = await client.query(
        'SELECT * FROM course_chapters WHERE id = $1 AND course_id = $2',
        [chapterId, courseId]
      );
      
      if (chapterResult.rows.length === 0) {
        throw new Error('Capítulo no encontrado');
      }
      
      // Actualizar o insertar progreso del capítulo
      const progressResult = await client.query(`
        INSERT INTO chapter_progress (enrollment_id, user_id, chapter_id, is_completed, completed_at)
        VALUES ($1, $2, $3, true, NOW())
        ON CONFLICT (enrollment_id, chapter_id) 
        DO UPDATE SET is_completed = true, completed_at = NOW()
        RETURNING *
      `, [enrollment.id, userId, chapterId]);
      
      // Calcular nuevo progreso del curso
      const [totalChapters, completedChapters] = await Promise.all([
        client.query('SELECT COUNT(*) FROM course_chapters WHERE course_id = $1', [courseId]),
        client.query(`
          SELECT COUNT(*) FROM chapter_progress cp
          JOIN course_chapters cc ON cp.chapter_id = cc.id
          WHERE cp.enrollment_id = $1 AND cp.is_completed = true AND cc.course_id = $2
        `, [enrollment.id, courseId])
      ]);
      
      const totalCount = parseInt(totalChapters.rows[0].count);
      const completedCount = parseInt(completedChapters.rows[0].count);
      const progressPercentage = (completedCount / totalCount) * 100;
      
      // Actualizar progreso de la inscripción
      const updateData = {
        progress_percentage: progressPercentage,
        last_accessed_at: new Date(),
        status: progressPercentage === 100 ? 'completed' : 'active'
      };
      
      if (progressPercentage === 100) {
        updateData.completed_at = new Date();
      }
      
      await client.query(`
        UPDATE course_enrollments 
        SET progress_percentage = $1, last_accessed_at = $2, status = $3
        ${progressPercentage === 100 ? ', completed_at = $4' : ''}
        WHERE id = $${progressPercentage === 100 ? '5' : '4'}
      `, progressPercentage === 100 
        ? [progressPercentage, updateData.last_accessed_at, updateData.status, updateData.completed_at, enrollment.id]
        : [progressPercentage, updateData.last_accessed_at, updateData.status, enrollment.id]
      );
      
      return {
        chapter_progress: progressResult.rows[0],
        course_progress: progressPercentage,
        is_course_completed: progressPercentage === 100
      };
    });
    
  } catch (error) {
    console.error('Error al completar capítulo:', error);
    throw error;
  }
};

/**
 * Calificar un curso
 */
const rateCourse = async (userId, courseId, rating, review = null) => {
  try {
    return await transaction(async (client) => {
      // Verificar que el usuario completó el curso
      const enrollmentResult = await client.query(
        'SELECT * FROM course_enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
        [userId, courseId, 'completed']
      );
      
      if (enrollmentResult.rows.length === 0) {
        throw new Error('Debes completar el curso para calificarlo');
      }
      
      // Insertar o actualizar calificación
      const ratingResult = await client.query(`
        INSERT INTO course_ratings (user_id, course_id, rating, review, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id, course_id) 
        DO UPDATE SET rating = $3, review = $4, updated_at = NOW()
        RETURNING *
      `, [userId, courseId, rating, review]);
      
      // Calcular nuevo promedio
      const avgResult = await client.query(
        'SELECT AVG(rating) as avg_rating FROM course_ratings WHERE course_id = $1',
        [courseId]
      );
      
      const newAverage = parseFloat(avgResult.rows[0].avg_rating);
      
      // Actualizar promedio en la tabla de cursos
      await client.query(
        'UPDATE courses SET rating_average = $1 WHERE id = $2',
        [newAverage, courseId]
      );
      
      return {
        rating: ratingResult.rows[0],
        course_average: newAverage
      };
    });
    
  } catch (error) {
    console.error('Error al calificar curso:', error);
    throw error;
  }
};

/**
 * Obtener cursos del usuario
 */
const getUserCourses = async (userId, status = null) => {
  let whereClause = 'WHERE ce.user_id = $1';
  const queryParams = [userId];
  
  if (status && status !== 'all') {
    whereClause += ' AND ce.status = $2';
    queryParams.push(status);
  }
  
  const text = `
    SELECT ce.*, c.title, c.thumbnail_url, c.difficulty, c.estimated_duration_hours,
           cat.name as category_name, cat.color_hex as category_color,
           u.name as instructor_name, u.avatar_url as instructor_avatar,
           COUNT(cc.id) as total_chapters,
           COUNT(CASE WHEN cp.is_completed = true THEN 1 END) as completed_chapters
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    LEFT JOIN course_categories cat ON c.category_id = cat.id
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_chapters cc ON c.id = cc.course_id
    LEFT JOIN chapter_progress cp ON ce.id = cp.enrollment_id AND cc.id = cp.chapter_id
    ${whereClause}
    GROUP BY ce.id, c.id, cat.name, cat.color_hex, u.name, u.avatar_url
    ORDER BY ce.enrolled_at DESC
  `;
  
  try {
    const result = await query(text, queryParams);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener cursos del usuario:', error);
    throw error;
  }
};

module.exports = {
  getCourses,
  getCourseById,
  getCourseCategories,
  enrollUserToCourse,
  completeChapter,
  rateCourse,
  getUserCourses
};