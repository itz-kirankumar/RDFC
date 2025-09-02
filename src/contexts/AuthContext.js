import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'; // <-- Import onSnapshot
import { auth, db, provider, ADMIN_EMAILS } from '../firebase/config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsubscribeAuth();
    }, []);

    // --- FIX: This new useEffect creates a real-time listener for user data ---
    useEffect(() => {
        if (user) {
            const userRef = doc(db, "users", user.uid);

            // Use onSnapshot for real-time updates. This is the key to the dashboard updating automatically.
            const unsubscribeSnapshot = onSnapshot(userRef, async (userSnap) => {
                if (userSnap.exists()) {
                    setUserData({ uid: user.uid, ...userSnap.data() });
                } else {
                    // This block runs only once for a brand new user
                    const newUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        isSubscribed: false,
                        expiryDate: null,
                        isAdmin: ADMIN_EMAILS.includes(user.email),
                        freeTestsTaken: { VARC: false, DILR: false, QA: false },
                        testsAttempted: {}
                    };
                    await setDoc(userRef, newUser);
                    setUserData(newUser);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error listening to user data:", error);
                setLoading(false);
            });

            // This cleanup function will run when the user logs out.
            return () => unsubscribeSnapshot();
        } else {
            // No user is signed in.
            setUserData(null);
            setLoading(false);
        }
    }, [user]); // This effect re-runs only when the user logs in or out.

    const signInWithGoogle = async () => { try { await signInWithPopup(auth, provider); } catch (error) { console.error("Google Sign-In Error: ", error); } };
    const signOut = async () => { try { await firebaseSignOut(auth); } catch (error) { console.error("Sign Out Error: ", error); } };

    return (<AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>);
};

export const useAuth = () => useContext(AuthContext);

