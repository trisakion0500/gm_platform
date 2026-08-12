import { Router } from "express";
import * as apiSearchController from "../controllers/apiSearch.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

router.post("/apis/search", apiSearchController.search);
router.post("/apis/reindex", apiSearchController.reindex);

export default router;
