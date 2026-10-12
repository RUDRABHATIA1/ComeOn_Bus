import express from 'express';
import { updateSimulatorConfig } from '../controllers/simulator.controller.js';

const router = express.Router();

router.post('/config', updateSimulatorConfig);

export default router;
