const mockNotifications = [
  {
    id: 'not-1',
    user_id: 'user-1',
    title: 'Nuevo curso disponible: Liderazgo Digital',
    message: 'Un nuevo curso sobre liderazgo en la era digital está disponible.',
    type: 'new_course',
    priority: 'high',
    is_read: false,
    action_url: '/courses/course-1',
    metadata: { course_id: 'course-1' },
    created_at: new Date('2024-08-22T10:00:00Z')
  },
  {
    id: 'not-2',
    user_id: 'user-1',
    title: '¡Felicidades! Has ganado una nueva insignia',
    message: 'Has completado el curso de Comunicación Efectiva y ganado la insignia "Comunicador".',
    type: 'badge_earned',
    priority: 'medium',
    is_read: false,
    metadata: { badge_id: 'badge-2', course_id: 'course-2' },
    created_at: new Date('2024-08-21T15:30:00Z')
  },
  {
    id: 'not-3',
    user_id: 'user-1',
    title: 'Recordatorio: Completa tu curso',
    message: 'Te queda 1 capítulo para completar "Gestión del Tiempo".',
    type: 'reminder',
    priority: 'low',
    is_read: true,
    action_url: '/courses/course-3',
    metadata: { course_id: 'course-3' },
    read_at: new Date('2024-08-20T14:00:00Z'),
    created_at: new Date('2024-08-20T09:00:00Z')
  }
];

module.exports = {
  mockNotifications
};