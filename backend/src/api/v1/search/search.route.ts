import { Router } from 'express';
import { postSearch } from './search.handler.ts';
import requireRoomMember from '../../../middleware/requireRoomMember.ts';

const router = Router();

router.post('/:code/search', requireRoomMember, postSearch);

export default router;
