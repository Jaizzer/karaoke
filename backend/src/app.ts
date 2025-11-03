// server.ts is the only thing that binds a port, so this file can be imported into tests with supertest.
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.ts';
import healthRoutes from './api/v1/health/health.route.ts';
import userRoutes from './api/v1/users/users.route.ts';
import errorHandler from './middleware/errorHandler.ts';

const app = express();

// origin: true reflects whatever Origin sent the request, paired with credentials: true since a
// literal wildcard is rejected once credentials are involved. Swap for a fixed domain later.
app.use(cors({ origin: true, credentials: true }));

// Mounted before express.json() since Better Auth reads the raw request body itself.
app.all('/api/v1/authentication/{*any}', toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/users', userRoutes);

// Must go last: Express only treats a 4-arg middleware as an error handler, after the routes it covers.
app.use(errorHandler);

export default app;
