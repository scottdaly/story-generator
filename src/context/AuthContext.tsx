import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define the shape of the user object
interface User {
  id: string;
  email: string;
  name: string;
  picture?: string; // Optional picture URL
}

// Define the shape of the context data
interface AuthContextType {
  user: User | null;
  isLoading: boolean; // Loading user data / auth status
  isGoogleScriptLoaded: boolean; // Loading the GSI script
  login: (idToken: string) => Promise<void>;
  logout: () => void;
}

// Create the context with a default undefined value initially
// We use undefined to distinguish between "not yet loaded" and "loaded but no user"
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Backend API endpoint for verification
const AUTH_VERIFY_URL = 'http://localhost:3000/auth/google/verify';

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Loading auth status
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);

  // Effect to check for Google script loading
  useEffect(() => {
    console.log('[AuthProvider] Running checkGoogleScript useEffect');
    let checkCount = 0;
    const maxChecks = 25; // ~5 seconds

    const checkGoogleScript = () => {
      checkCount++;
      if (window.google?.accounts?.id) {
        console.log('[AuthProvider] Google script LOADED successfully.');
        setIsGoogleScriptLoaded(true);
      } else if (checkCount < maxChecks) {
        setTimeout(checkGoogleScript, 200);
      } else {
        console.error(`[AuthProvider] Google script failed to load after ${maxChecks} attempts.`);
        // Consider setting an error state if script load failure is critical
      }
    };
    checkGoogleScript();
  }, []);

  // Effect for initial auth check (placeholder)
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (idToken: string) => {
    setIsLoading(true);
    try {
      console.log('Sending ID token to backend for verification...');
      const response = await fetch(AUTH_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Backend verification failed:', data);
        throw new Error(data.error || 'Google sign-in verification failed.');
      }

      console.log('Backend verification successful:', data);
      setUser(data.user); // Set the user state upon successful verification

    } catch (error) {
      console.error('Login Error:', error);
      setUser(null); // Ensure user is null if login fails
      // Optionally re-throw or handle error display to the user
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    console.log('Logging out...');
    setUser(null);
    // Potentially clear any stored tokens/session info here
  };

  // Value object passed to consumers
  const value = {
    user,
    isLoading,
    isGoogleScriptLoaded,
    login,
    logout,
  };

  // Provide the context value to children components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for easily consuming the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 