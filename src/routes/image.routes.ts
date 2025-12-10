import { Router } from 'express';
import imageController from '../controllers/image.controller.js';
import { httpAuthMiddleware } from '../middlewares/auth.middleware.js';
import multer from 'multer';

const router = Router();

// Configurar multer para processar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: any, file: any, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Apenas imagens são aceitas.'));
    }
  },
});

router.use(httpAuthMiddleware);

// Upload de imagem
router.post('/upload', upload.single('image'), (req, res) => {
  imageController.uploadImage(req as any, res);
});

// Buscar imagem
router.get('/:id', (req, res) => {
  imageController.getImage(req, res);
});

export default router;

