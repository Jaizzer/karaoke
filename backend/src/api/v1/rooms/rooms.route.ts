import { Router } from 'express';
import {
	postRoom,
	getRoom,
	patchRoom,
	getMyRoom,
	postClaimHost,
} from './rooms.handler.ts';
import requireAuth from '../../../middleware/authorization.ts';

const router = Router();

router.post('/', requireAuth, postRoom);
// must come before /:code, otherwise "mine" would match as a room code
router.get('/mine', requireAuth, getMyRoom);
// unauthenticated on purpose, guests need to look up a room by its code
// before they've joined it (see room-members)
router.get('/:code', getRoom);
router.patch('/:code', requireAuth, patchRoom);
router.post('/:code/claim-host', requireAuth, postClaimHost);

export default router;
