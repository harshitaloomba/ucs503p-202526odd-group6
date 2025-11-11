import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Apti } from "../models/apti.models.js";
import { User } from "../models/user.model.js";
import { isValidObjectId } from "mongoose";

const getAll = asyncHandler(async (req, res) => {
    const { topics, subtopics, title } = req.query;

    const query = {};
    if (topics) {
        query.topics = { $in: topics.split(",") };
    }
    if (subtopics) {
        query.subtopics = { $in: subtopics.split(",") };
    }
    if (title) {
        query.title = { $regex: title, $options: "i" };
    }

    const ques = await Apti.find(query).sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Aptitude questions fetched successfully",
                {
                    total: ques.length,
                    questions: ques
                }
            )
        );
});

const getById = asyncHandler(async (req, res) => {
    const { Qid } = req.params;
    if (!Qid) {
        throw new ApiError(400, "Question ID is required");
    }

    const question = await Apti.findOne({ Qid });

    if (!question) {
        throw new ApiError(404, "Question not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Question fetched successfully",
                { question }
            )
        );
});

const addQues = asyncHandler(async (req, res) => {
    const { Qid, title, options, topics, subtopics, correctAnswer } = req.body;
    
    if (!Qid || !title || !options || !correctAnswer) {
        throw new ApiError(400, "Qid, title, options, and correctAnswer are required");
    }

    if (!Array.isArray(options) || options.length !== 4) {
        throw new ApiError(400, "Options must be an array of 4 items");
    }

    const existingQuestion = await Apti.findOne({ Qid });

    if (existingQuestion) {
        throw new ApiError(400, "Question already exists");
    }

    const ques = await Apti.create({
        Qid,
        title,
        options,
        topics: topics || [],
        subtopics: subtopics || [],
        correctAnswer
    });

    const createdQuestion = await Apti.findById(ques._id);

    if (!createdQuestion) {
        throw new ApiError(500, "Question creation failed");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Question created successfully",
                { createdQuestion }
            )
        );
});

const addBulk = asyncHandler(async (req, res) => {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
        throw new ApiError(400, "Invalid questions data");
    }

    const bulkOps = questions.map(q => ({
        updateOne: {
            filter: { Qid: q.Qid },
            update: { $setOnInsert: q },
            upsert: true
        }
    }));

    const result = await Apti.bulkWrite(bulkOps);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Bulk questions processed successfully",
                {
                    modifiedCount: result.modifiedCount,
                    upsertedCount: result.upsertedCount
                }
            )
        );
});

const giveTopics = asyncHandler(async (req, res) => {
  
  let { topic } = req.params;

  if (!topic || topic === "null") topic = "Quantitative Aptitude"; 

  const questions = await Apti.find({ topics: topic });
  
  if (!questions || questions.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, "No questions found for this topic"));
  }

  // Fetch user's solved aptitude problems
  const userId = req.user.id;
  const user = await User.findById(userId).select("solvedApti");
  if (!user) {
    return res.status(404).json(new ApiResponse(404, "User not found"));
  }

  const solvedSet = new Set(
    user.solvedApti.map((entry) => entry.question.toString())
  );

  // Annotate questions with solved status
  let annotatedQuestions = questions.map((q) => {
    const isSolved = solvedSet.has(q._id.toString());
    return {
      ...q.toObject(),
      solved: isSolved
    };
  });

  const solvedCount = annotatedQuestions.reduce(
    (count, q) => count + (q.solved ? 1 : 0),
    0
  );

  return res.status(200).json(
    new ApiResponse(200, "Questions fetched successfully", {
      total: annotatedQuestions.length,
      solvedCount,
      questions: annotatedQuestions
    })
  );
});

const giveSubtopics = asyncHandler(async (req, res) => {
  
  let { subtopic } = req.params;

  if (!subtopic || subtopic === "null") subtopic = "Percentages"; 

  const questions = await Apti.find({ subtopics: subtopic });
  
  if (!questions || questions.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, "No questions found for this subtopic"));
  }

  // Fetch user's solved aptitude problems
  const userId = req.user.id;
  const user = await User.findById(userId).select("solvedApti");
  if (!user) {
    return res.status(404).json(new ApiResponse(404, "User not found"));
  }

  const solvedSet = new Set(
    user.solvedApti.map((entry) => entry.question.toString())
  );

  // Annotate questions with solved status
  let annotatedQuestions = questions.map((q) => {
    const isSolved = solvedSet.has(q._id.toString());
    return {
      ...q.toObject(),
      solved: isSolved
    };
  });

  const solvedCount = annotatedQuestions.reduce(
    (count, q) => count + (q.solved ? 1 : 0),
    0
  );

  return res.status(200).json(
    new ApiResponse(200, "Questions fetched successfully", {
      total: annotatedQuestions.length,
      solvedCount,
      questions: annotatedQuestions
    })
  );
});

