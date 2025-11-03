// The actual entrypoint; deliberately just app.listen() so app.ts stays importable by tests without a real port.
import app from './app.ts';
import config from './config/env.ts';

app.listen(config.port, () => {
	console.log(`Server is running on http://localhost:${config.port}`);
});
