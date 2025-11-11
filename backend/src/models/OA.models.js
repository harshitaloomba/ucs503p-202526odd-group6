import mongoose from "mongoose";

const OASchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    // Aptitude section (30 mins, 25 questions)
    aptitudeQuestions: [
      {
        question: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Apti", 
          required: true 
        },
        selectedAnswer: { 
          type: String, 
          default: null 
        },
        isCorrect: { 
          type: Boolean, 
          default: null 
        },
        status: { 
          type: String, 
          enum: ["pending", "answered"], 
          default: "pending" 
        },
        answeredOn: { 
          type: Date, 
          default: null 
        },
      },
    ],

    // DSA section (90 mins, 4 questions)
    dsaQuestions: [
      {
        question: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Question", 
          required: true 
        },
        slug: { 
          type: String, 
          required: true, 
          trim: true 
        },
        status: { 
          type: String, 
          enum: ["pending", "completed"], 
          default: "pending" 
        },
        completedOn: { 
          type: Date, 
          default: null 
        },
      },
    ],

    // Section tracking
    currentSection: {
      type: String,
      enum: ["aptitude", "dsa", "completed"],
      default: "aptitude"
    },

    aptitudeSectionEndTime: {
      type: Date,
      default: null
    },

    // Stats
    totalAptitudeQuestions: { 
      type: Number, 
      default: 25 
    },

    aptitudeCorrect: { 
      type: Number, 
      default: 0 
    },

    aptitudeAttempted: { 
      type: Number, 
      default: 0 
    },

    totalDsaQuestions: { 
      type: Number, 
      default: 4 
    },

    dsaCompletedCount: { 
      type: Number, 
      default: 0 
    },

    startedAt: { 
      type: Date, 
      default: () => new Date() 
    },

    endedAt: { 
      type: Date, 
      default: null 
    },

    status: { 
      type: String, 
      enum: ["ongoing", "completed", "aborted"], 
      default: "ongoing" 
    },
  },
  { timestamps: true }
);

export const OA = mongoose.model("OA", OASchema);