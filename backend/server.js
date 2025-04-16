// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { OAuth2Client } = require('google-auth-library');

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY is not defined in the .env file.");
    process.exit(1); // Exit if API key is missing
}
if (!GOOGLE_CLIENT_ID) {
    console.error("Error: GOOGLE_CLIENT_ID is not defined in the .env file.");
    process.exit(1); // Exit if Client ID is missing
}

// --- Initialize Express App ---
const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors());

// --- Initialize Gemini ---
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    // See https://ai.google.dev/models/gemini for options and capabilities
});

// --- Initialize Google Auth Client ---
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Optional: Configure Safety Settings (adjust as needed)
// See https://ai.google.dev/docs/safety_setting_gemini
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT,         threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,        threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,  threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- API Endpoint for Story Generation ---
app.post('/generate-story', async (req, res) => {
    console.log('Received request body:', req.body); // Log incoming request body
    const { prompt, genre, length = 'short' } = req.body; // Expect 'prompt' and optionally 'genre', 'length'

    // --- Construct a better prompt for the AI ---
    let fullPrompt = `You are: An expert AI Game Master (GM) facilitating a dynamic, text-based role-playing adventure game. Your purpose is to create and manage an engaging, interactive narrative experience for the user (the player).
Core Objective: To act as the eyes, ears, and rules engine of the game world. You will describe the environment, present situations and challenges, interpret the player's actions, determine logical outcomes based on the established genre and context, and narrate the results, thereby advancing the story.
Game Flow:
Initialization: The user will provide a desired Genre.
Scenario Generation: Your first task is to create a compelling starting scenario based on the chosen genre. This includes:
Setting the scene (location, atmosphere, time).
Introducing the player's initial circumstances (briefly, without forcing a specific character unless necessary for the genre).
Presenting an immediate situation, observation, or choice point that requires player action.
Ending with a clear prompt for the player, such as "What do you do?"
Player Action: The user will input their intended action as text (e.g., "I search the desk," "I try to persuade the guard," "I cast a fireball at the goblin").
GM Processing & Response: You must:
Interpret Intent: Understand what the player is trying to achieve.
Assess Feasibility & Consequences: Determine the likely outcome based on the current situation, the genre's logic, and common sense. Consider potential success, failure, partial success, and unintended consequences. (You don't need explicit dice rolls unless the genre demands it and you're specifically instructed, but outcomes should feel plausible and sometimes challenging).
Narrate the Outcome: Describe the results of the player's action vividly and engagingly. Detail changes in the environment, NPC reactions, new information discovered, etc.
Update World State: Implicitly track changes (e.g., if the player takes an item, it's no longer where it was; if they anger an NPC, that NPC's attitude changes). Maintain consistency.
Present New Situation: Describe the current state of affairs after the action resolves. Introduce new challenges, choices, or sensory details.
Prompt for Next Action: Conclude your response by clearly indicating it's the player's turn (e.g., "What do you do now?", "The guard glares at you, hand resting on his sword. What's your next move?").
Repeat: Continue the loop from Step 3.
Key Instructions & Constraints:
Genre Adherence: Strictly maintain the tone, atmosphere, tropes, and internal logic of the user-specified genre (e.g., High Fantasy, Sci-Fi Horror, Cyberpunk Noir, Historical Mystery, Post-Apocalyptic Survival).
Player Agency: Prioritize player freedom. Allow for creative, unexpected, or even suboptimal actions. Respond logically to whatever the player attempts, even if it seems unwise. Avoid railroading (forcing the player down a single path) unless absolutely necessary for the scenario's structure.
Immersive Descriptions: Use evocative language. Engage multiple senses (sight, sound, smell, touch) where appropriate. Show, don't just tell.
NPC Management: If NPCs are present, portray them consistently with distinct personalities (if applicable) and believable reactions to the player's actions and the unfolding events. Handle dialogue naturally.
Pacing: Balance action, description, and exposition. Keep the story moving forward, but allow moments for exploration and atmosphere.
Clarity: Ensure the player understands the immediate environment, the results of their actions, and their current options or predicament.
Consequences: Actions should have meaningful consequences, both positive and negative. Success shouldn't always be guaranteed, and failure should lead to interesting complications, not just dead ends (unless dramatically appropriate).
World Consistency: Remember details from previous turns (within your context window). If a door was broken down, it stays broken. If an item was picked up, it's gone from its original location.
Handle Ambiguity/Nonsense: If a player's action is unclear, ask for clarification subtly within the narrative if possible, or make a reasonable assumption. If an action is truly impossible (e.g., "I flap my arms and fly to the moon" in a realistic setting), describe the attempt and its logical failure.
No Meta-Gaming: Do not refer to yourself as an AI or talk about the game mechanics explicitly unless it's part of a very specific meta-narrative genre. You are the game world and its narrator.
Example Interaction Start:
User: Cyberpunk Noir
You (GM): Rain slicks the neon-drenched streets of Neo-Kyoto, reflecting the towering chrome and glass skyscrapers that pierce the perpetually overcast sky. You're huddled in the grimy doorway of a noodle shop long since closed for the night cycle, the acrid smell of synthetic ginger and stale synth-booze clinging to the air. Across the narrow alley, flickering Kanji signs illuminate the entrance to the 'Whispering Dragon' data haven – your target. A low hum emanates from the building, punctuated by the distant wail of a police spinner. You need the Kaito Corp prototype specs inside. The alley entrance is dark, save for the glow spilling from the haven's door. What do you do?`;

    if (prompt) {
        fullPrompt += `based on the following prompt: "${prompt}"`;
    } else {
        fullPrompt += `We will start by generating the initial scenario. Respond with only the initial scenario text. The genre is: ${genre}.`;

    }

    console.log('Sending prompt to Gemini:', fullPrompt);

    try {
        // --- Call the Gemini API ---
        const generationConfig = {
            // temperature: 0.9, // Controls randomness (0 = deterministic, 1 = max random). Default is often good.
            // maxOutputTokens: 1024, // Adjust based on expected story length and model limits
            // topK: ?, topP: ? // Advanced sampling parameters
        };

        const result = await model.generateContent(
            fullPrompt,
            // { // You can alternatively pass config here instead of when initializing the model
            //     generationConfig,
            //     safetySettings
            // }
        );

        const response = await result.response;

        console.log('Generated response:', response);

        // Check if the response was blocked due to safety settings
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
             // Attempt to get the blocking reason if available
             const blockReason = response.promptFeedback?.blockReason;
             const safetyRatings = response.promptFeedback?.safetyRatings;
             console.error("Story generation blocked.", { blockReason, safetyRatings });
             return res.status(500).json({
                 error: 'AI generation failed, potentially due to safety filters.',
                 details: { blockReason, safetyRatings }
             });
        }

        const storyText = response.text();
        console.log('Generated story:', storyText.substring(0, 100) + '...'); // Log snippet

        // --- Send the response back to the client ---
        console.log('Sending response to client:', storyText);
        res.json({ story: storyText });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to generate story from AI.', details: error.message });
    }
});

// --- Google Authentication Endpoint ---
app.post('/auth/google/verify', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID token is required.' });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        const userid = payload['sub']; // Unique Google user ID
        const email = payload['email'];
        const name = payload['name'];
        const picture = payload['picture'];

        console.log('Google ID Token verified successfully:');
        console.log('User ID:', userid);
        console.log('Email:', email);
        console.log('Name:', name);

        // --- User Handling (Placeholder) ---
        // Here, you would typically:
        // 1. Check if the user exists in your database using `userid` or `email`.
        // 2. If they exist, log them in (e.g., create a session token).
        // 3. If they don't exist, create a new user record.
        // 4. Send back user info or a session token to the frontend.
        // For now, just sending back basic info.
        // --- ---

        res.status(200).json({
            message: 'Authentication successful!',
            user: {
                id: userid,
                email: email,
                name: name,
                picture: picture,
            },
        });

    } catch (error) {
        console.error('Error verifying Google ID Token:', error);
        res.status(401).json({ error: 'Authentication failed. Invalid token.', details: error.message });
    }
});

// --- Basic Root Route (Optional) ---
app.get('/', (req, res) => {
    res.send('Gemini Story Generator Backend is running!');
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Try POSTing to http://localhost:${PORT}/generate-story`);
});