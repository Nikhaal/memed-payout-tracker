import { Router } from "express";
import { login, me, signup } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.get("/me", authenticate, asyncHandler(me));

export default router;
