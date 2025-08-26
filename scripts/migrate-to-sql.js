#!/usr/bin/env node

/**
 * Script de migración del sistema mock a SQL
 * 
 * Este script ayuda a migrar de los datos mockeados a la base de datos SQL real
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Iniciando migración del sistema mock a SQL...\n');

// 1. Actualizar imports en archivos de rutas
const routeFiles = [
  'routes/courses.js',
  'routes/badges.js',
  'routes/notifications.js',
  'routes/admin.js'
];

const updateRouteImports = () => {
  console.log('📁 Actualizando imports en archivos de rutas...');
  
  routeFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Reemplazar import del mockDatabase por el database real
      const oldImport = "const mockDb = require('../data/mockDatabase');";
      const newImport = "const db = require('../database');";
      
      content = content.replace(oldImport, newImport);
      
      // Reemplazar todas las referencias a mockDb por db
      content = content.replace(/mockDb\./g, 'await db.');
      content = content.replace(/await db\.await db\./g, 'await db.');
      
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ ${file} actualizado`);
    } else {
      console.log(`  ⚠️  ${file} no encontrado`);
    }
  });
};

// 2. Crear respaldo del mockDatabase
const backupMockData = () => {
  console.log('\n💾 Creando respaldo de datos mock...');
  
  const mockDbPath = path.join(__dirname, '..', 'data', 'mockDatabase.js');
  const backupPath = path.join(__dirname, '..', 'data', 'mockDatabase.backup.js');
  
  if (fs.existsSync(mockDbPath)) {
    fs.copyFileSync(mockDbPath, backupPath);
    console.log('  ✅ Respaldo creado en data/mockDatabase.backup.js');
  } else {
    console.log('  ⚠️  mockDatabase.js no encontrado');
  }
};

// 3. Actualizar server.js para inicializar la base de datos
const updateServer = () => {
  console.log('\n🖥️  Actualizando server.js...');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  
  if (fs.existsSync(serverPath)) {
    let content = fs.readFileSync(serverPath, 'utf8');
    
    // Agregar import del database
    const dbImport = "const db = require('./database');\n";
    
    if (!content.includes("require('./database')")) {
      // Buscar donde agregar el import (después de otros requires)
      const importLocation = content.indexOf("const app = express();");
      if (importLocation !== -1) {
        content = content.slice(0, importLocation) + dbImport + content.slice(importLocation);
      }
    }
    
    // Agregar inicialización de la base de datos
    const initCode = `
// Inicializar base de datos
db.initialize()
  .then(() => {
    console.log('📊 Base de datos inicializada correctamente');
  })
  .catch((error) => {
    console.error('❌ Error al inicializar base de datos:', error);
    process.exit(1);
  });

`;
    
    if (!content.includes("db.initialize()")) {
      // Agregar después de la configuración de middleware
      const middlewareEnd = content.indexOf("// Registrar rutas");
      if (middlewareEnd !== -1) {
        content = content.slice(0, middlewareEnd) + initCode + content.slice(middlewareEnd);
      }
    }
    
    fs.writeFileSync(serverPath, content);
    console.log('  ✅ server.js actualizado');
  } else {
    console.log('  ⚠️  server.js no encontrado');
  }
};

// 4. Crear script de inicialización de base de datos
const createDbInitScript = () => {
  console.log('\n🗄️  Creando script de inicialización...');
  
  const initScript = `#!/usr/bin/env node

/**
 * Script para inicializar la base de datos
 * Ejecuta las migraciones y carga datos de ejemplo
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Leer configuración
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  console.log('🚀 Inicializando base de datos...');
  
  try {
    // 1. Ejecutar schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Schema aplicado correctamente');
    }
    
    // 2. Cargar datos de ejemplo
    const dataPath = path.join(__dirname, '..', 'database', 'sample_data.sql');
    if (fs.existsSync(dataPath)) {
      const sampleData = fs.readFileSync(dataPath, 'utf8');
      await pool.query(sampleData);
      console.log('✅ Datos de ejemplo cargados');
    }
    
    console.log('🎉 Base de datos inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
`;
  
  const scriptPath = path.join(__dirname, 'init-database.js');
  fs.writeFileSync(scriptPath, initScript);
  fs.chmodSync(scriptPath, '755');
  console.log('  ✅ Script de inicialización creado en scripts/init-database.js');
};

// 5. Actualizar package.json con nuevos scripts
const updatePackageJson = () => {
  console.log('\n📦 Actualizando package.json...');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Agregar dependencia de pg si no existe
    if (!packageJson.dependencies.pg) {
      packageJson.dependencies.pg = '^8.11.3';
    }
    
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    
    if (!packageJson.devDependencies.dotenv) {
      packageJson.devDependencies.dotenv = '^16.3.1';
    }
    
    // Agregar scripts de base de datos
    if (!packageJson.scripts['db:init']) {
      packageJson.scripts['db:init'] = 'node scripts/init-database.js';
    }
    
    if (!packageJson.scripts['db:migrate']) {
      packageJson.scripts['db:migrate'] = 'node scripts/migrate-to-sql.js';
    }
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('  ✅ package.json actualizado con dependencias y scripts');
  }
};

// 6. Generar documentación de migración
const generateMigrationDocs = () => {
  console.log('\n📋 Generando documentación de migración...');
  
  const docs = `# 🔄 Migración Mock a SQL - Guía Completa

## ✅ Pasos Completados Automáticamente

Este script ha realizado las siguientes actualizaciones:

1. **Archivos de rutas actualizados** - Cambiados imports de mockDatabase a database real
2. **server.js actualizado** - Agregada inicialización de base de datos  
3. **Respaldo creado** - mockDatabase.js respaldado como .backup.js
4. **Scripts agregados** - Nuevos comandos npm para gestión de BD
5. **Dependencias agregadas** - pg y dotenv añadidos al package.json

## 🚀 Próximos Pasos Manuales

### 1. Instalar nuevas dependencias
\`\`\`bash
npm install
\`\`\`

### 2. Configurar variables de entorno
Copiar y configurar el archivo de entorno:
\`\`\`bash
cp .env.database.example .env
\`\`\`

Editar \`.env\` con tus credenciales de base de datos.

### 3. Inicializar la base de datos
\`\`\`bash
# Para PostgreSQL local
createdb lms_corporativo

# Para aplicar schema y datos
npm run db:init
\`\`\`

### 4. Probar la migración
\`\`\`bash
npm run dev
\`\`\`

### 5. Ejecutar tests
\`\`\`bash
cd testing
node test-script.js
\`\`\`

## 🔧 Configuración de Base de Datos

### PostgreSQL Local
\`\`\`env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lms_corporativo
DB_USER=postgres
DB_PASSWORD=your_password
\`\`\`

### Supabase
\`\`\`env
DATABASE_URL=postgresql://username:password@host:port/database_name
\`\`\`

## 📊 Comparación: Mock vs SQL

| Característica | Mock | SQL |
|----------------|------|-----|
| **Persistencia** | No | ✅ Sí |
| **Concurrencia** | No | ✅ Sí |
| **Escalabilidad** | Limitada | ✅ Alta |
| **Consultas complejas** | No | ✅ Sí |
| **Transacciones** | No | ✅ Sí |
| **Backup/Restore** | No | ✅ Sí |

## 🔍 Verificar Migración

1. **Health check**: \`GET /health\` debe responder correctamente
2. **Login**: Probar con usuarios de ejemplo
3. **Cursos**: Verificar lista y detalles
4. **Inscripciones**: Probar flujo completo
5. **Insignias**: Verificar sistema de logros
6. **Admin**: Probar dashboard y estadísticas

## 🔙 Rollback (si es necesario)

Si hay problemas, puedes volver al sistema mock:

1. Restaurar archivos:
\`\`\`bash
git checkout -- routes/
git checkout -- server.js
\`\`\`

2. Restaurar mockDatabase:
\`\`\`bash
cp data/mockDatabase.backup.js data/mockDatabase.js
\`\`\`

3. Remover dependencias SQL del package.json

## 🆘 Troubleshooting

### Error: "connect ECONNREFUSED"
- Verificar que PostgreSQL esté corriendo
- Revisar credenciales en .env
- Confirmar que la base de datos existe

### Error: "relation does not exist"
- Ejecutar \`npm run db:init\` para aplicar schema
- Verificar que schema.sql esté correcto

### Error de permisos
- Verificar permisos del usuario de BD
- Para Supabase, usar SERVICE_ROLE_KEY

---

¡Migración completada! 🎉
Fecha: ${new Date().toISOString()}
`;
  
  const docsPath = path.join(__dirname, 'MIGRATION_GUIDE.md');
  fs.writeFileSync(docsPath, docs);
  console.log('  ✅ Documentación generada en scripts/MIGRATION_GUIDE.md');
};

// Ejecutar todos los pasos
const runMigration = async () => {
  try {
    // backupMockData();
    updateRouteImports();
    // updateServer();
    // createDbInitScript();
    // updatePackageJson();
    // generateMigrationDocs();
    
    console.log('\n🎉 ¡Migración completada exitosamente!');
    // console.log('\n📋 Próximos pasos:');
    // console.log('  1. npm install');
    // console.log('  2. Configurar .env con credenciales de BD');
    // console.log('  3. npm run db:init');
    // console.log('  4. npm run dev');
    // console.log('\n📖 Ver scripts/MIGRATION_GUIDE.md para detalles completos');
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
};

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };