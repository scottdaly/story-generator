import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Story {
  id: number;
  title: string;
  genre: string;
  content: string;
  created_at: string;
}

const API_URL = "http://localhost:3000";

function MyStories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      fetchStories();
    }
  }, [user?.id]);

  const fetchStories = async () => {
    try {
      const response = await fetch(`${API_URL}/stories/${user?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch stories");
      }
      const data = await response.json();
      setStories(data);
    } catch (err) {
      setError("Failed to load stories. Please try again later.");
      console.error("Error fetching stories:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleContinueStory = (story: Story) => {
    // Split the content into entries and preserve the type information
    const storyEntries = story.content.split("\n\n").map((content) => {
      // Check if the line starts with "> " to identify user actions
      if (content.startsWith("> ")) {
        return {
          type: "action" as const,
          content: content.substring(2), // Remove the "> " prefix
        };
      } else {
        return {
          type: "story" as const,
          content,
        };
      }
    });

    // Navigate to Play page with the story data
    navigate(`/play?genre=${story.genre}`, {
      state: {
        storyHistory: storyEntries,
        storyId: story.id,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Stories</h1>
      {stories.length === 0 ? (
        <p className="text-gray-600">You haven't created any stories yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
              <p className="text-gray-600 mb-2">Genre: {story.genre}</p>
              <p className="text-sm text-gray-500 mb-4">
                Created: {formatDate(story.created_at)}
              </p>
              <div className="prose max-w-none">
                <p className="text-gray-700 line-clamp-3">{story.content}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleContinueStory(story)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Continue Story
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyStories;
