const bcrypt = require('bcryptjs');

const createMockUsers = async () => {
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  return [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'estudiante@bancodebogota.com.co',
      password: hashedPassword,
      name: 'María González',
      role: 'student',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b332c8de?w=100&h=100&fit=crop&crop=face',
      department: 'Tecnología',
      position: 'Desarrollador Se',
      created_at: new Date('2024-01-01'),
      last_login: new Date(),
      is_active: true
    },
    {
      id: 'user-2',
      email: 'admin@bancodebogota.com.co',
      password: hashedPassword,
      name: 'Carlos Ramírez',
      role: 'admin',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      department: 'Recursos Humanos',
      position: 'Director de Capacitación',
      created_at: new Date('2024-01-01'),
      last_login: new Date(),
      is_active: true
    },
    {
      id: 'user-3',
      email: 'ana.martinez@bancodebogota.com.co',
      password: hashedPassword,
      name: 'Dr. Ana Martínez',
      role: 'instructor',
      avatar_url: null,
      department: 'Consultoría',
      position: 'Consultora Senior',
      created_at: new Date('2024-01-01'),
      last_login: new Date(),
      is_active: true
    }
  ];
};

module.exports = { createMockUsers };