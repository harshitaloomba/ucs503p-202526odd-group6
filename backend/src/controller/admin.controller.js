import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Question } from "../models/question.models.js";
import { Apti } from "../models/apti.models.js";
import { OA } from "../models/OA.models.js";
import { Contest } from "../models/contest.models.js";
import { isValidObjectId } from "mongoose";
import dayjs from 'dayjs';

// Get all users with pagination and filters
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = "", role = "" } = req.query;
  
  const query = {};
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } }
    ];
  }
  if (role) {
    query.role = role;
  }

  const skip = (page - 1) * limit;
  
  const users = await User.find(query)
    .select("-password -refreshToken")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(200, "Users fetched successfully", {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    })
  );
});

// Get single user details
export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findById(userId)
    .select("-password -refreshToken")
    .populate("solvedProblems.question", "Qid title difficulty")
    .populate("solvedApti.question", "Qid title");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "User details fetched successfully", { user })
  );
});

// Update user role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  if (!["user", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role. Must be 'user' or 'admin'");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "User role updated successfully", { user })
  );
});

// Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "User deleted successfully", {})
  );
});

// Get website analytics
export const getWebsiteAnalytics = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const adminUsers = await User.countDocuments({ role: "admin" });
  const regularUsers = await User.countDocuments({ role: "user" });
  
  const totalQuestions = await Question.countDocuments();
  const totalAptiQuestions = await Apti.countDocuments();
  const totalOAs = await OA.countDocuments();
  const completedOAs = await OA.countDocuments({ status: "completed" });
  const ongoingOAs = await OA.countDocuments({ status: "ongoing" });
  
  const totalContests = await Contest.countDocuments();
  const activeContests = await Contest.countDocuments({ active: true });

  // User activity in last 7 days
  const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
  const recentlyActiveUsers = await User.countDocuments({
    lastSynced: { $gte: sevenDaysAgo }
  });

  // New users in last 30 days
  const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();
  const newUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Top performers
  const topPerformers = await User.find()
    .select("username fullName total easy medium hard")
    .sort({ total: -1 })
    .limit(10);

  // User registration trend (last 30 days)
  const registrationTrend = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Analytics fetched successfully", {
      users: {
        total: totalUsers,
        admins: adminUsers,
        regular: regularUsers,
        recentlyActive: recentlyActiveUsers,
        newThisMonth: newUsers
      },
      content: {
        questions: totalQuestions,
        aptitudeQuestions: totalAptiQuestions,
        contests: totalContests,
        activeContests: activeContests
      },
      oa: {
        total: totalOAs,
        completed: completedOAs,
        ongoing: ongoingOAs
      },
      topPerformers,
      registrationTrend
    })
  );
});

// Get user activity analytics
export const getUserActivityAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = dayjs().subtract(parseInt(days), 'day').toDate();

  // Daily active users
  const dailyActivity = await User.aggregate([
    {
      $match: {
        lastSynced: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$lastSynced" }
        },
        activeUsers: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Problem solving trend
  const solvingTrend = await User.aggregate([
    {
      $unwind: "$solvedProblems"
    },
    {
      $match: {
        "solvedProblems.solvedOn": { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$solvedProblems.solvedOn" }
        },
        problemsSolved: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, "User activity analytics fetched successfully", {
      dailyActivity,
      solvingTrend
    })
  );
});

// Bulk operations
export const bulkUpdateUsers = asyncHandler(async (req, res) => {
  const { userIds, updates } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(400, "User IDs array is required");
  }

  if (!updates || typeof updates !== "object") {
    throw new ApiError(400, "Updates object is required");
  }

  // Validate all user IDs
  for (const id of userIds) {
    if (!isValidObjectId(id)) {
      throw new ApiError(400, `Invalid user ID: ${id}`);
    }
  }

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: updates }
  );

  return res.status(200).json(
    new ApiResponse(200, "Bulk update completed", {
      matched: result.matchedCount,
      modified: result.modifiedCount
    })
  );
});

// Reset user progress
export const resetUserProgress = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        solvedProblems: [],
        solvedApti: [],
        lastSynced: null
      }
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "User progress reset successfully", { user })
  );
});
