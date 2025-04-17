import { useState } from "react";
import GoogleSignInButton from "./GoogleSignInButton";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (response: any) => Promise<void>;
  isGoogleScriptLoaded: boolean;
  googleClientId: string;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isGoogleScriptLoaded,
  googleClientId,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-semibold p-1 leading-none"
          aria-label="Close modal"
        >
          &times;
        </button>

        <h3 className="text-xl font-semibold mb-4 mt-4">
          Authentication Required
        </h3>
        <p className="text-gray-700 mb-6">
          Please sign in with Google to start your adventure.
        </p>

        <div className="flex justify-center mb-4">
          {isGoogleScriptLoaded ? (
            <GoogleSignInButton
              clientId={googleClientId}
              onSuccess={onLoginSuccess}
              isScriptLoaded={isGoogleScriptLoaded}
            />
          ) : (
            <p className="text-gray-500">Loading Google Sign-In...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
