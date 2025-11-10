import { Router } from 'express';
import {
	getQueue,
	postQueueItem,
	deleteQueueItem,
	postStartQueueItem,
	postFinishQueueItem,
} from './queue.handler.ts';
import requireRoomMember from '../../../middleware/requireRoomMember.ts';
import requireAuth from '../../../middleware/authorization.ts';

const router = Router();

router.get('/:code/queue', getQueue);
router.post('/:code/queue', requireRoomMember, postQueueItem);
// No requireRoomMember/requireAuth here either; deleteQueueItem resolves either credential itself.
router.delete('/:code/queue/:id', deleteQueueItem);
router.post('/:code/queue/:id/start', requireAuth, postStartQueueItem);
router.post('/:code/queue/:id/finish', requireAuth, postFinishQueueItem);

export default router;
