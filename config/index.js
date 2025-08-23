const JWT_SECRET = process.env.JWT_SECRET || 'lms-corporativo-secret-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const CORS_OPTIONS = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
};

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const PAGINATION_DEFAULTS = {
  limit: 20,
  maxLimit: 100
};

const FILE_UPLOAD = {
  maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 50,
  allowedTypes: ['pdf', 'docx', 'pptx', 'mp4', 'webm']
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  PORT,
  NODE_ENV,
  CORS_OPTIONS,
  BCRYPT_ROUNDS,
  PAGINATION_DEFAULTS,
  FILE_UPLOAD
};