const mockCourseEnrollments = [
  {
    id: 'enr-1',
    user_id: 'user-1',
    course_id: 'course-1',
    enrolled_at: new Date('2024-08-03'),
    progress_percentage: 37.50,
    status: 'active',
    last_accessed_at: new Date()
  },
  {
    id: 'enr-2',
    user_id: 'user-1',
    course_id: 'course-2',
    enrolled_at: new Date('2024-07-14'),
    completed_at: new Date('2024-07-28'),
    progress_percentage: 100.00,
    status: 'completed',
    last_accessed_at: new Date('2024-07-28'),
    final_grade: 95
  },
  {
    id: 'enr-3',
    user_id: 'user-1',
    course_id: 'course-3',
    enrolled_at: new Date('2024-07-24'),
    progress_percentage: 70.00,
    status: 'active',
    last_accessed_at: new Date()
  }
];

const mockChapterProgress = [
  // Progreso en curso de liderazgo (3 de 8 capítulos completados = 37.5%)
  { id: 'cp-1', user_id: 'user-1', chapter_id: 'ch-1', enrollment_id: 'enr-1', is_completed: true, completed_at: new Date('2024-08-08'), time_spent_minutes: 28 },
  { id: 'cp-2', user_id: 'user-1', chapter_id: 'ch-2', enrollment_id: 'enr-1', is_completed: true, completed_at: new Date('2024-08-10'), time_spent_minutes: 35 },
  { id: 'cp-3', user_id: 'user-1', chapter_id: 'ch-3', enrollment_id: 'enr-1', is_completed: true, completed_at: new Date('2024-08-12'), time_spent_minutes: 40 },
  { id: 'cp-4', user_id: 'user-1', chapter_id: 'ch-4', enrollment_id: 'enr-1', is_completed: false, time_spent_minutes: 15 },

  // Progreso completo en curso de comunicación
  { id: 'cp-5', user_id: 'user-1', chapter_id: 'ch-9', enrollment_id: 'enr-2', is_completed: true, completed_at: new Date('2024-07-16'), time_spent_minutes: 32 },
  { id: 'cp-6', user_id: 'user-1', chapter_id: 'ch-10', enrollment_id: 'enr-2', is_completed: true, completed_at: new Date('2024-07-18'), time_spent_minutes: 27 },
  { id: 'cp-7', user_id: 'user-1', chapter_id: 'ch-11', enrollment_id: 'enr-2', is_completed: true, completed_at: new Date('2024-07-20'), time_spent_minutes: 38 },
  { id: 'cp-8', user_id: 'user-1', chapter_id: 'ch-12', enrollment_id: 'enr-2', is_completed: true, completed_at: new Date('2024-07-24'), time_spent_minutes: 42 },
  { id: 'cp-9', user_id: 'user-1', chapter_id: 'ch-13', enrollment_id: 'enr-2', is_completed: true, completed_at: new Date('2024-07-28'), time_spent_minutes: 33 }
];

const mockUserStats = [
  {
    id: 'us-1',
    user_id: 'user-1',
    total_courses_completed: 1,
    total_badges_earned: 2,
    current_streak_days: 15,
    longest_streak_days: 20,
    total_time_spent_minutes: 275,
    last_activity_date: new Date(),
    created_at: new Date('2024-07-14'),
    updated_at: new Date()
  }
];

const mockCourseRatings = [
  {
    id: 'cr-1',
    user_id: 'user-1',
    course_id: 'course-2',
    rating: 5,
    review: 'Excelente curso, muy práctico y con ejemplos reales.',
    created_at: new Date('2024-07-28'),
    updated_at: new Date('2024-07-28')
  }
];

module.exports = {
  mockCourseEnrollments,
  mockChapterProgress,
  mockUserStats,
  mockCourseRatings
};