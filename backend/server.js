// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { OAuth2Client } = require("google-auth-library");
const db = require("./database");

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

let mainPrompt = `You are: An expert AI Game Master (GM) facilitating a dynamic, text-based role-playing adventure game. Your purpose is to create and manage an engaging, interactive narrative experience for the user (the player).

Core Objective: To act as the eyes, ears, and rules engine of the game world. You will interpret player actions, determine outcomes based on the established genre and context, and advance the story. Crucially, your entire response MUST be a single, valid JSON object containing the narrative, an image prompt, suggested actions, and the prompt for the player's next turn.

Required JSON Output Structure:

      
{
  "narrative": "String containing the descriptive text of the current scene, events, and outcomes of the player's last action.",
  "image_prompt": "String containing a concise, descriptive prompt suitable for a text-to-image AI, capturing the essence of the scene described in 'narrative', including genre style keywords.",
  "suggested_actions": [
    "String suggesting a possible action the player could take.",
    "String suggesting another possible action.",
    "String suggesting a third relevant action (can be fewer or more, or an empty list [] if none seem obvious)."
  ]
}

Game Flow:

    Initialization: The user will provide a desired Genre.

    Scenario Generation (First Turn):

        Create a compelling starting scenario based on the chosen genre (setting, situation, initial observation/choice).

        Generate a relevant image prompt reflecting this starting scene and genre style.

        Devise 4 plausible suggested actions for the player's first move.

        Output: Respond with a single JSON object containing the narrative (the starting scene description), the corresponding image_prompt, relevant suggested_actions, and the prompt_for_player (e.g., "What do you do?").

    Player Action: The user will input their intended action as text.

    GM Processing & Response (Subsequent Turns):

        Interpret Intent: Understand the player's goal.

        Assess Feasibility & Consequences: Determine the outcome (success, failure, partial success, complications) based on genre, logic, and current situation.

        Update World State: Implicitly track changes for consistency.

        Generate Narrative: Describe the results of the action and the new situation vividly.

        Generate Image Prompt: Create a new image prompt reflecting the updated scene resulting from the player's action.

        Generate Suggested Actions: Provide a new list of 4 relevant suggested actions based on the current situation. These should be helpful but not exhaustive, encouraging player creativity.

        Output: Respond with a single, valid JSON object containing the updated narrative, the new image_prompt, the new suggested_actions, and the prompt_for_player.

    Repeat: Continue the loop from Step 3.

Key Instructions & Constraints:

    JSON Format Absolutely Mandatory: Your entire output must be only the JSON object described above. Do not include any text before or after the JSON structure. Ensure the JSON is valid (correct quotes, commas, brackets, braces).

    Genre Adherence: Strictly maintain the tone, logic, and visual style of the user-specified genre in the narrative, image_prompt, and the nature of suggested_actions.

    Player Agency: Prioritize player freedom. The suggested_actions are merely hints; players can and should attempt anything they think of. Respond logically to any player action. Avoid railroading.

    Immersive Narrative: Write engaging and descriptive narrative text.

    Consistent Image Prompts: Ensure the image_prompt accurately reflects the key visual elements and mood described in the corresponding narrative for that turn. Include genre/style keywords (e.g., fantasy art, cyberpunk, noir film, photorealistic).

    Relevant Suggestions: The suggested_actions should be contextually relevant and varied (e.g., exploring, interacting, using an item, being cautious).

    World Consistency: Maintain continuity based on previous events (within context limits).

    No Meta-Gaming: Do not refer to yourself as an AI or game mechanics within the narrative or suggested_actions unless explicity asked by the player in a meta-game action. Maintain the GM persona.

    Clarity: Ensure the narrative clearly explains the situation and outcomes. The prompt_for_player should be unambiguous.

Example Interaction Start:

    Genre: Cyberpunk Noir

    You (GM) MUST output EXACTLY this JSON:         
    {
      "narrative": "Rain slicks the neon-drenched streets of Neo-Kyoto, reflecting towering chrome skyscrapers piercing the overcast sky. You're huddled in a grimy noodle shop doorway, the acrid smell of synthetic ginger heavy in the air. Across the narrow alley, flickering Kanji signs mark the 'Whispering Dragon' data haven - your target. A low hum emanates from it. The alley entrance is dark, save for the glow spilling from the haven's door.",
      "image_prompt": "Cyberpunk noir city alleyway at night, heavy rain, wet pavement reflecting neon signs, notably one that says "Whispering Dragon" in Kanji, towering skyscrapers background, cinematic lighting, gritty atmosphere.",
      "suggested_actions": [
        "Scan the data haven entrance for security.",
        "Try to sneak across the alley.",
        "Look for an alternative entrance or vantage point.",
        "Investigate the alley entrance for traps or hidden paths."
      ]
    }

Your primary function is to be a reactive storyteller and scene director, packaging the narrative, visual cues (as an image prompt), and interaction prompts into a structured JSON format for easy backend processing, all while adhering to the chosen genre and prioritizing player agency.`;

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
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// --- API Endpoint for Story Generation ---
app.post("/generate-story", async (req, res) => {
  console.log("Received request body:", req.body); // Log incoming request body
  const { prompt, genre, length = "short" } = req.body; // Expect 'prompt' and optionally 'genre', 'length'

  let fullPrompt = mainPrompt;
  if (prompt) {
    fullPrompt += `based on the following prompt: "${prompt}"`;
  } else {
    fullPrompt += `We will start by generating the initial scenario.The genre is: ${genre}.`;
  }

  let attempts = 0;
  const maxAttempts = 3;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log("Sending prompt to Gemini - attempt:", attempts, fullPrompt);
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;

      if (
        !response.candidates ||
        response.candidates.length === 0 ||
        !response.candidates[0].content
      ) {
        const blockReason = response.promptFeedback?.blockReason;
        const safetyRatings = response.promptFeedback?.safetyRatings;
        console.error("Story generation blocked.", {
          blockReason,
          safetyRatings,
        });
        return res.status(500).json({
          error: "AI generation failed, potentially due to safety filters.",
          details: { blockReason, safetyRatings },
        });
      }

      const responseText = response.text();
      console.log("Generated response:", responseText);
      let storyData;
      try {
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
        storyData = JSON.parse(cleanJson);
      } catch (error) {
        console.error(
          `Attempt ${attempts}: Failed to parse Gemini response as JSON:`,
          error
        );
        lastError = error;
        if (attempts < maxAttempts) {
          console.log(`Retrying... (${attempts}/${maxAttempts})`);
          continue;
        }
        return res.status(500).json({
          error: "Failed to parse AI response after multiple attempts",
          details: error.message,
        });
      }

      // Validate the response structure
      if (
        !storyData.narrative ||
        !storyData.image_prompt ||
        !storyData.suggested_actions
      ) {
        console.error(
          `Attempt ${attempts}: Invalid response structure from Gemini:`,
          storyData
        );
        lastError = new Error("Invalid response structure");
        if (attempts < maxAttempts) {
          console.log(`Retrying... (${attempts}/${maxAttempts})`);
          continue;
        }
        return res.status(500).json({
          error: "Invalid response structure from AI after multiple attempts",
          details: "Missing required fields in response",
        });
      }

      // If we get here, we have valid data
      console.log(
        `Successfully generated valid response on attempt ${attempts}`
      );
      return res.json(storyData);
    } catch (error) {
      console.error(`Attempt ${attempts}: Error calling Gemini API:`, error);
      lastError = error;
      if (attempts < maxAttempts) {
        console.log(`Retrying... (${attempts}/${maxAttempts})`);
        continue;
      }
      return res.status(500).json({
        error: "Failed to generate story after multiple attempts",
        details: error.message,
      });
    }
  }
});

