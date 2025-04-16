// src/google.d.ts

// Define the structure of the object returned by Google Sign-In callback
interface GoogleCredentialResponse {
  credential?: string; // Contains the ID token JWT string
  select_by?: 'auto' | 'user' | 'user_1tap' | 'user_2tap' | 'btn' | 'btn_confirm' | 'btn_add_session' | 'btn_confirm_add_session';
  // Include other potential fields from Google's response if needed
}

// Define the structure of the Google Identity Services ID client library
interface GoogleAccountsId {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    // Add other initialization options as needed based on Google's documentation
  }) => void;

  renderButton: (
    parent: HTMLElement,
    options: {
        type?: 'standard' | 'icon';
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: string; // e.g., '250px'
        locale?: string;
        click_listener?: () => void;
        // Add other button customization options based on Google's documentation
    }
  ) => void;

  prompt: (momentNotification?: (notification: any) => void) => void;

  cancel: () => void;

  disableAutoSelect: () => void;

  storeCredential: (credential: string, callback?: () => void) => void;

  revoke: (identifier: string, callback?: (response: { successful: boolean; error?: any }) => void) => void;

  // Add other methods if you use them, e.g., intermediate_iframe_close_callback, etc.
}

// Define the structure for google.accounts
interface GoogleAccounts {
  id: GoogleAccountsId;
  // You might add other services here like 'oauth2' if you use them
}

// Extend the global Window interface
declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
      // You might add other top-level Google objects if needed
    };
  }
}

// Adding this empty export makes the file a module according to TypeScript standards,
// ensuring the declare global works correctly.
export {}; 