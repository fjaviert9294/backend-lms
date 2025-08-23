const { createMockUsers } = require('./users');
const { mockCourseCategories, mockCourses, mockCourseChapters } = require('./courses');
const { mockBadges, mockUserBadges } = require('./badges');
const { mockCourseEnrollments, mockChapterProgress, mockUserStats, mockCourseRatings } = require('./enrollments');
const { mockNotifications } = require('./notifications');

// Simular base de datos en memoria
class MockDatabase {
  constructor() {
    this.users = [];
    this.courses = [];
    this.courseCategories = [];
    this.courseChapters = [];
    this.courseEnrollments = [];
    this.chapterProgress = [];
    this.badges = [];
    this.userBadges = [];
    this.notifications = [];
    this.userStats = [];
    this.courseRatings = [];
    this.mediaFiles = [];
    
    this.initializeData();
  }

  async initializeData() {
    this.courseCategories = mockCourseCategories;
    this.courses = mockCourses;
    this.courseChapters = mockCourseChapters;
    this.badges = mockBadges;
    this.userBadges = mockUserBadges;
    this.courseEnrollments = mockCourseEnrollments;
    this.chapterProgress = mockChapterProgress;
    this.userStats = mockUserStats;
    this.notifications = mockNotifications;
    this.courseRatings = mockCourseRatings;
    
    // Crear usuarios con contraseñas hasheadas
    this.users = await createMockUsers();
  }

  // Métodos de búsqueda
  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  findUserById(id) {
    return this.users.find(user => user.id === id);
  }

  getCourseById(courseId) {
    return this.courses.find(course => course.id === courseId);
  }

  getCourseChapters(courseId) {
    return this.courseChapters
      .filter(chapter => chapter.course_id === courseId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  getUserCourses(userId) {
    return this.courseEnrollments.filter(enrollment => enrollment.user_id === userId);
  }

  getUserBadges(userId) {
    const userBadgeIds = this.userBadges
      .filter(ub => ub.user_id === userId)
      .map(ub => ub.badge_id);
    
    return this.badges.filter(badge => userBadgeIds.includes(badge.id));
  }

  getUserNotifications(userId) {
    return this.notifications
      .filter(notification => notification.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getUserStats(userId) {
    return this.userStats.find(stats => stats.user_id === userId);
  }

  getChapterProgress(userId, courseId) {
    const enrollment = this.courseEnrollments.find(e => 
      e.user_id === userId && e.course_id === courseId
    );
    
    if (!enrollment) return [];
    return this.chapterProgress.filter(cp => cp.enrollment_id === enrollment.id);
  }

  // Métodos de modificación
  addUser(userData) {
    const newUser = {
      id: `user-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
      ...userData
    };
    this.users.push(newUser);
    return newUser;
  }

  updateUser(userId, updates) {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex] = {
        ...this.users[userIndex],
        ...updates,
        updated_at: new Date()
      };
      return this.users[userIndex];
    }
    return null;
  }

  addCourseEnrollment(userId, courseId) {
    const enrollment = {
      id: `enr-${Date.now()}`,
      user_id: userId,
      course_id: courseId,
      enrolled_at: new Date(),
      progress_percentage: 0,
      status: 'active',
      last_accessed_at: new Date()
    };
    this.courseEnrollments.push(enrollment);
    return enrollment;
  }

  updateChapterProgress(userId, chapterId, isCompleted) {
    const progressIndex = this.chapterProgress.findIndex(cp => 
      cp.user_id === userId && cp.chapter_id === chapterId
    );
    
    if (progressIndex !== -1) {
      this.chapterProgress[progressIndex] = {
        ...this.chapterProgress[progressIndex],
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null,
        updated_at: new Date()
      };
      return this.chapterProgress[progressIndex];
    }
    return null;
  }

  markNotificationAsRead(notificationId) {
    const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
    if (notificationIndex !== -1) {
      this.notifications[notificationIndex] = {
        ...this.notifications[notificationIndex],
        is_read: true,
        read_at: new Date()
      };
      return this.notifications[notificationIndex];
    }
    return null;
  }
}

// Exportar singleton de la base de datos mockeada
module.exports = new MockDatabase();