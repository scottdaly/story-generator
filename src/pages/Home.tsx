import { useState } from "react"; // Import useState
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuth } from "../context/AuthContext"; // Import useAuth
import LoginModal from "../components/LoginModal"; // Import LoginModal

// Define a mapping from genre names to image paths
const genreImages: { [key: string]: string } = {
  Fantasy: "/images/fantasy.png",
  Horror: "/images/horror.png",
  Romance: "/images/romance.png",
  "Sci-Fi": "/images/scifi.png", // Use 'Sci-Fi' as the key
  Mystery: "/images/mystery.png",
  Apocalypse: "/images/apocalyptic.png", // Added Apocalypse
};

// Define a mapping from genre names to background colors
const genreColors: { [key: string]: string } = {
  Fantasy: "bg-[#5E4321]",
  Horror: "bg-[#323130]",
  Romance: "bg-[#44272B]",
  "Sci-Fi": "bg-[#22333C]",
  Mystery: "bg-[#233423]",
  Apocalypse: "bg-[#2F2430]", // Added Apocalypse color
};

// Define a mapping from genre names to descriptions
const genreDescriptions: { [key: string]: string } = {
  Fantasy: "Magic and mythical creatures",
  Horror: "Fear, suspense, and horror",
  Romance: "Fall in love",
  "Sci-Fi": "Explore the future",
  Mystery: "Put together the clues",
  Apocalypse: "Survive the apocalypse",
};

// Genres array remains the same
const genres = [
  "Fantasy",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Mystery",
  "Apocalypse",
]; // Added Apocalyptic

function Home() {
  const { user, isLoading, isGoogleScriptLoaded, login } = useAuth(); // Get user and loading state
  const navigate = useNavigate(); // Get navigate function
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID; // Get Client ID

  const handleGenreClick = (genre: string) => {
    if (isLoading) return; // Do nothing if auth state is loading

    if (user) {
      // User is logged in, navigate to the character creation page
      navigate(`/create-character?genre=${genre}`);
    } else {
      // User is not logged in, show the modal
      setShowModal(true);
    }
  };

  const handleLoginSuccess = async (response: any) => {
    if (response.credential) {
      await login(response.credential);
      setShowModal(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 px-8 text-zinc-900">
      <h1 className="text-6xl font-bold mb-8 cormorant-upright-bold text-center md:text-start">
        Choose Your Genre
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {" "}
        {/* Increased gap and max-width */}
        {genres.map((genre) => (
          <button // Changed from div to button for better accessibility/semantics
            key={genre}
            onClick={() => handleGenreClick(genre)}
            // Dynamically added background color from genreColors
            className={`relative cursor-pointer group rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-2 noise-background ${
              genreColors[genre] || "bg-gray-800 hover:bg-gray-700"
            }`}
            disabled={isLoading} // Disable button while checking auth status
          >
            <img
              src={genreImages[genre]}
              alt={genre}
              className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-90"
            />
            <div className="absolute inset-x-0 bottom-10 p-4 flex items-end justify-center h-1/4">
              <div className="flex flex-col items-center">
                <h3 className="text-[#DDD09D] text-4xl font-bold text-center tracking-wide uppercase cormorant-upright-bold">
                  {genre}
                </h3>
                <p className="text-sm text-center text-[#C6B273]">
                  {genreDescriptions[genre]}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <LoginModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onLoginSuccess={handleLoginSuccess}
        isGoogleScriptLoaded={isGoogleScriptLoaded}
        googleClientId={googleClientId}
      />
    </div>
  );
}

export default Home;
