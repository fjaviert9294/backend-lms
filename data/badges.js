const mockBadges = [
  { 
    id: 'badge-1', 
    name: 'Novato', 
    description: 'Completa tu primer curso', 
    icon: '🎯', 
    rarity: 'común', 
    criteria: { courses_completed: 1 }, 
    is_active: true 
  },
  { 
    id: 'badge-2', 
    name: 'Comunicador', 
    description: 'Completa cursos de comunicación', 
    icon: '💬', 
    rarity: 'raro', 
    criteria: { category: 'Comunicación', courses_completed: 2 }, 
    is_active: true 
  },
  { 
    id: 'badge-3', 
    name: 'Líder Emergente', 
    description: 'Completa 3 cursos de liderazgo', 
    icon: '👑', 
    rarity: 'épico', 
    criteria: { category: 'Liderazgo', courses_completed: 3 }, 
    is_active: true 
  },
  { 
    id: 'badge-4', 
    name: 'Experto en Seguridad', 
    description: 'Completa 5 cursos de seguridad', 
    icon: '🛡️', 
    rarity: 'legendario', 
    criteria: { category: 'Seguridad', courses_completed: 5 }, 
    is_active: true 
  },
  { 
    id: 'badge-5', 
    name: 'Maratón de Aprendizaje', 
    description: 'Completa 10 cursos en un mes', 
    icon: '🏃‍♂️', 
    rarity: 'épico', 
    criteria: { courses_in_period: 10, period_days: 30 }, 
    is_active: true 
  },
  { 
    id: 'badge-6', 
    name: 'Racha de Oro', 
    description: 'Mantén una racha de 30 días consecutivos', 
    icon: '🔥', 
    rarity: 'legendario', 
    criteria: { streak_days: 30 }, 
    is_active: true 
  },
  { 
    id: 'badge-7', 
    name: 'Completista', 
    description: 'Completa un curso con calificación perfecta', 
    icon: '⭐', 
    rarity: 'raro', 
    criteria: { perfect_score: true }, 
    is_active: true 
  }
];

const mockUserBadges = [
  {
    id: 'ub-1',
    user_id: 'user-1',
    badge_id: 'badge-1',
    earned_at: new Date('2024-07-28'),
    course_id: 'course-2'
  },
  {
    id: 'ub-2',
    user_id: 'user-1',
    badge_id: 'badge-2',
    earned_at: new Date('2024-07-28'),
    course_id: 'course-2'
  }
];

module.exports = {
  mockBadges,
  mockUserBadges
};