// --- API Endpoint for Continuing Story ---
app.post("/continue-story", async (req, res) => {
  console.log("Received continue story request body:", req.body);
  const { prompt, genre, length = "short", previousStory } = req.body;

  // Construct the continuation prompt
  let fullPrompt = mainPrompt;

  fullPrompt += `Previous Story Context:
${previousStory}

Continue the story based on the player's action:
${prompt}

Respond only with the properly formatted JSON object, and nothing else`;

  console.log("Sending continuation prompt to Gemini:", fullPrompt);

  let attempts = 0;
  const maxAttempts = 3;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;

      if (
        !response.candidates ||
        response.candidates.length === 0 ||
        !response.candidates[0].content
      ) {
        const blockReason = response.promptFeedback?.blockReason;
        const safetyRatings = response.promptFeedback?.safetyRatings;
        console.error("Story continuation blocked.", {
          blockReason,
          safetyRatings,
        });
        return res.status(500).json({
          error: "AI generation failed, potentially due to safety filters.",
          details: { blockReason, safetyRatings },
        });
      }

      const responseText = response.text();
      console.log("Generated continuation:", responseText);
      let storyData;
      try {
        // Remove markdown code block markers if present
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
        storyData = JSON.parse(cleanJson);
      } catch (error) {
        console.error(
          `Attempt ${attempts}: Failed to parse Gemini response as JSON:`,
          error
        );
        lastError = error;
        if (attempts < maxAttempts) {
          console.log(`Retrying... (${attempts}/${maxAttempts})`);
          continue;
        }
        return res.status(500).json({
          error: "Failed to parse AI response after multiple attempts",
          details: error.message,
        });
      }

      // Validate the response structure
      if (
        !storyData.narrative ||
        !storyData.image_prompt ||
        !storyData.suggested_actions
      ) {
        console.error(
          `Attempt ${attempts}: Invalid response structure from Gemini:`,
          storyData
        );
        lastError = new Error("Invalid response structure");
        if (attempts < maxAttempts) {
          console.log(`Retrying... (${attempts}/${maxAttempts})`);
          continue;
        }
        return res.status(500).json({
          error: "Invalid response structure from AI after multiple attempts",
          details: "Missing required fields in response",
        });
      }

      // If we get here, we have valid data
      console.log(
        `Successfully generated valid response on attempt ${attempts}`
      );
      return res.json(storyData);
    } catch (error) {
      console.error(`Attempt ${attempts}: Error calling Gemini API:`, error);
      lastError = error;
      if (attempts < maxAttempts) {
        console.log(`Retrying... (${attempts}/${maxAttempts})`);
        continue;
      }
      return res.status(500).json({
        error: "Failed to continue story after multiple attempts",
        details: error.message,
      });
    }
  }
});

