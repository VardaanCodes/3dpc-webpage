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
  hd: 'college.edu' // Domain restriction
});

export function signInWithGoogle() {
  signInWithRedirect(auth, provider);
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
    // Extract domain from email
    const emailDomain = firebaseUser.email?.split('@')[1];
    if (emailDomain !== 'college.edu') {
      throw new Error('Only @college.edu email addresses are allowed');
    }

    const userData = {
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      photoURL: firebaseUser.photoURL,
      role: 'student',
    };

    const response = await apiRequest('POST', '/api/user/register', userData);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error("User registration error:", error);
    throw error;
  }
}
