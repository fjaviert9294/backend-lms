const { testConnection } = require('./connection');
const userFunctions = require('./users');
const courseFunctions = require('./courses');
const badgeFunctions = require('./badges');
const notificationFunctions = require('./notifications');
const adminFunctions = require('./admin');

// ================================
// CLASE PRINCIPAL DE BASE DE DATOS
// ================================

class Database {
  constructor() {
    this.users = userFunctions;
    this.courses = courseFunctions;
    this.badges = badgeFunctions;
    this.notifications = notificationFunctions;
    this.admin = adminFunctions;
  }

  // Inicializar conexión y verificar estado
  async initialize() {
    console.log('🔄 Inicializando conexión a la base de datos...');
    
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('No se pudo establecer conexión con la base de datos');
    }
    
    console.log('✅ Base de datos inicializada correctamente');
    return true;
  }

  // ================================
  // MÉTODOS DE COMPATIBILIDAD (para reemplazar mockDatabase)
  // ================================

  /**
   * Buscar usuario por email (compatibilidad con mockDatabase)
   */
  async findUserByEmail(email) {
    return await this.users.findUserByEmail(email);
  }

  /**
   * Buscar usuario por ID (compatibilidad con mockDatabase)
   */
  async findUserById(id) {
    return await this.users.findUserById(id);
  }

  /**
   * Obtener curso por ID (compatibilidad con mockDatabase)
   */
  async getCourseById(courseId, userId = null) {
    return await this.courses.getCourseById(courseId, userId);
  }

  /**
   * Obtener capítulos de un curso (compatibilidad con mockDatabase)
   */
  async getCourseChapters(courseId) {
    const course = await this.courses.getCourseById(courseId);
    return course ? course.chapters || [] : [];
  }

  /**
   * Obtener cursos del usuario (compatibilidad con mockDatabase)
   */
  async getUserCourses(userId, status = null) {
    return await this.courses.getUserCourses(userId, status);
  }

  /**
   * Obtener insignias del usuario (compatibilidad con mockDatabase)
   */
  async getUserBadges(userId) {
    return await this.badges.getUserBadges(userId);
  }

  /**
   * Obtener notificaciones del usuario (compatibilidad con mockDatabase)
   */
  async getUserNotifications(userId, filters = {}) {
    const result = await this.notifications.getUserNotifications(userId, filters);
    return result.notifications || [];
  }

  /**
   * Obtener estadísticas del usuario (compatibilidad con mockDatabase)
   */
  async getUserStats(userId) {
    return await this.users.getUserStats(userId);
  }

  /**
   * Obtener progreso de capítulos (compatibilidad con mockDatabase)
   */
  async getChapterProgress(userId, courseId) {
    const course = await this.courses.getCourseById(courseId, userId);
    if (!course || !course.chapters) return [];
    
    return course.chapters
      .filter(chapter => chapter.is_completed !== undefined)
      .map(chapter => ({
        id: `cp-${chapter.id}-${userId}`,
        user_id: userId,
        chapter_id: chapter.id,
        enrollment_id: course.enrollment?.id,
        is_completed: chapter.is_completed,
        completed_at: chapter.completed_at,
        time_spent_minutes: chapter.time_spent_minutes || 0
      }));
  }

  /**
   * Crear usuario (compatibilidad con mockDatabase)
   */
  async addUser(userData) {
    return await this.users.createUser(userData);
  }

  /**
   * Actualizar usuario (compatibilidad con mockDatabase)
   */
  async updateUser(userId, updates) {
    return await this.users.updateUser(userId, updates);
  }

  /**
   * Crear inscripción a curso (compatibilidad con mockDatabase)
   */
  async addCourseEnrollment(userId, courseId) {
    return await this.courses.enrollUserToCourse(userId, courseId);
  }

  /**
   * Actualizar progreso de capítulo (compatibilidad con mockDatabase)
   */
  async updateChapterProgress(userId, chapterId, isCompleted) {
    // Necesitamos encontrar el courseId para este capítulo
    const chapterResult = await require('./connection').query(
      'SELECT course_id FROM course_chapters WHERE id = $1',
      [chapterId]
    );
    
    if (chapterResult.rows.length === 0) {
      throw new Error('Capítulo no encontrado');
    }
    
    const courseId = chapterResult.rows[0].course_id;
    
    if (isCompleted) {
      const result = await this.courses.completeChapter(userId, courseId, chapterId);
      return result.chapter_progress;
    }
    
    return null;
  }

  /**
   * Marcar notificación como leída (compatibilidad con mockDatabase)
   */
  async markNotificationAsRead(notificationId, userId = null) {
    if (!userId) {
      // Si no se proporciona userId, intentar extraerlo de la notificación
      const notif = await require('./connection').query(
        'SELECT user_id FROM notifications WHERE id = $1',
        [notificationId]
      );
      
      if (notif.rows.length === 0) return null;
      userId = notif.rows[0].user_id;
    }
    
    return await this.notifications.markNotificationAsRead(notificationId, userId);
  }

  // ================================
  // MÉTODOS ADICIONALES PARA FUNCIONALIDADES AVANZADAS
  // ================================

  /**
   * Verificar logros automáticos
   */
  async checkUserAchievements(userId) {
    return await this.badges.checkAchievements(userId);
  }

  /**
   * Crear notificación
   */
  async createNotification(notificationData) {
    return await this.notifications.createNotification(notificationData);
  }

  /**
   * Obtener estadísticas del dashboard admin
   */
  async getAdminDashboard() {
    const [stats, popularCourses, recentActivity] = await Promise.all([
      this.admin.getDashboardStats(),
      this.admin.getPopularCourses(),
      this.admin.getRecentActivity()
    ]);
    
    return {
      ...stats,
      popular_courses: popularCourses,
      recent_activity: recentActivity
    };
  }

  /**
   * Obtener todos los cursos con filtros
   */
  async getAllCourses(filters = {}) {
    return await this.courses.getCourses(filters);
  }

  /**
   * Obtener todas las categorías de cursos
   */
  async getCourseCategories() {
    return await this.courses.getCourseCategories();
  }

  /**
   * Calificar curso
   */
  async rateCourse(userId, courseId, rating, review = null) {
    return await this.courses.rateCourse(userId, courseId, rating, review);
  }

  /**
   * Otorgar insignia
   */
  async awardBadge(userId, badgeId, courseId = null, awardedBy = null) {
    return await this.badges.awardBadge(userId, badgeId, courseId, awardedBy);
  }

  /**
   * Enviar notificación masiva
   */
  async broadcastNotification(userIds, notificationData) {
    return await this.notifications.broadcastNotification(userIds, notificationData);
  }
}

// Crear y exportar instancia singleton
const database = new Database();

module.exports = database;