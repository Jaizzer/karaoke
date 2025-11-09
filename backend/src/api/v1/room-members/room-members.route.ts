import { Router } from 'express';
import { postJoin } from './room-members.handler.ts';

const router = Router();

router.post('/:code/join', postJoin);

export default router;
