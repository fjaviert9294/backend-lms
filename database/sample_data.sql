-- DATOS DE EJEMPLO PARA EL SISTEMA LMS
-- Estos datos coinciden con los mockups que hemos estado usando

-- Insertar usuarios de ejemplo
INSERT INTO users (id, email, name, role, department, position, avatar_url) VALUES
('00000000-0000-0000-0000-000000000001', 'estudiante@bancodebogota.com.co', 'María González', 'student', 'Tecnología', 'Desarrollador Senior', 'https://images.unsplash.com/photo-1494790108755-2616b332c8de?w=100&h=100&fit=crop&crop=face'),
('00000000-0000-0000-0000-000000000002', 'admin@bancodebogota.com.co', 'Carlos Ramírez', 'admin', 'Recursos Humanos', 'Director de Capacitación', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'),
('00000000-0000-0000-0000-000000000003', 'ana.martinez@bancodebogota.com.co', 'Dr. Ana Martínez', 'instructor', 'Consultoría', 'Consultora Senior', NULL),
('00000000-0000-0000-0000-000000000004', 'carlos.rodriguez@bancodebogota.com.co', 'Lic. Carlos Rodríguez', 'instructor', 'Comunicaciones', 'Especialista en Comunicación', NULL);

-- Insertar cursos de ejemplo
INSERT INTO courses (id, title, description, instructor_id, category_id, difficulty, estimated_duration_hours, thumbnail_url, status, published_at) VALUES
('10000000-0000-0000-0000-000000000001', 
 'Fundamentos de Liderazgo Digital', 
 'Aprende los principios básicos del liderazgo en la era digital. Este curso te proporcionará las herramientas necesarias para liderar equipos efectivamente en entornos digitales.',
 '00000000-0000-0000-0000-000000000003',
 (SELECT id FROM course_categories WHERE name = 'Liderazgo'),
 'Intermedio',
 4.0,
 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop',
 'published',
 NOW() - INTERVAL '30 days'),

('10000000-0000-0000-0000-000000000002',
 'Comunicación Efectiva en Equipos',
 'Mejora tus habilidades de comunicación para trabajar en equipo de manera más efectiva y productiva.',
 '00000000-0000-0000-0000-000000000004',
 (SELECT id FROM course_categories WHERE name = 'Comunicación'),
 'Básico',
 3.5,
 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=300&fit=crop',
 'published',
 NOW() - INTERVAL '45 days'),

('10000000-0000-0000-0000-000000000003',
 'Gestión del Tiempo y Productividad',
 'Técnicas avanzadas para optimizar tu tiempo y aumentar la productividad personal y profesional.',
 '00000000-0000-0000-0000-000000000003',
 (SELECT id FROM course_categories WHERE name = 'Productividad'),
 'Intermedio',
 5.0,
 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=300&fit=crop',
 'published',
 NOW() - INTERVAL '60 days');

-- Insertar capítulos para el curso de Liderazgo Digital
INSERT INTO course_chapters (course_id, title, description, content_type, estimated_duration_minutes, order_index) VALUES
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Introducción al Liderazgo Digital', 'Conceptos básicos y evolución del liderazgo', 'video', 25, 1),
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Características del Líder Digital', 'Competencias clave para el liderazgo moderno', 'video', 30, 2),
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Herramientas de Comunicación Digital', 'Plataformas y técnicas de comunicación efectiva', 'video', 35, 3),
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Gestión de Equipos Remotos', 'Estrategias para liderar equipos distribuidos', 'video', 40, 4),
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Toma de Decisiones en Entornos Digitales', 'Metodologías para decisiones efectivas', 'document', 30, 5),
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Evaluación: Caso Práctico', 'Aplicación práctica de conceptos aprendidos', 'quiz', 45, 6),
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Tendencias en Liderazgo Digital', 'Futuro del liderazgo en la era digital', 'video', 25, 7),
((SELECT id FROM courses WHERE title = 'Fundamentos de Liderazgo Digital'), 'Plan de Desarrollo Personal', 'Creación de tu hoja de ruta de liderazgo', 'document', 30, 8);

-- Insertar inscripciones de ejemplo
INSERT INTO course_enrollments (user_id, course_id, progress_percentage, status, enrolled_at) VALUES
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 37.50, 'active', NOW() - INTERVAL '20 days'),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 100.00, 'completed', NOW() - INTERVAL '40 days'),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 70.00, 'active', NOW() - INTERVAL '30 days');

-- Insertar progreso de capítulos (para el curso de Liderazgo Digital)
INSERT INTO chapter_progress (user_id, chapter_id, enrollment_id, is_completed, completed_at, time_spent_minutes) 
SELECT 
    '00000000-0000-0000-0000-000000000001',
    cc.id,
    ce.id,
    CASE WHEN cc.order_index <= 3 THEN true ELSE false END,
    CASE WHEN cc.order_index <= 3 THEN NOW() - INTERVAL '15 days' + (cc.order_index || ' days')::INTERVAL ELSE NULL END,
    cc.estimated_duration_minutes
FROM course_chapters cc
JOIN course_enrollments ce ON ce.course_id = cc.course_id
WHERE ce.user_id = '00000000-0000-0000-0000-000000000001' 
AND cc.course_id = '10000000-0000-0000-0000-000000000001';

-- Insertar insignias otorgadas
INSERT INTO user_badges (user_id, badge_id, earned_at, course_id) VALUES
('00000000-0000-0000-0000-000000000001', (SELECT id FROM badges WHERE name = 'Novato'), NOW() - INTERVAL '40 days', '10000000-0000-0000-0000-000000000002'),
('00000000-0000-0000-0000-000000000001', (SELECT id FROM badges WHERE name = 'Comunicador'), NOW() - INTERVAL '35 days', '10000000-0000-0000-0000-000000000002');

-- Insertar estadísticas del usuario
INSERT INTO user_stats (user_id, total_courses_completed, total_badges_earned, current_streak_days, total_time_spent_minutes, last_activity_date) VALUES
('00000000-0000-0000-0000-000000000001', 1, 2, 15, 420, CURRENT_DATE);

-- Insertar notificaciones de ejemplo
INSERT INTO notifications (user_id, title, message, type, priority, is_read, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'Nuevo curso disponible: Liderazgo Digital', 'Un nuevo curso sobre liderazgo en la era digital está disponible.', 'new_course', 'high', false, NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000001', '¡Felicidades! Has ganado una nueva insignia', 'Has completado el curso de Comunicación Efectiva y ganado la insignia "Comunicador".', 'badge_earned', 'medium', false, NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000001', 'Recordatorio: Completa tu curso', 'Te queda 1 capítulo para completar "Gestión del Tiempo".', 'reminder', 'low', true, NOW() - INTERVAL '3 days');

-- Insertar calificaciones de cursos
INSERT INTO course_ratings (user_id, course_id, rating, review) VALUES
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 5, 'Excelente curso, muy práctico y con ejemplos reales.');

-- Actualizar promedios de calificación en cursos
UPDATE courses SET 
    rating_average = (SELECT AVG(rating) FROM course_ratings WHERE course_id = courses.id),
    total_enrollments = (SELECT COUNT(*) FROM course_enrollments WHERE course_id = courses.id);