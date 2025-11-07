import type { User } from '@firebase/auth-types';
import { auth } from './config';

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

export const registerWithEmail = async (email: string, password: string) => {
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const logoutUser = async () => {
  try {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
