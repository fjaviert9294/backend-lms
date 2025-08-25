-- ==============================================
-- TABLA DE USUARIOS
-- ==============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'instructor')),
    avatar_url TEXT,
    department VARCHAR(100),
    position VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- ==============================================
-- TABLA DE CATEGORÍAS DE CURSOS
-- ==============================================
CREATE TABLE course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_hex VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- TABLA DE CURSOS
-- ==============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID REFERENCES users(id),
    category_id UUID REFERENCES course_categories(id),
    difficulty VARCHAR(20) DEFAULT 'Básico' CHECK (difficulty IN ('Básico', 'Intermedio', 'Avanzado')),
    estimated_duration_hours DECIMAL(4,2),
    thumbnail_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[], -- Array de tags para búsqueda
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    total_enrollments INTEGER DEFAULT 0
);

-- ==============================================
-- TABLA DE CAPÍTULOS DE CURSOS
-- ==============================================
CREATE TABLE course_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('video', 'document', 'quiz', 'interactive')),
    content_url TEXT, -- URL del contenido (video, PDF, etc.)
    estimated_duration_minutes INTEGER,
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, order_index)
);

-- ==============================================
-- TABLA DE INSCRIPCIONES A CURSOS
-- ==============================================
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    final_grade DECIMAL(5,2),
    UNIQUE(user_id, course_id)
);

-- ==============================================
-- TABLA DE PROGRESO DE CAPÍTULOS
-- ==============================================
CREATE TABLE chapter_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chapter_id)
);

-- ==============================================
-- TABLA DE INSIGNIAS
-- ==============================================
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10), -- Emoji o identificador de icono
    rarity VARCHAR(20) DEFAULT 'común' CHECK (rarity IN ('común', 'raro', 'épico', 'legendario')),
    criteria JSONB, -- Criterios para obtener la insignia (JSON)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- TABLA DE INSIGNIAS OTORGADAS A USUARIOS
-- ==============================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    awarded_by UUID REFERENCES users(id), -- Puede ser automático (NULL) o manual
    course_id UUID REFERENCES courses(id), -- Si la insignia se obtuvo por completar un curso específico
    UNIQUE(user_id, badge_id)
);

