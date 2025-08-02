import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, provider, ADMIN_EMAILS } from '../firebase/config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    const userRef = doc(db, "users", firebaseUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const dbUserData = userSnap.data();
                        if (dbUserData.isSubscribed && dbUserData.expiryDate && dbUserData.expiryDate.toDate() < new Date()) {
                            await updateDoc(userRef, { isSubscribed: false });
                            dbUserData.isSubscribed = false;
                        }
                        setUserData(dbUserData);
                    } else {
                        const newUser = {
                            uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL,
                            isSubscribed: false, expiryDate: null, isAdmin: ADMIN_EMAILS.includes(firebaseUser.email),
                            freeTestsTaken: { VARC: false, DILR: false, QA: false },
                            testsAttempted: {}
                        };
                        await setDoc(userRef, newUser);
                        setUserData(newUser);
                    }
                    setUser(firebaseUser);
                } else {
                    setUser(null);
                    setUserData(null);
                }
            } catch (error) {
                console.error("Auth state change error:", error);
                setUser(null);
                setUserData(null);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => { try { await signInWithPopup(auth, provider); } catch (error) { console.error("Google Sign-In Error: ", error); } };
    const signOut = async () => { try { await firebaseSignOut(auth); } catch (error) { console.error("Sign Out Error: ", error); } };

    return (<AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signOut }}>{!loading && children}</AuthContext.Provider>);
};

export const useAuth = () => useContext(AuthContext);
