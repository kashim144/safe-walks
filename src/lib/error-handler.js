import { auth } from '../firebase';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

/**
 * Handles Firestore errors with detailed logging as per security requirements.
 * @param {Error} error The original error
 * @param {string} operationType One of OperationType values
 * @param {string|null} path The Firestore path
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  
  // Provide a user-friendly message based on common error codes
  let userMessage = "An error occurred while accessing the database.";
  if (error.code === 'permission-denied') {
    userMessage = "You don't have permission to perform this action. Please check your account settings.";
  } else if (error.code === 'unavailable') {
    userMessage = "The database is currently unavailable. Please check your internet connection.";
  }
  
  const enhancedError = new Error(JSON.stringify(errInfo));
  enhancedError.userMessage = userMessage;
  enhancedError.code = error.code;
  
  throw enhancedError;
}

/**
 * Handles general API errors.
 * @param {Response} response The fetch response
 * @param {string} context Description of the operation
 */
export async function handleApiError(response, context) {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText };
    }
    
    const message = errorData.message || `Failed to ${context}`;
    console.error(`API Error (${context}):`, message, errorData);
    
    const error = new Error(message);
    error.status = response.status;
    error.userMessage = `We encountered an issue while ${context}. Please try again later.`;
    throw error;
  }
  return response;
}
