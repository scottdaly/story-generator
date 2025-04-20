import { useSearchParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
const API_URL = "http://localhost:3000";

interface CharacterDetails {
  name: string;
  gender: string;
  backstory: string;
}

interface StoryEntry {
  type: "story" | "action";
  content: string;
}

// Interface for the expected save response
interface SaveResponse {
  success: boolean;
  storyId: number;
}

function Play() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const genre = searchParams.get("genre");
  const length = "medium";
  const character = location.state?.character as CharacterDetails | undefined;
  const existingStoryHistory = location.state?.storyHistory as
    | StoryEntry[]
    | undefined;
  // Get the initial story ID from navigation state
  const initialStoryId = location.state?.storyId as number | undefined;
  const { user, isLoading: isAuthLoading } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [storyHistory, setStoryHistory] = useState<StoryEntry[]>(
    existingStoryHistory || []
  );
  // Add state to track the current story's ID
  const [currentStoryId, setCurrentStoryId] = useState<number | undefined>(
    initialStoryId
  );
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (character) {
      console.log("[Play] Received Character:", character);
    } else {
      console.log("[Play] No character details received via navigation state.");
    }
  }, [character]);

  useEffect(() => {
    if (
      !isAuthLoading &&
      user?.id &&
      !existingStoryHistory &&
      storyHistory.length === 0
    ) {
      console.log(
        "[Play useEffect] Conditions met for initial generation. Calling generateStory."
      );
      setIsGenerating(true);
      generateStory("");
    } else {
      console.log("[Play useEffect] Skipping initial generation.", {
        isAuthLoading,
        hasUserId: !!user?.id,
        hasExistingHistory: !!existingStoryHistory,
        storyHistoryLen: storyHistory.length,
      });
    }
  }, [
    isAuthLoading,
    user?.id,
    existingStoryHistory,
    storyHistory.length,
    character,
    genre,
  ]);

  const handleSubmit = async (action: string) => {
    if (!action.trim()) {
      setError("Please enter a story prompt.");
      return;
    }

    // Add user's action to history
    setStoryHistory((prev) => [...prev, { type: "action", content: action }]);

    setIsGenerating(true);
    setError(null);
    setPrompt(""); // Clear the input after adding to history

    console.log("Sending data:", { action, genre, length, character });

    // Pass currentStoryId to generateStory which passes it to saveStory
    await generateStory(action);
  };

  const saveStory = async (content: string) => {
    console.log("SaveStory called. User:", user);
    if (!user || typeof user.id === "undefined" || user.id === null) {
      console.error(
        "SaveStory Error: Cannot save story because user or user.id is missing.",
        { user }
      );
      setError(
        "Cannot save progress: User information is missing. Please try logging in again."
      );
      return;
    }

    if (!content || typeof content !== "string" || content.trim() === "") {
      console.error(
        "SaveStory Error: Cannot save story because content is invalid or empty.",
        { content }
      );
      setError("Cannot save progress: Story content is missing or invalid.");
      return;
    }

    // Construct the payload, including story_id if we have it
    const payload = {
      user_id: user.id,
      title: `My ${genre} Adventure`,
      genre: genre,
      content: content,
      story_id: currentStoryId, // Include currentStoryId (will be undefined for the first save)
    };
    console.log("Saving story with payload:", payload);

    try {
      // Always use POST to the /save-story endpoint
      // The backend logic differentiates create/update based on story_id in the payload
      const response = await fetch(`${API_URL}/save-story`, {
        method: "POST", // Always POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload), // Send the payload with conditional story_id
      });

      if (!response.ok) {
        // Try to get more details from the error response body
        let errorDetails = await response.text(); // Get raw text first
        try {
          errorDetails = JSON.parse(errorDetails); // Try parsing as JSON
        } catch (e) {
          // Keep as text if not JSON
        }
        console.error(
          "Save story failed:",
          response.status,
          response.statusText,
          errorDetails
        );
        throw new Error(
          `Failed to save story: ${response.status} ${response.statusText}`
        );
      }

      const data: SaveResponse = await response.json();
      console.log("Story saved successfully:", data);

      // If it was a new story (implied by currentStoryId being initially undefined)
      // and we received an ID, update the state.
      // Check data.storyId as the backend returns the ID used (new or existing).
      if (!currentStoryId && data.storyId) {
        console.log(`Received new story ID: ${data.storyId}, updating state.`);
        setCurrentStoryId(data.storyId);
      } else if (currentStoryId && data.storyId !== currentStoryId) {
        // Optional: Log if the backend somehow returned a different ID during an update
        console.warn(
          `Backend returned story ID ${data.storyId} during update for story ID ${currentStoryId}`
        );
      }
    } catch (error) {
      console.error("Error saving story:", error);
      setError(
        `Failed to save progress: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const generateStory = async (action: string) => {
    console.log("Generating story...");
    setIsGenerating(true);
    setError(null);

    // Determine if this is the very first generation call for a new story
    const isInitialGeneration =
      storyHistory.length === 0 && !existingStoryHistory;

    let initialPrompt = "";
    if (isInitialGeneration) {
      initialPrompt = `Start a ${genre} story`;
      if (character?.name) {
        initialPrompt += ` for a character named ${character.name}`;
      }
      if (character?.gender) {
        initialPrompt += ` (${character.gender})`;
      }
      initialPrompt += `.`;
      if (character?.backstory) {
        initialPrompt += ` Their backstory is: ${character.backstory}`;
      }
    }

    const requestBody = {
      prompt: isInitialGeneration ? initialPrompt : action,
      genre,
      length,
      character,
      // Pass the *current* story history (before adding the AI response)
      previousStory: storyHistory
        .map((entry) =>
          entry.type === "action" ? `> ${entry.content}` : entry.content
        ) // Reconstruct format for backend
        .join("\n\n"),
    };
    console.log("API Request Body for generation:", requestBody);

    try {
      // Use /generate-story only for the absolute first call
      const endpoint = isInitialGeneration
        ? "/generate-story"
        : "/continue-story";
      console.log(`Calling AI endpoint: ${endpoint}`);
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody), // Send the reconstructed body
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorData = await response.text(); // Get text if JSON parse fails
        }
        const message =
          (typeof errorData === "object" && errorData?.error) ||
          `Error: ${response.status} ${response.statusText}`;
        console.error(
          "Backend Generation Error:",
          errorData || response.statusText
        );
        throw new Error(message);
      }

      const data = await response.json();
      console.log("Received AI response:", data);

      if (data.narrative) {
        const newStoryEntry: StoryEntry = {
          type: "story",
          content: data.narrative,
        };

        // Determine the next full story history *before* setting state
        // Use the current storyHistory state directly here
        const nextStoryHistory = [...storyHistory, newStoryEntry];

        // Update suggested actions immediately based on the AI response
        setSuggestedActions(data.suggested_actions || []);

        // Calculate the complete story string *from the next history state*
        const completeStory = nextStoryHistory
          .map((entry) =>
            entry.type === "action" ? `> ${entry.content}` : entry.content
          )
          .join("\n\n");

        console.log("Content to be saved:", completeStory);

        // Now call saveStory *with the correctly calculated content*
        await saveStory(completeStory);

        // Finally, update the component's state with the new history
        // This will trigger a re-render to show the new narrative
        setStoryHistory(nextStoryHistory);
      } else {
        console.error(
          "Received success status from AI, but no narrative found in data:",
          data
        );
        throw new Error("Received success status, but no story data found.");
      }
    } catch (err: any) {
      console.error("Fetch Error during generation:", err);
      setError(
        err.message ||
          "Failed to connect to the story generator. Is the backend running?"
      );
    } finally {
      setIsGenerating(false);
      console.log("Generation/Save cycle finished.");
    }
  };

  if (isGenerating && storyHistory.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-2">
        <div role="status">
          <svg
            aria-hidden="true"
            className="w-8 h-8 text-gray-300 animate-spin dark:text-gray-300 fill-blue-600"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
          <span className="sr-only">Loading...</span>
        </div>

        <p>Loading initial story...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-64px)] items-center justify-between text-gray-800 py-4">
      {error && (
        <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>
      )}
      <div className="flex flex-col items-center w-full h-full py-6 px-8 overflow-y-auto scrollbar">
        <div className="flex flex-col w-full max-w-3xl">
          {storyHistory.map((entry, index) => (
            <div
              key={index}
              className={`mb-4 ${
                entry.type === "action" ? "text-teal-700" : "text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap">
                {entry.type === "action" && <span>{"\u003E "}</span>}
                {entry.content}
              </p>
            </div>
          ))}

          {isGenerating && <p className="text-gray-600">Generating...</p>}
        </div>
      </div>
      <div className="w-full max-w-3xl px-8 md:px-0 py-2">
        {suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestedActions.map((action, index) => (
              <button
                key={index}
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  handleSubmit(action);
                }}
                className="px-3 py-1.5 border border-teal-800 bg-teal-700 text-white rounded-full hover:bg-teal-600 transition-colors duration-200 text-sm cursor-pointer"
              >
                {action}
              </button>
            ))}
          </div>
        )}
        <div className="flex w-full items-center gap-2 border border-teal-500/40 rounded-lg focus-within:ring-2 focus-within:outline-none focus-within:ring-blue-500 p-2 mb-4">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-2 py-2 resize-none focus:outline-none"
            placeholder="What do you do next?"
            disabled={isGenerating}
          />
          <button
            onClick={() => handleSubmit(prompt)}
            className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out disabled:opacity-50"
            disabled={isGenerating}
          >
            {isGenerating ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Play;
