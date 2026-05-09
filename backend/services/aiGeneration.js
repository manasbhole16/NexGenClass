const { callNimChat } = require("../utils/aiClient");

const extractJson = (content) => {
    if (!content) throw new Error("Empty AI response");
    const trimmed = content.trim();
    if (trimmed.startsWith("{")) {
        return JSON.parse(trimmed);
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("No JSON found in AI response");
};

const normalizeDifficulty = (value) => {
    const normalized = String(value || "medium").toLowerCase();
    if (["easy", "medium", "hard"].includes(normalized)) return normalized;
    return "medium";
};

const normalizeOptions = (options) => {
    if (!Array.isArray(options)) return [];
    return options
        .slice(0, 4)
        .map((opt) => ({ text: String(opt.text ?? opt).trim() }))
        .filter((opt) => opt.text.length > 0);
};

const generateQuizQuestionsFromNotes = async ({ notesText, questionCount, difficultyMix }) => {
    const system = [
        "You are a teaching assistant who creates multiple-choice questions.",
        "Return JSON only with this schema:",
        "{ \"questions\": [ { \"questionText\": string, \"options\": [{\"text\": string}], \"correctAnswer\": number, \"marks\": number, \"difficulty\": \"easy\"|\"medium\"|\"hard\", \"explanation\": string } ] }",
        "Use exactly 4 options per question and set correctAnswer as the index (0-3).",
        "Explanations must be short, 1-2 sentences."
    ].join(" ");

    const user = [
        `Notes:\n${notesText}`,
        `Question count: ${questionCount}`,
        `Difficulty mix: ${JSON.stringify(difficultyMix)}`
    ].join("\n\n");

    const response = await callNimChat({ system, user, temperature: 0.4, maxTokens: 1600 });
    const content = response?.choices?.[0]?.message?.content;
    const payload = extractJson(content);

    const rawQuestions = Array.isArray(payload.questions) ? payload.questions : [];
    const questions = rawQuestions.map((q) => {
        const options = normalizeOptions(q.options);
        return {
            questionText: String(q.questionText || "").trim(),
            options,
            correctAnswer: Number.isFinite(Number(q.correctAnswer)) ? Number(q.correctAnswer) : 0,
            marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : 1,
            difficulty: normalizeDifficulty(q.difficulty),
            explanation: String(q.explanation || "").trim()
        };
    }).filter((q) => q.questionText && q.options.length >= 2);

    return { questions };
};

const generateTaskDraftFromPrompt = async ({ prompt, timezone }) => {
    const system = [
        "You are an academic assistant creating task drafts for teachers.",
        "Return JSON only with this schema:",
        "{ \"title\": string, \"description\": string, \"tags\": string[], \"dueDateSuggestion\": string, \"subtasks\": [{\"title\": string}], \"rubric\": [{\"criterion\": string, \"points\": number, \"description\": string}] }",
        "dueDateSuggestion should be YYYY-MM-DD in the provided timezone."
    ].join(" ");

    const user = [
        `Prompt: ${prompt}`,
        `Timezone: ${timezone}`
    ].join("\n");

    const response = await callNimChat({ system, user, temperature: 0.5, maxTokens: 1200 });
    const content = response?.choices?.[0]?.message?.content;
    const payload = extractJson(content);

    return {
        title: String(payload.title || "").trim(),
        description: String(payload.description || "").trim(),
        tags: Array.isArray(payload.tags) ? payload.tags.map((t) => String(t).trim()).filter(Boolean) : [],
        dueDateSuggestion: String(payload.dueDateSuggestion || "").trim(),
        subtasks: Array.isArray(payload.subtasks)
            ? payload.subtasks.map((s) => ({ title: String(s.title || s).trim() })).filter((s) => s.title)
            : [],
        rubric: Array.isArray(payload.rubric)
            ? payload.rubric.map((r) => ({
                criterion: String(r.criterion || "").trim(),
                points: Number.isFinite(Number(r.points)) ? Number(r.points) : 0,
                description: String(r.description || "").trim()
            })).filter((r) => r.criterion)
            : []
    };
};

module.exports = {
    generateQuizQuestionsFromNotes,
    generateTaskDraftFromPrompt
};
