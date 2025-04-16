import React, { useRef, useEffect } from 'react';

// Define the props for the component
interface GoogleSignInButtonProps {
  clientId: string | undefined;
  onSuccess: (response: any) => void;
  onError?: () => void; // Optional error callback
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  isScriptLoaded: boolean; // Pass script loaded status as prop
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  clientId,
  onSuccess,
  onError = () => { console.error('Google Sign-In button render/initialization error.'); },
  theme = 'outline',
  size = 'large',
  isScriptLoaded
}) => {
  const buttonDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only attempt to render if the script is loaded, client ID is available, and the div exists
    if (!isScriptLoaded || !clientId || !buttonDiv.current) {
        console.log('[GoogleSignInButton] Skipping render: Script loaded? ', isScriptLoaded, ' ClientID? ', !!clientId, ' Div ready? ', !!buttonDiv.current);
        return;
    }

    console.log('[GoogleSignInButton] Attempting to render...');

    try {
      // Explicit check for TypeScript
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onSuccess, // Use the passed onSuccess callback
        });

        window.google.accounts.id.renderButton(
          buttonDiv.current,
          { theme, size } // Customize button appearance
        );
        console.log('[GoogleSignInButton] Rendered successfully.');
      } else {
        console.error('[GoogleSignInButton] window.google.accounts.id not defined when attempting to render.');
        if (onError) onError();
      }

    } catch (error) {
      console.error('[GoogleSignInButton] Error rendering button:', error);
      if(onError) onError();
    }

    // No cleanup needed for renderButton specifically
    // If using prompt() or initialize() needed cleanup, it would go here

  }, [isScriptLoaded, clientId, onSuccess, onError, theme, size]); // Rerun if props change

  // Render the div that will contain the Google button
  // Show placeholder if script isn't loaded yet
  return (
      <div ref={buttonDiv} style={{ display: isScriptLoaded ? 'block' : 'none' }}>
          {/* Google button will be rendered here by the script */}
      </div>
  );
};

export default GoogleSignInButton; 