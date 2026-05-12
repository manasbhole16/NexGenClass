const isAiConfigured = () => {
    return Boolean(
        process.env.NIM_BASE_URL &&
        process.env.NIM_API_KEY &&
        process.env.NIM_MODEL
    );
};

const getBaseUrl = () => {
    const base = process.env.NIM_BASE_URL || "";
    return base.replace(/\/+$/, "");
};

const callNimChat = async ({ system, user, temperature = 0.3, maxTokens = 900 }) => {
    if (!isAiConfigured()) {
        throw new Error("AI not configured");
    }

    const url = `${getBaseUrl()}/chat/completions`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NIM_API_KEY}`
        },
        body: JSON.stringify({
            model: process.env.NIM_MODEL,
            temperature,
            max_tokens: maxTokens,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user }
            ]
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`NIM request failed: ${response.status} ${text}`);
    }

    return response.json();
};

module.exports = {
    isAiConfigured,
    callNimChat
};
