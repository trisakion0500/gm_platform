import { Router } from "express";
import * as logAuditSearchController from "../controllers/logAuditSearch.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

router.post("/log-audits/search", logAuditSearchController.search);
router.post("/log-audits/reindex", logAuditSearchController.reindex);

export default router;
