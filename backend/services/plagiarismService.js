const STOP_WORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
    "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
    "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
    "they're", "they've", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
    "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
    "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
    "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours"
]);

const MIN_MATCHED_PHRASE_WORDS = 5;

class PlagiarismService {
    /**
     * Normalize raw text for comparison
     */
    normalizeText(text) {
        if (!text || typeof text !== "string") return "";
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * Tokenize text into words, preserving order
     */
    tokenize(text, removeStopWords = false) {
        const normalized = this.normalizeText(text);
        if (!normalized) return [];
        const tokens = normalized.split(" ").filter(w => w.length > 0);
        if (removeStopWords) {
            return tokens.filter(t => !STOP_WORDS.has(t));
        }
        return tokens;
    }

    /**
     * Generate N-grams from tokens
     */
    generateNGrams(tokens, n = 3) {
        if (!tokens || tokens.length < n) return [];
        const ngrams = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            ngrams.push(tokens.slice(i, i + n).join(" "));
        }
        return ngrams;
    }

    /**
     * Calculate Token Jaccard Similarity
     */
    calculateTokenSimilarity(tokensA, tokensB) {
        if (!tokensA.length || !tokensB.length) return 0;
        const setA = new Set(tokensA);
        const setB = new Set(tokensB);
        let intersection = 0;
        for (const token of setA) {
            if (setB.has(token)) intersection++;
        }
        const containmentA = intersection / setA.size;
        const jaccard = intersection / new Set([...setA, ...setB]).size;
        const sim = (containmentA * 0.6 + jaccard * 0.4) * 100;
        return Math.round(Math.min(100, sim));
    }

    /**
     * Calculate N-gram Jaccard Similarity
     */
    calculateNGramSimilarity(ngramsA, ngramsB) {
        if (!ngramsA.length || !ngramsB.length) return 0;
        const setA = new Set(ngramsA);
        const setB = new Set(ngramsB);
        let intersection = 0;
        for (const ng of setA) {
            if (setB.has(ng)) intersection++;
        }
        const union = new Set([...setA, ...setB]).size;
        return union === 0 ? 0 : Math.round((intersection / union) * 100);
    }

    /**
     * Detect overlapping phrases between target text and candidate text
     */
    extractMatchingPhrases(textA, textB, minWords = MIN_MATCHED_PHRASE_WORDS) {
        const tokensA = this.tokenize(textA, false);
        const tokensB = this.tokenize(textB, false);
        if (tokensA.length < minWords || tokensB.length < minWords) return [];

        const ngramsB = new Set(this.generateNGrams(tokensB, minWords));
        const matchedPhrases = [];
        let i = 0;

        while (i <= tokensA.length - minWords) {
            const currentWindow = tokensA.slice(i, i + minWords).join(" ");
            if (ngramsB.has(currentWindow)) {
                // Expand phrase forward
                let matchLen = minWords;
                while (i + matchLen <= tokensA.length) {
                    const expanded = tokensA.slice(i, i + matchLen).join(" ");
                    if (textB.toLowerCase().includes(expanded)) {
                        matchLen++;
                    } else {
                        break;
                    }
                }
                const fullMatch = tokensA.slice(i, i + matchLen - 1).join(" ");
                if (fullMatch.split(" ").length >= minWords) {
                    matchedPhrases.push(fullMatch);
                    i += matchLen - 1;
                    continue;
                }
            }
            i++;
        }

        // Filter duplicates and substrings
        return Array.from(new Set(matchedPhrases));
    }

    /**
     * Categorize similarity percentage
     */
    categorizeSimilarity(pct) {
        if (pct < 15) return "low";
        if (pct < 30) return "moderate";
        if (pct < 50) return "high";
        return "very_high";
    }

