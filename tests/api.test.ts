import request from 'supertest';
import { app } from '../server';

describe('Mentora API & AI Endpoints', () => {
  beforeAll(() => {
    // Suppress console logs during testing to keep output clean
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return a healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('hasGeminiKey');
    });
  });

  describe('GET /api/ai/health', () => {
    it('should return AI provider telemetry', async () => {
      const res = await request(app).get('/api/ai/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('providers');
      expect(Array.isArray(res.body.providers)).toBeTruthy();
      expect(res.body).toHaveProperty('env');
    });
  });

  describe('POST /api/gemini/generate-notes', () => {
    it('should reject requests missing the "topic" field', async () => {
      const res = await request(app)
        .post('/api/gemini/generate-notes')
        .send({ detailLevel: "advanced" });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing required field: topic');
    });

    it('should return a valid structured note (fallback mode)', async () => {
      // In local testing without API keys, this should hit the fallback generator gracefully
      const res = await request(app)
        .post('/api/gemini/generate-notes')
        .send({ topic: "Quantum Mechanics" });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('content');
      expect(res.body).toHaveProperty('flashcards');
      expect(Array.isArray(res.body.flashcards)).toBeTruthy();
    });
  });

  describe('POST /api/gemini/generate-quiz', () => {
    it('should reject requests missing the "topic" field', async () => {
      const res = await request(app).post('/api/gemini/generate-quiz').send({});
      expect(res.status).toBe(400);
    });

    it('should return a generated quiz array', async () => {
      const res = await request(app)
        .post('/api/gemini/generate-quiz')
        .send({ topic: "Biology", amount: 2 });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('questions');
      expect(Array.isArray(res.body.questions)).toBeTruthy();
      expect(res.body.questions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /api/gemini/recommendations', () => {
    it('should return valid recommendations', async () => {
      const res = await request(app)
        .post('/api/gemini/recommendations')
        .send({ streak: 5, totalXp: 1200, currentLevel: 3 });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('recommendations');
      expect(Array.isArray(res.body.recommendations)).toBeTruthy();
    });
  });
});
