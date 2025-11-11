import mongoose from "mongoose";
const { Schema } = mongoose;

const AptiSchema = new Schema(
  {
    Qid: {
      type: String,
      required: true,
      index: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: (arr) => arr.length === 4, 
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    subtopics: {
      type: [String],
      default: [],
      index: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Apti = mongoose.model("Apti", AptiSchema);