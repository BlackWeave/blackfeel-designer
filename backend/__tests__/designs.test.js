import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { db } from '../models/database.js';

vi.mock('../models/database.js');
import { vertexAiService } from '../services/vertexAi.js';
import { removeBgService } from '../services/removeBg.js';
import { imageStorage } from '../services/imageStorage.js';

describe('Design Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/designs/generate should create design and decrement limit', async () => {
    vi.mocked(db.getUserById).mockResolvedValueOnce({ id: 'user-1', generations_used: 2 });
    vi.mocked(db.getUserById).mockResolvedValueOnce({ id: 'user-1', generations_used: 3 });
    vi.mocked(db.createDesign).mockResolvedValue({ id: 'd1', prompt: 'test', processed_image_url: 'https://cdn.test.local/designs/mock.webp', tshirt_color: '#1a1a1a' });
    vi.mocked(db.updateUserGenerationCount).mockResolvedValue({ generations_used: 3 });

    const res = await request(app).post('/api/designs/generate')
      .set('Authorization', 'Bearer mock.jwt.token')
      .send({ prompt: 'A cool cat', tshirtColor: '#1a1a1a' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.generationsLeft).toBe(2);
    expect(vertexAiService.generateImage).toHaveBeenCalledWith('A cool cat');
    expect(removeBgService.process).toHaveBeenCalled();
    expect(imageStorage.uploadBase64).toHaveBeenCalled();
  });

  it('POST /api/designs/generate should block if daily limit reached', async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ id: 'user-1', generations_used: 5 });
    const res = await request(app).post('/api/designs/generate')
      .set('Authorization', 'Bearer mock.jwt.token')
      .send({ prompt: 'Limit test' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Daily limit reached');
  });

  it('GET /api/designs/history should return user designs', async () => {
    vi.mocked(db.getDesignsByUserId).mockResolvedValue([{ id: 'd1', prompt: 'old' }]);
    vi.mocked(db.getUserById).mockResolvedValue({ generations_used: 1, is_finalized: false });
    const res = await request(app).get('/api/designs/history').set('Authorization', 'Bearer mock.jwt.token');
    expect(res.status).toBe(200);
    expect(res.body.designs).toHaveLength(1);
  });
});