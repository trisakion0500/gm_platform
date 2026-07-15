import { Router } from "express";
import * as cardController from "../controllers/card.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

router.post("/get-card-list", cardController.getCardList);
router.post("/grant-card", cardController.grantCard);

export default router;
