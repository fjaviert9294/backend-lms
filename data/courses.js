const mockCourseCategories = [
  {
    id: 'cat-1',
    name: 'Liderazgo',
    description: 'Cursos enfocados en desarrollo de habilidades de liderazgo',
    color_hex: '#3B82F6',
    created_at: new Date('2024-01-01')
  },
  {
    id: 'cat-2',
    name: 'Comunicación',
    description: 'Mejora tus habilidades de comunicación interpersonal',
    color_hex: '#10B981',
    created_at: new Date('2024-01-01')
  },
  {
    id: 'cat-3',
    name: 'Productividad',
    description: 'Técnicas y herramientas para aumentar la productividad',
    color_hex: '#F59E0B',
    created_at: new Date('2024-01-01')
  },
  {
    id: 'cat-4',
    name: 'Seguridad',
    description: 'Seguridad digital y ciberseguridad empresarial',
    color_hex: '#EF4444',
    created_at: new Date('2024-01-01')
  },
  {
    id: 'cat-5',
    name: 'Innovación',
    description: 'Desarrollo del pensamiento creativo e innovador',
    color_hex: '#8B5CF6',
    created_at: new Date('2024-01-01')
  }
];

const mockCourses = [
  {
    id: 'course-1',
    title: 'Fundamentos de Liderazgo Digital',
    description: 'Aprende los principios básicos del liderazgo en la era digital. Este curso te proporcionará las herramientas necesarias para liderar equipos efectivamente en entornos digitales.',
    instructor_id: 'user-3',
    category_id: 'cat-1',
    difficulty: 'Intermedio',
    estimated_duration_hours: 4.0,
    thumbnail_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop',
    status: 'published',
    created_at: new Date('2024-07-01'),
    published_at: new Date('2024-07-24'),
    tags: ['liderazgo', 'digital', 'equipos'],
    rating_average: 4.8,
    total_enrollments: 3
  },
  {
    id: 'course-2',
    title: 'Comunicación Efectiva en Equipos',
    description: 'Mejora tus habilidades de comunicación para trabajar en equipo de manera más efectiva y productiva.',
    instructor_id: 'user-3',
    category_id: 'cat-2',
    difficulty: 'Básico',
    estimated_duration_hours: 3.5,
    thumbnail_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=300&fit=crop',
    status: 'published',
    created_at: new Date('2024-06-01'),
    published_at: new Date('2024-07-09'),
    tags: ['comunicación', 'equipos', 'colaboración'],
    rating_average: 4.9,
    total_enrollments: 2
  },
  {
    id: 'course-3',
    title: 'Gestión del Tiempo y Productividad',
    description: 'Técnicas avanzadas para optimizar tu tiempo y aumentar la productividad personal y profesional.',
    instructor_id: 'user-3',
    category_id: 'cat-3',
    difficulty: 'Intermedio',
    estimated_duration_hours: 5.0,
    thumbnail_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=300&fit=crop',
    status: 'published',
    created_at: new Date('2024-06-15'),
    published_at: new Date('2024-06-24'),
    tags: ['productividad', 'tiempo', 'organización'],
    rating_average: 4.7,
    total_enrollments: 1
  },
  {
    id: 'course-4',
    title: 'Ciberseguridad para Empresas',
    description: 'Fundamentos de seguridad digital y mejores prácticas para proteger la información empresarial.',
    instructor_id: 'user-3',
    category_id: 'cat-4',
    difficulty: 'Avanzado',
    estimated_duration_hours: 6.0,
    thumbnail_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=300&fit=crop',
    status: 'published',
    created_at: new Date('2024-07-15'),
    published_at: new Date('2024-08-01'),
    tags: ['seguridad', 'ciberseguridad', 'empresas'],
    rating_average: 0,
    total_enrollments: 0
  }
];

const mockCourseChapters = [
  // Capítulos para Fundamentos de Liderazgo Digital
  { id: 'ch-1', course_id: 'course-1', title: 'Introducción al Liderazgo Digital', description: 'Conceptos básicos y evolución del liderazgo', content_type: 'video', estimated_duration_minutes: 25, order_index: 1 },
  { id: 'ch-2', course_id: 'course-1', title: 'Características del Líder Digital', description: 'Competencias clave para el liderazgo moderno', content_type: 'video', estimated_duration_minutes: 30, order_index: 2 },
  { id: 'ch-3', course_id: 'course-1', title: 'Herramientas de Comunicación Digital', description: 'Plataformas y técnicas de comunicación efectiva', content_type: 'video', estimated_duration_minutes: 35, order_index: 3 },
  { id: 'ch-4', course_id: 'course-1', title: 'Gestión de Equipos Remotos', description: 'Estrategias para liderar equipos distribuidos', content_type: 'video', estimated_duration_minutes: 40, order_index: 4 },
  { id: 'ch-5', course_id: 'course-1', title: 'Toma de Decisiones en Entornos Digitales', description: 'Metodologías para decisiones efectivas', content_type: 'document', estimated_duration_minutes: 30, order_index: 5 },
  { id: 'ch-6', course_id: 'course-1', title: 'Evaluación: Caso Práctico', description: 'Aplicación práctica de conceptos aprendidos', content_type: 'quiz', estimated_duration_minutes: 45, order_index: 6 },
  { id: 'ch-7', course_id: 'course-1', title: 'Tendencias en Liderazgo Digital', description: 'Futuro del liderazgo en la era digital', content_type: 'video', estimated_duration_minutes: 25, order_index: 7 },
  { id: 'ch-8', course_id: 'course-1', title: 'Plan de Desarrollo Personal', description: 'Creación de tu hoja de ruta de liderazgo', content_type: 'document', estimated_duration_minutes: 30, order_index: 8 },
  
  // Capítulos para Comunicación Efectiva
  { id: 'ch-9', course_id: 'course-2', title: 'Fundamentos de la Comunicación', description: 'Principios básicos de comunicación efectiva', content_type: 'video', estimated_duration_minutes: 30, order_index: 1 },
  { id: 'ch-10', course_id: 'course-2', title: 'Escucha Activa', description: 'Técnicas para mejorar la escucha', content_type: 'video', estimated_duration_minutes: 25, order_index: 2 },
  { id: 'ch-11', course_id: 'course-2', title: 'Comunicación No Verbal', description: 'Lenguaje corporal y expresión', content_type: 'video', estimated_duration_minutes: 35, order_index: 3 },
  { id: 'ch-12', course_id: 'course-2', title: 'Resolución de Conflictos', description: 'Manejo de situaciones difíciles', content_type: 'video', estimated_duration_minutes: 40, order_index: 4 },
  { id: 'ch-13', course_id: 'course-2', title: 'Presentaciones Efectivas', description: 'Técnicas para presentar con impacto', content_type: 'video', estimated_duration_minutes: 30, order_index: 5 }
];

module.exports = {
  mockCourseCategories,
  mockCourses,
  mockCourseChapters
};