import React, { useState, useRef, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import Play from "./pages/Play";
import CreateCharacter from "./pages/CreateCharacter";
import { useAuth } from "./context/AuthContext";
import LoginModal from "./components/LoginModal";

// Helper component to protect routes
const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show a loading indicator while checking auth state
    // You might want a more prominent loading screen
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading authentication...</p>
      </div>
    );
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
  const { user, isLoading, isGoogleScriptLoaded, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLoginSuccess = async (response: any) => {
    if (response.credential) {
      await login(response.credential);
      setShowLoginModal(false);
    }
  };

  return (
    <>
      <nav className="bg-[#E1E0D3] py-4 px-8">
        <ul className="flex space-x-4 items-center">
          <p className="text-zinc-900 font-bold text-2xl cormorant-upright-bold">
            EverTale
          </p>
          <li className="flex-grow"></li>
          {isLoading ? (
            <li>Loading...</li>
          ) : user ? (
            <li className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 hover:bg-zinc-600/5 rounded-lg px-3 py-1 transition-colors duration-200"
              >
                {user.picture && (
                  <img
                    src={user.picture}
                    alt="User"
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span>{user.name}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li>
              <button
                onClick={() => setShowLoginModal(true)}
                className="border border-zinc-600/30 hover:border-zinc-600/50 hover:bg-zinc-600/5 text-zinc-900 py-1 px-4 rounded cursor-pointer"
              >
                Sign In
              </button>
            </li>
          )}
        </ul>
      </nav>

      <div className="bg-[#E1E0D3] min-h-[calc(100vh-64px)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/create-character" element={<CreateCharacter />} />
            <Route path="/play" element={<Play />} />
          </Route>
        </Routes>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        isGoogleScriptLoaded={isGoogleScriptLoaded}
        googleClientId={googleClientId}
      />
    </>
  );
}

export default App;
