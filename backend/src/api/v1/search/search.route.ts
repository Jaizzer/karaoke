import { Router } from 'express';
import { postSearch } from './search.handler.ts';

const router = Router();

// no requireRoomMember here, postSearch resolves either credential itself
// since the caller could be the host or a joined guest
router.post('/:code/search', postSearch);

export default router;
