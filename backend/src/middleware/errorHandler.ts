// Registered last in app.ts; Express recognizes an error handler by its 4-arg signature (err, req, res, next).
// On Express 5, a rejected promise from an async route handler is forwarded here automatically.
import type { Request, Response, NextFunction } from 'express';

export default function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required so Express recognizes this as error-handling middleware
	_next: NextFunction,
) {
	console.error(err);

	if (res.headersSent) {
		return;
	}

	res.status(500).json({ message: 'Internal server error.' });
}
