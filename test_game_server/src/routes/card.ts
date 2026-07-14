import { Router } from "express";
import * as cardController from "../controllers/card.controller";

const router = Router();

router.post("/get-card-list", cardController.getCardList);
router.post("/grant-card", cardController.grantCard);

export default router;
