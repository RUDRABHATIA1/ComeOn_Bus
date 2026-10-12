import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cors from 'cors';
import routeRouter from './routes/route.routes.js';
import stopRouter from './routes/stop.routes.js';
import simulatorRouter from './routes/simulator.routes.js';
import { app, server, setupChangeStream } from './socket.js';
import { startSimulator } from './simulator.js';

dotenv.config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/routes', routeRouter);
app.use('/api/stops', stopRouter);
app.use('/api/simulator', simulatorRouter);

server.listen(port, () => {
    connectDB().then(() => {
        setupChangeStream();
        startSimulator();
    });
    console.log(`Server running at http://localhost:${port}`);
});
