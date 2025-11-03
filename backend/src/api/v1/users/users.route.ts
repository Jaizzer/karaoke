// No POST here for creating a user, that's POST /sign-up/email, handled entirely by Better Auth.
// This router only owns the non-auth parts of "users": reading and editing an existing profile.
import { Router } from 'express';
import { getUser, updateUser } from './users.handler.ts';
import requireAuth from '../../../middleware/authorization.ts';

const router = Router();

router.get('/:id', requireAuth, getUser);
router.put('/:id', requireAuth, updateUser);

export default router;