// --- Google Authentication Endpoint ---
app.post("/auth/google/verify", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required." });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
    });
    const payload = ticket.getPayload();
    const userid = payload["sub"]; // Unique Google user ID
    const email = payload["email"];
    const name = payload["name"];
    const picture = payload["picture"];

    console.log("Google ID Token verified successfully:");
    console.log("User ID:", userid);
    console.log("Email:", email);
    console.log("Name:", name);

    // --- User Handling (Placeholder) ---
    // Here, you would typically:
    // 1. Check if the user exists in your database using `userid` or `email`.
    // 2. If they exist, log them in (e.g., create a session token).
    // 3. If they don't exist, create a new user record.
    // 4. Send back user info or a session token to the frontend.
    // For now, just sending back basic info.
    // --- ---

    res.status(200).json({
      message: "Authentication successful!",
      user: {
        id: userid,
        email: email,
        name: name,
        picture: picture,
      },
    });
  } catch (error) {
    console.error("Error verifying Google ID Token:", error);
    res.status(401).json({
      error: "Authentication failed. Invalid token.",
      details: error.message,
    });
  }
});

// --- API Endpoint for Saving a Story ---
app.post("/save-story", async (req, res) => {
  try {
    const { user_id, title, genre, content, story_id } = req.body;

    if (!user_id || !content) {
      return res
        .status(400)
        .json({ error: "user_id and content are required" });
    }

    let result;
    if (story_id) {
      // Update existing story
      result = db.updateStory(story_id, user_id, title, genre, content);
    } else {
      // Create new story
      result = db.saveStory(user_id, title, genre, content);
    }

    res.json({
      success: true,
      storyId: result.lastInsertRowid || story_id,
    });
  } catch (error) {
    console.error("Error saving story:", error);
    res.status(500).json({ error: "Failed to save story" });
  }
});

// --- API Endpoint for Getting User's Stories ---
app.get("/stories/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const stories = db.getStories(user_id);
    res.json(stories);
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

// --- API Endpoint for Getting a Single Story ---
app.get("/story/:id/:user_id", async (req, res) => {
  try {
    const { id, user_id } = req.params;
    const story = db.getStory(id, user_id);

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    res.json(story);
  } catch (error) {
    console.error("Error fetching story:", error);
    res.status(500).json({ error: "Failed to fetch story" });
  }
});

// --- API Endpoint for Updating a Story ---
app.put("/story/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, title, genre, content } = req.body;

    if (!user_id || !content) {
      return res
        .status(400)
        .json({ error: "user_id and content are required" });
    }

    const result = db.updateStory(id, user_id, title, genre, content);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Story not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating story:", error);
    res.status(500).json({ error: "Failed to update story" });
  }
});

// --- API Endpoint for Deleting a Story ---
app.delete("/story/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const result = db.deleteStory(id, user_id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Story not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    res.status(500).json({ error: "Failed to delete story" });
  }
});

// --- Basic Root Route (Optional) ---
app.get("/", (req, res) => {
  res.send("Gemini Story Generator Backend is running!");
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Try POSTing to http://localhost:${PORT}/generate-story`);
});