const markSolved = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { Qid } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User ID is not valid");
  }

  if (!Qid) {
    throw new ApiError(400, "Question ID is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const question = await Apti.findOne({ Qid });
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  const alreadySolved = user.solvedApti.some(
    (entry) => entry.question.toString() === question._id.toString()
  );

  if (alreadySolved) {
    throw new ApiError(400, "Question already marked as solved");
  }

  user.solvedApti.push({
    question: question._id,
    solvedOn: new Date()
  });

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, "Question marked as solved", {
      totalSolved: user.solvedApti.length
    })
  );
});

const unmarkSolved = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { Qid } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User ID is not valid");
  }

  if (!Qid) {
    throw new ApiError(400, "Question ID is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const question = await Apti.findOne({ Qid });
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  const index = user.solvedApti.findIndex(
    (entry) => entry.question.toString() === question._id.toString()
  );

  if (index === -1) {
    throw new ApiError(400, "Question not marked as solved");
  }

  user.solvedApti.splice(index, 1);
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, "Question unmarked as solved", {
      totalSolved: user.solvedApti.length
    })
  );
});

const getAptiStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User ID is not valid");
  }

  const user = await User.findById(userId).populate("solvedApti.question");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const totalSolved = user.solvedApti.length;

  // Group by topics
  const topicStats = {};
  const subtopicStats = {};

  for (const entry of user.solvedApti) {
    const q = entry.question;
    
    // Count topics
    if (q.topics && Array.isArray(q.topics)) {
      for (const topic of q.topics) {
        topicStats[topic] = (topicStats[topic] || 0) + 1;
      }
    }

    // Count subtopics
    if (q.subtopics && Array.isArray(q.subtopics)) {
      for (const subtopic of q.subtopics) {
        subtopicStats[subtopic] = (subtopicStats[subtopic] || 0) + 1;
      }
    }
  }

  const stats = {
    totalSolved,
    topicStats,
    subtopicStats,
    recentSolved: user.solvedApti
      .slice(-10)
      .reverse()
      .map(entry => ({
        Qid: entry.question.Qid,
        title: entry.question.title,
        solvedOn: entry.solvedOn
      }))
  };

  return res.status(200).json(
    new ApiResponse(200, "Aptitude stats fetched successfully", { stats })
  );
});

const getAllTopics = asyncHandler(async (req, res) => {
  // Get all unique topics from the database
  const topics = await Apti.distinct("topics");
  
  // Get count for each topic
  const topicCounts = await Promise.all(
    topics.map(async (topic) => {
      const count = await Apti.countDocuments({ topics: topic });
      return { topic, count };
    })
  );

  return res.status(200).json(
    new ApiResponse(200, "Topics fetched successfully", {
      total: topics.length,
      topics: topicCounts
    })
  );
});

const getAllSubtopics = asyncHandler(async (req, res) => {
  const { topic } = req.query;
  
  let query = {};
  if (topic) {
    query.topics = topic;
  }

  // Get all unique subtopics
  const subtopics = await Apti.distinct("subtopics", query);
  
  // Get count for each subtopic
  const subtopicCounts = await Promise.all(
    subtopics.map(async (subtopic) => {
      const subQuery = { subtopics: subtopic };
      if (topic) {
        subQuery.topics = topic;
      }
      const count = await Apti.countDocuments(subQuery);
      return { subtopic, count };
    })
  );

  return res.status(200).json(
    new ApiResponse(200, "Subtopics fetched successfully", {
      total: subtopics.length,
      subtopics: subtopicCounts
    })
  );
});

const validateAnswer = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { Qid, selectedAnswer } = req.body;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User ID is not valid");
  }

  if (!Qid || !selectedAnswer) {
    throw new ApiError(400, "Question ID and selected answer are required");
  }

  const question = await Apti.findOne({ Qid });
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  // Extract just the letter from correctAnswer if it contains more (e.g., "C. 65 kg" -> "C")
  let correctAnswerLetter = question.correctAnswer.trim();
  const match = correctAnswerLetter.match(/^([A-D])/i);
  if (match) {
    correctAnswerLetter = match[1].toUpperCase();
  }

  // Trim and compare case-insensitively
  const selectedAnswerLetter = selectedAnswer.trim().toUpperCase();
  const isCorrect = correctAnswerLetter === selectedAnswerLetter;

  // If correct, mark as solved
  if (isCorrect) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const alreadySolved = user.solvedApti.some(
      (entry) => entry.question.toString() === question._id.toString()
    );

    if (!alreadySolved) {
      user.solvedApti.push({
        question: question._id,
        solvedOn: new Date()
      });
      await user.save();
    }
  }

  return res.status(200).json(
    new ApiResponse(200, "Answer validated", {
      isCorrect,
      correctAnswer: correctAnswerLetter,
      explanation: question.explanation || null
    })
  );
});

export { 
  getAll, 
  getById, 
  addQues, 
  addBulk, 
  giveTopics, 
  giveSubtopics, 
  markSolved, 
  unmarkSolved, 
  getAptiStats,
  getAllTopics,
  getAllSubtopics,
  validateAnswer
};



