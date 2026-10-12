import express from 'express';
import { getRoutes } from '../controllers/route.controller.js';

const router = express.Router();

router.get('/', getRoutes);

export default router;
