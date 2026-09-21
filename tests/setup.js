process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/testdb';
process.env.PORT = process.env.PORT || '5001';
process.env.ACTOR_HEADER = 'X-Employee-Id';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'test-secret-password-123';
process.env.JWT_SECRET = 'test-super-secret-jwt-key-minimum-16-chars';

