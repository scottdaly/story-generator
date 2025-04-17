import { useSearchParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
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

function Play() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const genre = searchParams.get("genre");
  const length = "medium";
  const character = location.state?.character as CharacterDetails | undefined;

  const [prompt, setPrompt] = useState("");
  const [storyHistory, setStoryHistory] = useState<StoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (character) {
      console.log("[Play] Received Character:", character);
    } else {
      console.log("[Play] No character details received via navigation state.");
    }
  }, [character]);

  useEffect(() => {
    if (isLoading && storyHistory.length === 0) {
      generateStory();
    }
  }, [isLoading, storyHistory.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("Please enter a story prompt.");
      return;
    }

    // Add user's action to history
    setStoryHistory((prev) => [...prev, { type: "action", content: prompt }]);

    setIsLoading(true);
    setError(null);
    setPrompt(""); // Clear the input after adding to history

    console.log("Sending data:", { prompt, genre, length, character });

    generateStory();
  };

  const generateStory = async () => {
    console.log("Generating story...");

    let initialPrompt = `Start a ${genre} story`;
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

    const requestBody = {
      prompt: storyHistory.length === 0 ? initialPrompt : prompt,
      genre,
      length,
      character,
    };
    console.log("API Request Body:", requestBody);

    try {
      const endpoint =
        storyHistory.length === 0 ? "/generate-story" : "/continue-story";
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...requestBody,
          previousStory: storyHistory
            .map((entry) => entry.content)
            .join("\n\n"),
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        const message =
          errorData?.error ||
          `Error: ${response.status} ${response.statusText}`;
        console.error("Backend Error:", errorData || response.statusText);
        throw new Error(message);
      }

      const data = await response.json();

      if (data.story) {
        setStoryHistory((prev) => [
          ...prev,
          { type: "story", content: data.story },
        ]);
      } else {
        throw new Error("Received success status, but no story data found.");
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(
        err.message ||
          "Failed to connect to the story generator. Is the backend running?"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && storyHistory.length === 0) {
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
    <div className="flex flex-col items-center justify-center text-gray-800 py-4">
      <h2 className="text-3xl font-bold mb-4">{genre || "Unknown Genre"}</h2>
      {error && (
        <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>
      )}
      <div className="flex flex-col items-center w-full py-6 px-8 mb-4 max-h-[70vh] overflow-y-auto scrollbar">
        <div className="flex flex-col w-full max-w-2xl">
          {storyHistory.map((entry, index) => (
            <div
              key={index}
              className={`mb-4 ${
                entry.type === "action" ? "text-blue-600" : "text-gray-600"
              }`}
            >
              <p className="whitespace-pre-wrap">
                {entry.type === "action" && <span>{"\u003E "}</span>}
                {entry.content}
              </p>
            </div>
          ))}

          {isLoading && <p className="text-gray-600">Generating...</p>}
        </div>
      </div>
      <form className="w-full max-w-2xl px-8" onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 border border-zinc-500/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="What do you do next?"
          rows={3}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="mt-2 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

export default Play;