-- ==============================================
-- TABLA DE NOTIFICACIONES
-- ==============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(30) NOT NULL CHECK (type IN ('new_course', 'badge_earned', 'reminder', 'content_update', 'achievement', 'event')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- URL para redireccionar cuando se hace clic
    metadata JSONB, -- Datos adicionales específicos del tipo de notificación
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- TABLA DE ARCHIVOS MULTIMEDIA
-- ==============================================
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    chapter_id UUID REFERENCES course_chapters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- TABLA DE EVALUACIONES/CALIFICACIONES
-- ==============================================
CREATE TABLE course_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- ==============================================
-- TABLA DE ESTADÍSTICAS DE USUARIO
-- ==============================================
CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_courses_completed INTEGER DEFAULT 0,
    total_badges_earned INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    total_time_spent_minutes INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- TABLA DE METAS DE APRENDIZAJE
-- ==============================================
CREATE TABLE learning_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('monthly_courses', 'badge_target', 'time_target')),
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ==============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_course_chapters_course ON course_chapters(course_id);
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_status ON course_enrollments(status);
CREATE INDEX idx_chapter_progress_user ON chapter_progress(user_id);
CREATE INDEX idx_chapter_progress_chapter ON chapter_progress(chapter_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ==============================================
-- FUNCIONES PARA ACTUALIZAR TIMESTAMPS
-- ==============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_chapters_updated_at BEFORE UPDATE ON course_chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapter_progress_updated_at BEFORE UPDATE ON chapter_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_ratings_updated_at BEFORE UPDATE ON course_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_goals_updated_at BEFORE UPDATE ON learning_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- FUNCIÓN PARA ACTUALIZAR PROGRESO DEL CURSO
-- ==============================================
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_chapters INTEGER;
    completed_chapters INTEGER;
    progress_percent DECIMAL(5,2);
    enrollment_record RECORD;
BEGIN
    -- Obtener información de la inscripción
    SELECT ce.* INTO enrollment_record
    FROM course_enrollments ce
    JOIN course_chapters cc ON cc.course_id = ce.course_id
    WHERE ce.user_id = NEW.user_id AND cc.id = NEW.chapter_id;
    
    IF enrollment_record IS NOT NULL THEN
        -- Contar capítulos totales y completados
        SELECT COUNT(*) INTO total_chapters
        FROM course_chapters
        WHERE course_id = enrollment_record.course_id AND is_required = true;
        
        SELECT COUNT(*) INTO completed_chapters
        FROM chapter_progress cp
        JOIN course_chapters cc ON cc.id = cp.chapter_id
        WHERE cp.user_id = NEW.user_id 
        AND cc.course_id = enrollment_record.course_id 
        AND cp.is_completed = true
        AND cc.is_required = true;
        
        -- Calcular porcentaje de progreso
        progress_percent = (completed_chapters::DECIMAL / total_chapters::DECIMAL) * 100;
        
        -- Actualizar progreso en course_enrollments
        UPDATE course_enrollments
        SET progress_percentage = progress_percent,
            completed_at = CASE WHEN progress_percent = 100 THEN NOW() ELSE completed_at END,
            status = CASE WHEN progress_percent = 100 THEN 'completed' ELSE status END,
            last_accessed_at = NOW()
        WHERE id = enrollment_record.id;
        
        -- Actualizar estadísticas del usuario si completó el curso
        IF progress_percent = 100 THEN
            INSERT INTO user_stats (user_id, total_courses_completed, last_activity_date, updated_at)
            VALUES (NEW.user_id, 1, CURRENT_DATE, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                total_courses_completed = user_stats.total_courses_completed + 1,
                last_activity_date = CURRENT_DATE,
                updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_progress
    AFTER UPDATE OF is_completed ON chapter_progress
    FOR EACH ROW
    WHEN (NEW.is_completed = true AND OLD.is_completed = false)
    EXECUTE FUNCTION update_course_progress();

-- ==============================================
-- DATOS INICIALES (SEEDS)
-- ==============================================

-- Insertar categorías de cursos
INSERT INTO course_categories (name, description, color_hex) VALUES
('Liderazgo', 'Cursos enfocados en desarrollo de habilidades de liderazgo', '#3B82F6'),
('Comunicación', 'Mejora tus habilidades de comunicación interpersonal', '#10B981'),
('Productividad', 'Técnicas y herramientas para aumentar la productividad', '#F59E0B'),
('Seguridad', 'Seguridad digital y ciberseguridad empresarial', '#EF4444'),
('Innovación', 'Desarrollo del pensamiento creativo e innovador', '#8B5CF6');

-- Insertar insignias predefinidas
INSERT INTO badges (name, description, icon, rarity, criteria) VALUES
('Novato', 'Completa tu primer curso', '🎯', 'común', '{"courses_completed": 1}'),
('Comunicador', 'Completa cursos de comunicación', '💬', 'raro', '{"category": "Comunicación", "courses_completed": 2}'),
('Líder Emergente', 'Completa 3 cursos de liderazgo', '👑', 'épico', '{"category": "Liderazgo", "courses_completed": 3}'),
('Experto en Seguridad', 'Completa 5 cursos de seguridad', '🛡️', 'legendario', '{"category": "Seguridad", "courses_completed": 5}'),
('Maratón de Aprendizaje', 'Completa 10 cursos en un mes', '🏃‍♂️', 'épico', '{"courses_in_period": 10, "period_days": 30}'),
('Racha de Oro', 'Mantén una racha de 30 días consecutivos', '🔥', 'legendario', '{"streak_days": 30}'),
('Completista', 'Completa un curso con calificación perfecta', '⭐', 'raro', '{"perfect_score": true}');