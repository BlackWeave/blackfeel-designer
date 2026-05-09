import { vi } from 'vitest';

// Provide a dummy DATABASE_URL for tests to prevent initialization errors
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret';
process.env.RAZORPAY_KEY_ID = 'test-key-id';
process.env.RAZORPAY_KEY_SECRET = 'test-key-secret';
process.env.GCP_PROJECT_ID = 'test-project';
process.env.GCP_LOCATION = 'us-central1';

// Mock the pg Pool as a class to be used as a constructor
vi.mock('pg', () => {
  class Pool {
    constructor() {
      this.query = vi.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));
      this.on = vi.fn();
      this.connect = vi.fn();
      this.end = vi.fn();
    }
  }
  return {
    default: { Pool },
    Pool
  };
});

// Mock Google GenAI (Vertex AI) as a class
vi.mock('@google/genai', () => {
  class GoogleGenAI {
    constructor() {
      this.models = {
        generateContent: vi.fn().mockImplementation(async () => ({
          candidates: [{
            content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'mock-base64-data' } }] },
            finishReason: 'STOP'
          }],
          text: 'Mock sanitized prompt'
        })),
        generateImages: vi.fn().mockImplementation(async () => ({
          generatedImages: [{ image: { imageBytes: Buffer.from('mock-image-bytes').toString('base64') } }]
        })),
      };
      this.getGenerativeModel = vi.fn().mockImplementation(() => ({
        generateContent: vi.fn(),
      }));
    }
  }
  return {
    GoogleGenAI
  };
});

// Mock auth middleware
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.userId = 'user-1';
    req.userEmail = 'test@test.com';
    next();
  }),
  generateToken: vi.fn(() => 'mock.jwt.token'),
}));

// Mock Services directly
vi.mock('../services/vertexAi.js', () => ({
  vertexAiService: {
    generateImage: vi.fn().mockResolvedValue('data:image/png;base64,mock-base64'),
    editImage: vi.fn().mockResolvedValue('data:image/png;base64,mock-base64-edited'),
  }
}));

vi.mock('../services/cloudinary.js', () => ({
  uploadImage: vi.fn(),
  uploadBase64: vi.fn(),
  cloudinaryService: {
    uploadImage: vi.fn(),
    uploadBase64: vi.fn(),
  }
}));

vi.mock('../services/razorpay.js', () => ({
  razorpayService: {
    createOrder: vi.fn(),
    verifySignature: vi.fn(),
  }
}));

vi.mock('../services/removeBg.js', () => ({
  removeBgService: {
    process: vi.fn().mockResolvedValue('data:image/png;base64,mock-no-bg'),
  }
}));

vi.mock('../services/enhanceService.js', () => ({
  enhanceService: {
    enhanceImage: vi.fn(),
    enhanceAndUploadToR2: vi.fn().mockResolvedValue('http://mock.com/highres.png'),
  }
}));

vi.mock('../services/openRouter.js', () => ({
  openRouterService: {
    generatePrompt: vi.fn(),
  }
}));

vi.mock('../services/imageStorage.js', () => ({
  imageStorage: {
    uploadBuffer: vi.fn().mockResolvedValue('http://mock.com/img.png'),
    uploadBase64: vi.fn().mockResolvedValue('http://mock.com/img.png'),
  }
}));
