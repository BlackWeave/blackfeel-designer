import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { db } from '../models/database.js';

vi.mock('../models/database.js');

describe('Auth Routes', () => {
  it('POST /api/auth/register should create user and return token', async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(null);
    vi.mocked(db.createUser).mockResolvedValue({ id: 'u1', email: 'new@test.com', name: 'Test', generations_used: 0, is_finalized: false });
    vi.mocked(db.getUserById).mockResolvedValue({ id: 'u1', email: 'new@test.com', name: 'Test', generations_used: 0, is_finalized: false });

    const res = await request(app).post('/api/auth/register').send({
      email: 'new@test.com', password: 'password123', name: 'Test'
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('mock.jwt.token');
    expect(res.body.user.email).toBe('new@test.com');
    expect(db.createUser).toHaveBeenCalled();
  });

  it('POST /api/auth/login should fail on wrong credentials', async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({
      email: 'wrong@test.com', password: 'wrong'
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('GET /api/auth/me should return user with valid token', async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', generations_used: 2, is_finalized: false });
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer mock.jwt.token');
    expect(res.status).toBe(200);
    expect(res.body.generationsUsed).toBe(2);
  });
});