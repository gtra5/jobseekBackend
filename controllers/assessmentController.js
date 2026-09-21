/**
 * Assessment Controller
 * Skill assessments for freelancers: take a quiz per skill category, earn a
 * verified score, rank against peers, and searchable by verified skill.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const Assessment = require('../models/Assessment');
const AssessmentResult = require('../models/AssessmentResult');
const User = require('../models/User');

const CATEGORY_ENUM = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Data Science',
  'DevOps',
  'Cybersecurity',
  'Cloud Computing',
  'AI/ML',
  'Other',
];

/**
 * GET /api/assessments/categories
 * Public. List available assessments with metadata (no answers exposed).
 */
const getCategories = asyncHandler(async (req, res) => {
  const assessments = await Assessment.find({ isActive: true })
    .select('skillCategory title description difficulty passScore timeLimitMinutes questions')
    .lean();

  // Group by category, attach assessment ids and question counts per difficulty
  const byCategory = {};
  for (const a of assessments) {
    if (!byCategory[a.skillCategory]) {
      byCategory[a.skillCategory] = {
        category: a.skillCategory,
        title: a.title,
        description: a.description,
        passScore: a.passScore,
        assessments: [],
      };
    }
    const entry = byCategory[a.skillCategory];
    entry.assessments.push({
      id: a._id,
      difficulty: a.difficulty,
      timeLimitMinutes: a.timeLimitMinutes,
      questions: a.questions.length,
    });
  }

  return ApiResponse.success(res, 200, 'Assessment categories retrieved', {
    categories: Object.values(byCategory),
  });
});

/**
 * GET /api/assessments/:id
 * Public. Fetch a single assessment's questions for taking.
 * Answers (correctIndex) are intentionally NOT returned.
 */
const getAssessmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assessment = await Assessment.findOne({ _id: id, isActive: true }).lean();
  if (!assessment) {
    return ApiResponse.notFound(res, 'Assessment not found');
  }

  const safeQuestions = assessment.questions.map((q) => ({
    question: q.question,
    options: q.options,
  }));

  return ApiResponse.success(res, 200, 'Assessment retrieved', {
    assessment: {
      id: assessment._id,
      skillCategory: assessment.skillCategory,
      title: assessment.title,
      description: assessment.description,
      difficulty: assessment.difficulty,
      passScore: assessment.passScore,
      timeLimitMinutes: assessment.timeLimitMinutes,
      questions: safeQuestions,
    },
  });
});

/**
 * POST /api/assessments/:id/take
 * Private (Job Seeker). Submit answers and get scored.
 * Body: { answers: [{ questionIndex, chosenIndex }], timeSpentSeconds? }
 */
const submitAssessment = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (req.userRole !== 'jobseeker') {
    return ApiResponse.forbidden(res, 'Only job seekers can take assessments');
  }

  const assessment = await Assessment.findOne({ _id: req.params.id, isActive: true });
  if (!assessment) {
    return ApiResponse.notFound(res, 'Assessment not found');
  }

  const { answers, timeSpentSeconds = 0 } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return ApiResponse.badRequest(res, 'No answers submitted');
  }

  // Grade
  const byIndex = {};
  for (const a of answers) {
    if (a && Number.isInteger(a.questionIndex)) {
      byIndex[a.questionIndex] = a.chosenIndex;
    }
  }

  let correct = 0;
  const answerSnapshot = assessment.questions.map((q, i) => {
    const chosen = byIndex[i];
    const isCorrect = chosen === q.correctIndex;
    if (isCorrect) correct += 1;
    return {
      question: q.question,
      chosenIndex: chosen,
      correctIndex: q.correctIndex,
      isCorrect,
    };
  });

  const total = assessment.questions.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= assessment.passScore;

  // Save result
  const result = await AssessmentResult.create({
    user: userId,
    assessment: assessment._id,
    skillCategory: assessment.skillCategory,
    score,
    passed,
    answers: answerSnapshot,
    timeSpentSeconds,
  });

  // Update "best" flags: mark this best if it beats the current best
  const currentBest = await AssessmentResult.findOne({
    user: userId,
    skillCategory: assessment.skillCategory,
    isBest: true,
  });
  if (!currentBest || score > currentBest.score) {
    if (currentBest) {
      currentBest.isBest = false;
      await currentBest.save();
    }
    result.isBest = true;
    await result.save();
  } else {
    result.isBest = false;
    await result.save();
  }

  // Sync verifiedSkills on the user's profile
  await updateVerifiedSkill(userId, assessment.skillCategory, score, passed);

  // Compute percentile vs all best results in this category
  const allBest = await AssessmentResult.countDocuments({
    skillCategory: assessment.skillCategory,
    isBest: true,
  });
  const betterOrEqual = await AssessmentResult.countDocuments({
    skillCategory: assessment.skillCategory,
    isBest: true,
    score: { $gte: score },
  });
  const percentile =
    allBest > 0 ? Math.round((betterOrEqual / allBest) * 100) : null;

  return ApiResponse.success(res, 200, passed ? 'Assessment passed' : 'Assessment completed', {
    result: {
      id: result._id,
      skillCategory: assessment.skillCategory,
      score,
      passed,
      correct,
      total,
      percentile: percentile === null ? null : Math.max(0, 100 - percentile),
      isBest: result.isBest,
    },
  });
});