    /**
     * Compare a single target submission text against an array of peer submission texts
     */
    analyzeSubmissionText(target, peers) {
        if (!target || !target.text || !target.text.trim()) {
            return {
                status: "completed",
                overallSimilarityPercent: 0,
                exactMatchPercent: 0,
                phraseMatchPercent: 0,
                tokenSimilarityPercent: 0,
                confidence: "high",
                category: "low",
                matchedSubmissions: [],
                matchedSegments: [],
                analyzedWordCount: 0
            };
        }

        const normTarget = this.normalizeText(target.text);
        const tokensTarget = this.tokenize(target.text, false);
        const tokensNoStopTarget = this.tokenize(target.text, true);
        const ngramsTarget = this.generateNGrams(tokensTarget, 3);
        const wordCount = tokensTarget.length;

        let maxSimilarity = 0;
        let exactMatch = 0;
        let highestPhraseMatch = 0;
        let highestTokenSim = 0;
        const matchedSubmissions = [];
        const matchedSegments = [];

        for (const peer of peers) {
            if (!peer.text || !peer.text.trim()) continue;
            // Exclude self
            if (peer.studentId && target.studentId && peer.studentId.toString() === target.studentId.toString()) {
                continue;
            }

            const normPeer = this.normalizeText(peer.text);
            const tokensPeer = this.tokenize(peer.text, false);
            const tokensNoStopPeer = this.tokenize(peer.text, true);
            const ngramsPeer = this.generateNGrams(tokensPeer, 3);

            // 1. Exact Duplicate Check
            if (normTarget === normPeer && normTarget.length > 20) {
                exactMatch = 100;
                maxSimilarity = 100;
                matchedSubmissions.push({
                    submissionId: peer.submissionId,
                    studentId: peer.studentId,
                    studentName: peer.studentName || "Peer Student",
                    similarityPercent: 100,
                    matchedPhrasesCount: 1
                });
                matchedSegments.push({
                    text: target.text.slice(0, 300),
                    sourceSubmissionId: peer.submissionId,
                    sourceStudentName: peer.studentName || "Peer Student",
                    sourcePhrase: peer.text.slice(0, 300),
                    length: wordCount,
                    similarityScore: 100
                });
                continue;
            }

            // 2. Token & N-Gram Similarities
            const tokenSim = this.calculateTokenSimilarity(tokensNoStopTarget, tokensNoStopPeer);
            const ngramSim = this.calculateNGramSimilarity(ngramsTarget, ngramsPeer);

            // 3. Phrase Overlap
            const matchingPhrases = this.extractMatchingPhrases(target.text, peer.text, MIN_MATCHED_PHRASE_WORDS);
            const matchedWordsCount = matchingPhrases.reduce((acc, p) => acc + p.split(" ").length, 0);
            const phraseMatchPct = wordCount > 0 ? Math.min(100, Math.round((matchedWordsCount / wordCount) * 100)) : 0;

            // Combined Weighted Similarity Score
            const combinedScore = Math.min(100, Math.round(
                (tokenSim * 0.40) + (ngramSim * 0.35) + (phraseMatchPct * 0.25)
            ));

            if (combinedScore > 5 || matchingPhrases.length > 0) {
                matchedSubmissions.push({
                    submissionId: peer.submissionId,
                    studentId: peer.studentId,
                    studentName: peer.studentName || "Peer Student",
                    similarityPercent: combinedScore,
                    matchedPhrasesCount: matchingPhrases.length
                });

                matchingPhrases.forEach(phrase => {
                    matchedSegments.push({
                        text: phrase,
                        sourceSubmissionId: peer.submissionId,
                        sourceStudentName: peer.studentName || "Peer Student",
                        sourcePhrase: phrase,
                        length: phrase.split(" ").length,
                        similarityScore: combinedScore
                    });
                });
            }

            if (combinedScore > maxSimilarity) maxSimilarity = combinedScore;
            if (phraseMatchPct > highestPhraseMatch) highestPhraseMatch = phraseMatchPct;
            if (tokenSim > highestTokenSim) highestTokenSim = tokenSim;
        }

        // Sort matches descending by similarity
        matchedSubmissions.sort((a, b) => b.similarityPercent - a.similarityPercent);

        return {
            status: "completed",
            overallSimilarityPercent: maxSimilarity,
            exactMatchPercent: exactMatch,
            phraseMatchPercent: highestPhraseMatch,
            tokenSimilarityPercent: highestTokenSim,
            confidence: wordCount > 30 ? "high" : "medium",
            category: this.categorizeSimilarity(maxSimilarity),
            matchedSubmissions,
            matchedSegments: matchedSegments.slice(0, 50),
            analyzedWordCount: wordCount
        };
    }
}

module.exports = new PlagiarismService();
