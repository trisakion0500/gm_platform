import { Router } from "express";
import * as docSearchController from "../controllers/docSearch.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

router.post("/search", docSearchController.search);

export default router;
