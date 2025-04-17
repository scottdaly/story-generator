import { useState } from 'react'; // Import useState
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../context/AuthContext'; // Import useAuth
import GoogleSignInButton from '../components/GoogleSignInButton'; // Import the button

// Define a mapping from genre names to image paths
const genreImages: { [key: string]: string } = {
    Fantasy: '/images/fantasy.png',
    Horror: '/images/horror.png',
    Romance: '/images/romance.png',
    'Sci-Fi': '/images/scifi.png', // Use 'Sci-Fi' as the key
    Mystery: '/images/mystery.png',
    Apocalyptic: '/images/apocalyptic.png' // Added Apocalyptic
};

// Define a mapping from genre names to background colors
const genreColors: { [key: string]: string } = {
    Fantasy: 'bg-[#5E4321]',
    Horror: 'bg-[#323130]',
    Romance: 'bg-[#44272B]',
    'Sci-Fi': 'bg-[#22333C]',
    Mystery: 'bg-[#233423]',
    Apocalyptic: 'bg-[#2F2430]' // Added Apocalyptic color
};

// Define a mapping from genre names to descriptions
const genreDescriptions: { [key: string]: string } = {
    Fantasy: 'Magic and mythical creatures',
    Horror: 'Fear, suspense, and horror',
    Romance: 'Fall in love',
    'Sci-Fi': 'Explore the future',
    Mystery: 'Put together the clues',
    Apocalyptic: 'Survive the apocalypse'
};

// Genres array remains the same
const genres = ['Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Mystery', 'Apocalyptic']; // Added Apocalyptic

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

  // Specific handler for modal login success
  const handleModalLoginSuccess = async (response: any) => {
    console.log('[Home Modal] Google Credential Response Received:');
    if (response.credential) {
      await login(response.credential);
      setShowModal(false); // Close modal on successful login
      // Optionally navigate immediately, or let the user click the genre again
      // navigate(`/play?genre=YOUR_LAST_CLICKED_GENRE`); // Needs state to store last clicked genre
    } else {
      console.error('[Home Modal] Google Sign-In failed: No credential received.');
      // Maybe show an error message within the modal
    }
  };

  return (
    <div className="flex flex-col items-center text-zinc-900">
      <h1 className="text-6xl font-bold mb-8 lora-bold">Choose Your Genre</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl"> {/* Increased gap and max-width */}
        {genres.map((genre) => (
          <button // Changed from div to button for better accessibility/semantics
            key={genre}
            onClick={() => handleGenreClick(genre)}
            // Dynamically added background color from genreColors
            className={`relative cursor-pointer group rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-2 noise-background ${genreColors[genre] || 'bg-gray-800 hover:bg-gray-700'}`}
            disabled={isLoading} // Disable button while checking auth status
          >
            <img 
              src={genreImages[genre]} 
              alt={genre} 
              className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-80" 
            />
            <div className="absolute inset-x-0 bottom-12 p-4 flex items-end justify-center h-1/4">
              <div className="flex flex-col items-center">
              <h3 className="text-[#DDD09D] text-2xl font-bold text-center tracking-wide uppercase lora-bold"> 
                {genre == 'Sci-Fi' ? 'Science Fiction' : genre}
              </h3>
              <p className="text-sm text-center text-[#C6B273]">
                {genreDescriptions[genre]}
              </p>
            </div>
            </div>
            {/* Optional: Add a subtle overlay on hover */} 
             <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        ))}
      </div>

      {/* Login Prompt Modal */} 
      {showModal && (
        <div 
            className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50"
            onClick={() => setShowModal(false)} // Close modal on backdrop click
        >
          <div 
              className="relative bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <button 
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-semibold p-1 leading-none"
                aria-label="Close modal"
            >
                &times;
            </button>
            
            <h3 className="text-xl font-semibold mb-4 mt-4">Authentication Required</h3>
            <p className="text-gray-700 mb-6">
              Please sign in with Google to start your adventure.
            </p>
            
            <div className="flex justify-center mb-4">
                 {isGoogleScriptLoaded ? (
                    <GoogleSignInButton
                        clientId={googleClientId}
                        onSuccess={handleModalLoginSuccess}
                        isScriptLoaded={isGoogleScriptLoaded}
                    />
                 ) : (
                    <p className="text-gray-500">Loading Google Sign-In...</p>
                 )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home; 