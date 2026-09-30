const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Authentication API Suite', () => {
  beforeAll(async () => {
    // Force memory mode for reliable fast unit tests
    db.setMemoryMode(true);
    await db.initDb();
  });

  beforeEach(() => {
    db.resetMemoryDb();
  });

  afterAll(async () => {
    await db.closeDb();
  });

  describe('Health Check', () => {
    it('GET /api/health should return 200 and healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('finathon-auth-backend');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sathvik User',
          email: 'sathvik@finathon.org',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        name: 'Sathvik User',
        email: 'sathvik@finathon.org'
      });
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('should reject registration if email is already taken', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@finathon.org',
          password: 'SecurePassword123'
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@finathon.org',
          password: 'AnotherPassword456'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject registration if password is less than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Password',
          email: 'short@finathon.org',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });

    it('should reject registration if email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'ValidPassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid email/i);
    });

    it('should reject registration if name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'noname@finathon.org',
          password: 'ValidPassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name is required/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Seed a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Login Tester',
          email: 'tester@finathon.org',
          password: 'CorrectPassword123'
        });
    });

    it('should successfully log in with valid credentials and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tester@finathon.org',
          password: 'CorrectPassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('tester@finathon.org');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tester@finathon.org',
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@finathon.org',
          password: 'CorrectPassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tester@finathon.org'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Routes & Middleware', () => {
    let token = '';

    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Token User',
          email: 'tokenuser@finathon.org',
          password: 'SecureToken123!'
        });
      token = reg.body.token;
    });

    it('GET /api/auth/me should return user details when Bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({
        name: 'Token User',
        email: 'tokenuser@finathon.org'
      });
    });

    it('GET /api/auth/me should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no authorization header/i);
    });

    it('GET /api/auth/me should return 401 when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid authentication token/i);
    });

    it('POST /api/auth/logout should return 200 when authenticated', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
