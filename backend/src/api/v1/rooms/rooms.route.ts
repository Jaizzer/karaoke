import { Router } from 'express';
import { postRoom, getRoom, patchRoom } from './rooms.handler.ts';
import requireAuth from '../../../middleware/authorization.ts';

const router = Router();

router.post('/', requireAuth, postRoom);
// unauthenticated on purpose, guests need to look up a room by its code
// before they've joined it (see room-members)
router.get('/:code', getRoom);
router.patch('/:code', requireAuth, patchRoom);

export default router;
