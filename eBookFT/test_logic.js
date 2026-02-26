// test_logic.js
// Simulating the streamGemini parsing logic to ensure it doesn't leak the delimiter

const onChunk = (text) => {
    process.stdout.write(text);
};

let bufferOutput = '';
const onChunkBuffer = (text) => {
    bufferOutput += text;
}

let isContextContext = false;
let finalContext = '';
let slidingWindow = '';

// We simulate receiving these tokens over SSE
const tokens = [
    "Here ", "is ", "the ", "translation ", "of ", "the ", "text.\n\n",
    "It ", "is ", "very ", "good.\n\n",
    "---CONT", "EXT_UPD", "ATE---\n",
    "The ", "hero ", "went ", "to ", "the ", "store."
];

console.log("Simulating streamGemini token parsing...");

for (const t of tokens) {
    if (isContextContext) {
        finalContext += t;
    } else {
        slidingWindow += t;
        const splitMatch = slidingWindow.match(/\n*---CONTEXT_UPDATE---\n*/i);
        if (splitMatch) {
            const idx = splitMatch.index;
            const textPart = slidingWindow.substring(0, idx);
            if (textPart) onChunkBuffer(textPart);
            finalContext += slidingWindow.substring(idx + splitMatch[0].length);
            isContextContext = true;
            slidingWindow = '';
        } else {
            if (slidingWindow.length > 40) {
                const safeToEmit = slidingWindow.substring(0, slidingWindow.length - 40);
                onChunkBuffer(safeToEmit);
                slidingWindow = slidingWindow.substring(slidingWindow.length - 40);
            }
        }
    }
}
if (slidingWindow && !isContextContext) onChunkBuffer(slidingWindow);

console.log("\n--- RESULT ---");
console.log("Output Text:\n" + bufferOutput);
console.log("Context Summary:\n" + finalContext.trim());

if (bufferOutput.includes('---CONTEXT_UPDATE---') || bufferOutput.includes('CONT') || bufferOutput.includes('EXT_UPD')) {
    console.error("\n[FAIL] Delimiter pieces leaked into output text!");
    process.exit(1);
} else {
    console.log("\n[SUCCESS] Delimiter successfully caught across split chunks!");
}
