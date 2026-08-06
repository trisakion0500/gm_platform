import { Router } from "express";
import * as searchController from "../controllers/search.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

router.post("/search", searchController.search);

export default router;
