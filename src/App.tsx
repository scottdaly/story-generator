import React from 'react';
import { Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import CreateCharacter from './pages/CreateCharacter';
import { useAuth } from './context/AuthContext';
import GoogleSignInButton from './components/GoogleSignInButton';

// Helper component to protect routes
const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show a loading indicator while checking auth state
    // You might want a more prominent loading screen
    return <div className="flex justify-center items-center h-screen"><p>Loading authentication...</p></div>;
  }

  if (!user) {
    // Redirect them to the home page, but save the current location they were
    // trying to go to. This allows us to send them back after login,
    // though we are not implementing that redirect-back logic here.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If logged in, render the child route component
  return <Outlet />; // Renders the nested route component (e.g., Play)
};

function App() {
  // Get auth state and login/logout functions from context
  const { user, isLoading, isGoogleScriptLoaded, login, logout } = useAuth();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID; // Get Client ID

  // Simplified handleCredentialResponse - just calls login
  const handleCredentialResponse = async (response: any) => {
    console.log('[App] Google Credential Response Received:');
    if (response.credential) {
      await login(response.credential);
    } else {
      console.error('[App] Google Sign-In failed: No credential received.');
    }
  };

  return (
    <>
      <nav className="bg-[#E1E0D3] p-4">
        <ul className="flex space-x-4 items-center">
          <p className="text-zinc-900 font-bold text-2xl">Story Generator</p>
          <li className="flex-grow"></li> {/* Spacer */} 
          {isLoading ? (
            <li>Loading...</li>
          ) : user ? (
            <li className="flex items-center space-x-2">
              {user.picture && <img src={user.picture} alt="User" className="w-6 h-6 rounded-full" />} 
              <span>{user.name}</span>
              <button onClick={logout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded ml-2">Logout</button>
            </li>
          ) : (
            <li>
              {/* Use the reusable button component */} 
              {isGoogleScriptLoaded ? (
                 <GoogleSignInButton 
                    clientId={googleClientId} 
                    onSuccess={handleCredentialResponse}
                    isScriptLoaded={isGoogleScriptLoaded} // Pass the state
                  />
              ) : (
                  <span>Loading Google Login...</span>
              )}
            </li>
          )}
        </ul>
      </nav>

      

      <div className="bg-[#E1E0D3] min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Protect the /play and /create-character routes */}
          <Route element={<ProtectedRoute />}>
             <Route path="/create-character" element={<CreateCharacter />} />
             <Route path="/play" element={<Play />} />
          </Route>
          {/* Optional: Add a 404 or other routes here */}
        </Routes>
      </div>
    </>
  );
}

export default App;
