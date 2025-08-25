const { query, transaction } = require('./connection');
const bcrypt = require('bcryptjs');

// ================================
// FUNCIONES DE USUARIOS
// ================================

/**
 * Buscar usuario por email
 */
const findUserByEmail = async (email) => {
  const text = `
    SELECT id, email, password, name, role, avatar_url, department, position, 
           created_at, last_login, is_active
    FROM users 
    WHERE email = $1 AND is_active = true
  `;
  
  try {
    const result = await query(text, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al buscar usuario por email:', error);
    throw error;
  }
};

/**
 * Buscar usuario por ID
 */
const findUserById = async (id) => {
  const text = `
    SELECT id, email, name, role, avatar_url, department, position, 
           created_at, last_login, is_active
    FROM users 
    WHERE id = $1
  `;
  
  try {
    const result = await query(text, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al buscar usuario por ID:', error);
    throw error;
  }
};

/**
 * Crear nuevo usuario
 */
const createUser = async (userData) => {
  const { email, password, name, role = 'student', department, position, avatar_url } = userData;
  
  const text = `
    INSERT INTO users (email, password, name, role, department, position, avatar_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, email, name, role, avatar_url, department, position, created_at, is_active
  `;
  
  try {
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await query(text, [
      email, hashedPassword, name, role, department, position, avatar_url
    ]);
    
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      throw new Error('El email ya está registrado');
    }
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

/**
 * Actualizar usuario
 */
const updateUser = async (id, updates) => {
  const allowedFields = ['name', 'department', 'position', 'avatar_url', 'last_login'];
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  // Construir query dinámicamente con solo los campos permitidos
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No hay campos válidos para actualizar');
  }
  
  // Agregar updated_at automáticamente
  fields.push(`updated_at = NOW()`);
  values.push(id);
  
  const text = `
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, email, name, role, avatar_url, department, position, 
              created_at, updated_at, is_active
  `;
  
  try {
    const result = await query(text, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }
};

/**
 * Actualizar contraseña de usuario
 */
const updateUserPassword = async (id, newPassword) => {
  const text = `
    UPDATE users 
    SET password = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id
  `;
  
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const result = await query(text, [hashedPassword, id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    throw error;
  }
};

/**
 * Obtener lista de usuarios (para admin)
 */
const getUsers = async (filters = {}) => {
  const { role, department, search, status = 'active', limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'DESC' } = filters;
  
  let whereConditions = [];
  let queryParams = [];
  let paramCount = 1;
  
  // Filtro por estado
  if (status !== 'all') {
    whereConditions.push(`is_active = $${paramCount}`);
    queryParams.push(status === 'active');
    paramCount++;
  }
  
  // Filtro por rol
  if (role && role !== 'all') {
    whereConditions.push(`role = $${paramCount}`);
    queryParams.push(role);
    paramCount++;
  }
  
  // Filtro por departamento
  if (department) {
    whereConditions.push(`department ILIKE $${paramCount}`);
    queryParams.push(`%${department}%`);
    paramCount++;
  }
  
  // Búsqueda por texto
  if (search) {
    whereConditions.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount + 1})`);
    queryParams.push(`%${search}%`, `%${search}%`);
    paramCount += 2;
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  
  // Query principal
  const text = `
    SELECT id, email, name, role, avatar_url, department, position, 
           created_at, last_login, is_active
    FROM users 
    ${whereClause}
    ${orderClause}
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;
  
  queryParams.push(limit, offset);
  
  // Query para contar total
  const countText = `
    SELECT COUNT(*) as total
    FROM users 
    ${whereClause}
  `;
  
  try {
    const [usersResult, countResult] = await Promise.all([
      query(text, queryParams),
      query(countText, queryParams.slice(0, -2)) // Excluir limit y offset del conteo
    ]);
    
    return {
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    };
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};

/**
 * Activar/Desactivar usuario
 */
const toggleUserStatus = async (id) => {
  const text = `
    UPDATE users 
    SET is_active = NOT is_active, updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, name, is_active
  `;
  
  try {
    const result = await query(text, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    throw error;
  }
};

/**
 * Cambiar rol de usuario
 */
const updateUserRole = async (id, newRole) => {
  const text = `
    UPDATE users 
    SET role = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, email, name, role
  `;
  
  try {
    const result = await query(text, [newRole, id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al cambiar rol del usuario:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas del usuario
 */
const getUserStats = async (userId) => {
  const text = `
    SELECT us.*, 
           COUNT(ce.id) as total_enrollments,
           COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completed_courses,
           COUNT(CASE WHEN ce.status = 'active' THEN 1 END) as active_courses
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    LEFT JOIN course_enrollments ce ON u.id = ce.user_id
    WHERE u.id = $1
    GROUP BY u.id, us.id, us.user_id, us.total_courses_completed, us.total_badges_earned,
             us.current_streak_days, us.longest_streak_days, us.total_time_spent_minutes,
             us.last_activity_date, us.created_at, us.updated_at
  `;
  
  try {
    const result = await query(text, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    throw error;
  }
};

/**
 * Actualizar último login
 */
const updateLastLogin = async (userId) => {
  const text = `
    UPDATE users 
    SET last_login = NOW()
    WHERE id = $1
  `;
  
  try {
    await query(text, [userId]);
  } catch (error) {
    console.error('Error al actualizar último login:', error);
    // No lanzar error porque no es crítico
  }
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  updateUserPassword,
  getUsers,
  toggleUserStatus,
  updateUserRole,
  getUserStats,
  updateLastLogin
};