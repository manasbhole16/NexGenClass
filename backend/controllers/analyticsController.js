const AssessmentSubmission = require("../models/assessment-submission-model");
const mongoose = require("mongoose");

/**
 * @desc    Get student topic-wise mastery analytics via Aggregation Pipeline
 * @route   GET /api/analytics/student/:id/mastery
 * @access  Private
 */
const getStudentMastery = async (req, res) => {
    try {
        const { id: studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID format."
            });
        }

        const studentObjectId = new mongoose.Types.ObjectId(studentId);

        // Aggregation Pipeline
        const masteryData = await AssessmentSubmission.aggregate([
            // 1. Match submissions for the given student
            {
                $match: {
                    studentId: studentObjectId
                }
            },
            // 2. Join with assessments collection
            {
                $lookup: {
                    from: "assessments",
                    localField: "assessmentId",
                    foreignField: "_id",
                    as: "assessment"
                }
            },
            // 3. Unwind the assessment document array
            {
                $unwind: "$assessment"
            },
            // 4. Unwind individual answers submitted by student
            {
                $unwind: "$answers"
            },
            // 5. Match answer questionId with corresponding question inside assessment.questions
            {
                $addFields: {
                    matchedQuestion: {
                        $first: {
                            $filter: {
                                input: "$assessment.questions",
                                as: "q",
                                cond: { $eq: ["$$q.questionId", "$answers.questionId"] }
                            }
                        }
                    }
                }
            },
            // 6. Filter out any unmatched orphaned questions if any
            {
                $match: {
                    matchedQuestion: { $ne: null }
                }
            },
            // 7. Group by concept / topicTag
            {
                $group: {
                    _id: "$matchedQuestion.topicTag",
                    topicTag: { $first: "$matchedQuestion.topicTag" },
                    totalEarnedScore: { $sum: "$answers.marksObtained" },
                    totalPossibleScore: { $sum: { $ifNull: ["$matchedQuestion.weightage", 1] } },
                    totalQuestions: { $sum: 1 },
                    correctCount: {
                        $sum: {
                            $cond: [{ $eq: ["$answers.isCorrect", true] }, 1, 0]
                        }
                    },
                    averageTimeSpent: { $avg: "$answers.timeSpentSeconds" },
                    bloomLevels: { $addToSet: "$matchedQuestion.bloomTaxonomy" }
                }
            },
            // 8. Calculate Mastery Percentage & Format
            {
                $project: {
                    _id: 0,
                    topicTag: 1,
                    totalEarnedScore: 1,
                    totalPossibleScore: 1,
                    totalQuestions: 1,
                    correctCount: 1,
                    averageTimeSpent: { $round: ["$averageTimeSpent", 1] },
                    bloomLevels: 1,
                    masteryPercentage: {
                        $round: [
                            {
                                $cond: [
                                    { $gt: ["$totalPossibleScore", 0] },
                                    {
                                        $multiply: [
                                            { $divide: ["$totalEarnedScore", "$totalPossibleScore"] },
                                            100
                                        ]
                                    },
                                    0
                                ]
                            },
                            2
                        ]
                    }
                }
            },
            // 9. Sort descending by mastery
            {
                $sort: { masteryPercentage: -1 }
            }
        ]);

        return res.status(200).json({
            success: true,
            studentId,
            totalConceptsEvaluated: masteryData.length,
            data: masteryData
        });
    } catch (error) {
        console.error("Error computing student concept mastery:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch student mastery analytics.",
            error: error.message
        });
    }
};

module.exports = {
    getStudentMastery
};
