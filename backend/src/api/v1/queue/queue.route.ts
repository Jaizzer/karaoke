import { Router } from 'express';
import {
	getQueue,
	postQueueItem,
	deleteQueueItem,
	postStartQueueItem,
	postFinishQueueItem,
	postMoveQueueItem,
} from './queue.handler.ts';
import requireAuth from '../../../middleware/authorization.ts';

const router = Router();

router.get('/:code/queue', getQueue);
// no requireRoomMember here, postQueueItem resolves either credential
// itself since the caller could be the host or a joined guest
router.post('/:code/queue', postQueueItem);
// No requireRoomMember/requireAuth here either; deleteQueueItem resolves either credential itself.
router.delete('/:code/queue/:id', deleteQueueItem);
router.post('/:code/queue/:id/start', requireAuth, postStartQueueItem);
router.post('/:code/queue/:id/finish', requireAuth, postFinishQueueItem);
router.post('/:code/queue/:id/move', requireAuth, postMoveQueueItem);

export default router;
