import express from 'express';
import { getAllStops, getNearestStops } from '../controllers/stop.controller.js';

const router = express.Router();

router.get('/', getAllStops);
router.get('/near', getNearestStops);

export default router;
