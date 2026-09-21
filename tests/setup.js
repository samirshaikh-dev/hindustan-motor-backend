process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/testdb';
process.env.PORT = process.env.PORT || '5001';
process.env.ACTOR_HEADER = 'X-Employee-Id';
