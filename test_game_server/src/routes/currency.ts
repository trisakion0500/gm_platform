import { Router } from "express";
import * as currencyController from "../controllers/currency.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

router.post("/get-currency-list", currencyController.getCurrencyList);
router.post("/grant-currency", currencyController.grantCurrency);

export default router;
