// Choke point for every transactional email Better Auth sends; auth.ts calls this instead of Resend directly.
// RESEND_API_KEY is optional (logs the email instead when unset); sandbox sending only reaches the account owner's inbox.
import { Resend } from 'resend';
import config from '../config/env.ts';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export async function sendAuthEmail(
	to: string,
	subject: string,
	html: string,
): Promise<void> {
	if (!resend) {
		console.log(`[dev email] To: ${to}\nSubject: ${subject}\n${html}`);
		return;
	}

	await resend.emails.send({
		from: 'Karaoke <onboarding@resend.dev>',
		to,
		subject,
		html,
	});
}
