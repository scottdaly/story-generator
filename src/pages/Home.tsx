import { useState } from 'react'; // Import useState
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../context/AuthContext'; // Import useAuth
import GoogleSignInButton from '../components/GoogleSignInButton'; // Import the button

function Home() {
  const genres = ['Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Mystery'];
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
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-800 p-4">
      <h1 className="text-4xl font-bold mb-4">Choose Your Adventure Genre</h1>
      <p className="text-lg mb-8">Select a genre below to start your AI-powered story:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => handleGenreClick(genre)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-center transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading} // Disable button while checking auth status
          >
            {genre}
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