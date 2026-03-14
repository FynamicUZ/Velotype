// public/js/trainingDictionary.js

const TRAINING_WORDS = [
    { word: "the", complexity: 1 }, { word: "be", complexity: 1 }, { word: "to", complexity: 1 },
    { word: "of", complexity: 1 }, { word: "and", complexity: 1 }, { word: "a", complexity: 1 },
    { word: "in", complexity: 1 }, { word: "that", complexity: 1 }, { word: "have", complexity: 1 },
    { word: "it", complexity: 1 }, { word: "for", complexity: 1 }, { word: "not", complexity: 1 },
    { word: "on", complexity: 1 }, { word: "with", complexity: 1 }, { word: "he", complexity: 1 },
    { word: "as", complexity: 1 }, { word: "you", complexity: 1 }, { word: "do", complexity: 1 },
    { word: "at", complexity: 1 }, { word: "this", complexity: 1 }, { word: "but", complexity: 2 },
    { word: "his", complexity: 1 }, { word: "by", complexity: 1 }, { word: "from", complexity: 2 },
    { word: "they", complexity: 2 }, { word: "we", complexity: 1 }, { word: "say", complexity: 2 },
    { word: "her", complexity: 1 }, { word: "she", complexity: 1 }, { word: "or", complexity: 1 },
    { word: "an", complexity: 1 }, { word: "will", complexity: 2 }, { word: "my", complexity: 1 },
    { word: "one", complexity: 2 }, { word: "all", complexity: 2 }, { word: "would", complexity: 3 },
    { word: "there", complexity: 2 }, { word: "their", complexity: 2 }, { word: "what", complexity: 2 },
    { word: "so", complexity: 1 }, { word: "up", complexity: 1 }, { word: "out", complexity: 2 },
    { word: "if", complexity: 1 }, { word: "about", complexity: 3 }, { word: "who", complexity: 2 },
    { word: "get", complexity: 2 }, { word: "which", complexity: 3 }, { word: "go", complexity: 1 },
    { word: "me", complexity: 1 }, { word: "when", complexity: 2 }, { word: "make", complexity: 2 },
    { word: "can", complexity: 2 }, { word: "like", complexity: 2 }, { word: "time", complexity: 2 },
    { word: "no", complexity: 1 }, { word: "just", complexity: 2 }, { word: "him", complexity: 2 },
    { word: "know", complexity: 2 }, { word: "take", complexity: 2 }, { word: "people", complexity: 3 },
    { word: "into", complexity: 2 }, { word: "year", complexity: 2 }, { word: "your", complexity: 2 },
    { word: "good", complexity: 2 }, { word: "some", complexity: 2 }, { word: "could", complexity: 3 },
    { word: "them", complexity: 2 }, { word: "see", complexity: 2 }, { word: "other", complexity: 3 },
    { word: "than", complexity: 2 }, { word: "then", complexity: 2 }, { word: "now", complexity: 2 },
    { word: "look", complexity: 2 }, { word: "only", complexity: 2 }, { word: "come", complexity: 2 },
    { word: "its", complexity: 1 }, { word: "over", complexity: 2 }, { word: "think", complexity: 3 },
    { word: "also", complexity: 2 }, { word: "back", complexity: 2 }, { word: "after", complexity: 3 },
    { word: "use", complexity: 2 }, { word: "two", complexity: 2 }, { word: "how", complexity: 2 },
    { word: "our", complexity: 2 }, { word: "work", complexity: 2 }, { word: "first", complexity: 3 },
    { word: "well", complexity: 2 }, { word: "way", complexity: 2 }, { word: "even", complexity: 2 },
    { word: "new", complexity: 2 }, { word: "want", complexity: 2 }, { word: "because", complexity: 4 },
    { word: "any", complexity: 2 }, { word: "these", complexity: 2 }, { word: "give", complexity: 2 },
    { word: "day", complexity: 2 }, { word: "most", complexity: 2 }, { word: "us", complexity: 1 },
    { word: "velotype", complexity: 4 }, { word: "keyboard", complexity: 4 }, { word: "mastery", complexity: 3 },
    { word: "ninja", complexity: 2 }, { word: "shadow", complexity: 3 }, { word: "combat", complexity: 3 }
];

// Shuffle helper
const getShuffledTrainingWords = (count = 50) => {
    return [...TRAINING_WORDS]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
};
