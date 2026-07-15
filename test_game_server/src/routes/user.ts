import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

router.post("/get-user", userController.getUser);
router.post("/get-user-list", userController.getUserList);
router.post("/update-user-status", userController.updateUserStatus);

export default router;
