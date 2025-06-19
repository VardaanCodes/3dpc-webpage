import { 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./queryClient";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  hd: 'smail.iitm.ac.in' // Domain restriction
});

export function signInWithGoogle() {
  return signInWithRedirect(auth, provider).catch(error => {
    console.error("Sign in error:", error);
    throw error;
  });
}

export function logout() {
  return signOut(auth);
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      // Register or update user in our system
      await registerUser(result.user);
    }
    return result;
  } catch (error) {
    console.error("Auth redirect error:", error);
    throw error;
  }
}

export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerUser(firebaseUser: FirebaseUser) {
  try {
    console.log("Registering user:", firebaseUser.email);
    
    // Extract domain from email
    const emailDomain = firebaseUser.email?.split('@')[1];
    if (emailDomain !== 'smail.iitm.ac.in') {
      throw new Error('Only @smail.iitm.ac.in email addresses are allowed');
    }

    const userData = {
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      photoURL: firebaseUser.photoURL,
      role: 'student',
    };

    console.log("Sending registration data:", userData);
    const response = await apiRequest('POST', '/api/user/register', userData);
    const user = await response.json();
    console.log("Registration successful:", user);
    return user;
  } catch (error) {
    console.error("User registration error:", error);
    throw error;
  }
}