/**
 * GET /api/assessments/my
 * Private. Return the authenticated user's best verified scores.
 */
const getMyResults = asyncHandler(async (req, res) => {
  const results = await AssessmentResult.find({
    user: req.userId,
    isBest: true,
  })
    .sort({ score: -1 })
    .lean();

  return ApiResponse.success(res, 200, 'Your assessment results', { results });
});

/**
 * GET /api/assessments/search?skill=&q=
 * Public. Search freelancers by verified skill, ranked by score.
 */
const searchFreelancers = asyncHandler(async (req, res) => {
  const { skill, q } = req.query;
  if (skill) {
    const results = await AssessmentResult.find({
      skillCategory: skill,
      isBest: true,
      passed: true,
    })
      .sort({ score: -1 })
      .limit(Math.min(parseInt(req.query.limit, 10) || 20, 50))
      .populate('user', 'firstName lastName avatar headline profile.skills')
      .lean();

    const freelancers = results
      .filter((r) => r.user)
      .map((r) => ({
        userId: r.user._id,
        name: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
        avatar: r.user.avatar,
        headline: r.user.profile?.headline || '',
        skills: r.user.profile?.skills || [],
        score: r.score,
        passed: r.passed,
        category: r.skillCategory,
      }));

    return ApiResponse.success(res, 200, 'Freelancers found', { freelancers });
  }

  if (q) {
    const users = await User.find({
      role: 'jobseeker',
      $or: [
        { 'profile.headline': { $regex: q, $options: 'i' } },
        { 'profile.skills': { $regex: q, $options: 'i' } },
        { 'profile.verifiedSkills.skill': { $regex: q, $options: 'i' } },
      ],
    })
      .select('firstName lastName avatar profile.headline profile.skills profile.verifiedSkills')
      .limit(20)
      .lean();

    return ApiResponse.success(res, 200, 'Freelancers found', {
      freelancers: users.map((u) => ({
        userId: u._id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        avatar: u.avatar,
        headline: u.profile?.headline || '',
        skills: u.profile?.skills || [],
        verifiedSkills: u.profile?.verifiedSkills || [],
      })),
    });
  }

  return ApiResponse.badRequest(res, 'Provide a skill or search query');
});

/**
 * Helper: upsert a verified skill entry on the user's profile.
 */
const updateVerifiedSkill = async (userId, skill, score, passed) => {
  const user = await User.findById(userId);
  if (!user) return;

  user.profile = user.profile || {};
  user.profile.verifiedSkills = user.profile.verifiedSkills || [];

  const existing = user.profile.verifiedSkills.find((s) => s.skill === skill);
  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.passed = passed;
      existing.verifiedAt = new Date();
    }
  } else {
    user.profile.verifiedSkills.push({
      skill,
      score,
      passed,
      verifiedAt: new Date(),
    });
  }

  await user.save();
};

module.exports = {
  getCategories,
  getAssessmentById,
  submitAssessment,
  getMyResults,
  searchFreelancers,
  CATEGORY_ENUM,
};
