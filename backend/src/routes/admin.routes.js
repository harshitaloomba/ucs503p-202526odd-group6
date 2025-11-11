import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getWebsiteAnalytics,
  getUserActivityAnalytics,
  bulkUpdateUsers,
  resetUserProgress
} from "../controller/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

// All routes require authentication and admin role
router.use(verifyJWT, verifyAdmin);

// User management
router.route("/users").get(getAllUsers);
router.route("/users/:userId").get(getUserById);
router.route("/users/:userId/role").patch(updateUserRole);
router.route("/users/:userId").delete(deleteUser);
router.route("/users/:userId/reset").post(resetUserProgress);
router.route("/users/bulk-update").post(bulkUpdateUsers);

// Analytics
router.route("/analytics").get(getWebsiteAnalytics);
router.route("/analytics/activity").get(getUserActivityAnalytics);

export default router;
