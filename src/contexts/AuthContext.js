import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingInvitation, setPendingInvitation] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserData(firebaseUser);
      } else {
        setUser(null);
        setUserData(null);
        setPendingInvitation(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadUserData = async (firebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);

        // Check for pending invitations if user doesn't have a list yet
        if (!data.listId) {
          await checkPendingInvitations(firebaseUser.email);
        }
      } else {
        // New user - check for invitations first
        await checkPendingInvitations(firebaseUser.email);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkPendingInvitations = async (email) => {
    try {
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('invitedEmail', '==', email.toLowerCase()),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(invitationsQuery);

      if (!snapshot.empty) {
        const invitation = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
        setPendingInvitation(invitation);
      }
    } catch (error) {
      console.error('Error checking invitations:', error);
    }
  };

  const signIn = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const signUp = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;

    // Create user document
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0],
      listId: null,
      createdAt: serverTimestamp(),
    });

    // Check for pending invitations
    await checkPendingInvitations(email);

    return firebaseUser;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const createNewList = async () => {
    if (!user) return null;

    try {
      // Create a new list
      const listRef = doc(collection(db, 'lists'));
      await setDoc(listRef, {
        ownerId: user.uid,
        members: [user.uid],
        memberEmails: [user.email.toLowerCase()],
        createdAt: serverTimestamp(),
      });

      // Update user with list ID
      await updateDoc(doc(db, 'users', user.uid), {
        listId: listRef.id,
      });

      setUserData((prev) => ({ ...prev, listId: listRef.id }));

      return listRef.id;
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  };

  const acceptInvitation = async () => {
    if (!user || !pendingInvitation) return;

    try {
      const { listId, id: invitationId } = pendingInvitation;

      // Update invitation status
      await updateDoc(doc(db, 'invitations', invitationId), {
        status: 'accepted',
      });

      // Add user to list
      await updateDoc(doc(db, 'lists', listId), {
        members: arrayUnion(user.uid),
        memberEmails: arrayUnion(user.email.toLowerCase()),
      });

      // Update or create user document with list ID
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        await updateDoc(userRef, { listId });
      } else {
        await setDoc(userRef, {
          email: user.email.toLowerCase(),
          displayName: user.displayName || user.email.split('@')[0],
          listId,
          createdAt: serverTimestamp(),
        });
      }

      setUserData((prev) => ({ ...prev, listId }));
      setPendingInvitation(null);

      return listId;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  };

  const declineInvitation = async () => {
    if (!pendingInvitation) return;

    try {
      await updateDoc(doc(db, 'invitations', pendingInvitation.id), {
        status: 'declined',
      });
      setPendingInvitation(null);
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    pendingInvitation,
    signIn,
    signUp,
    signOut,
    createNewList,
    acceptInvitation,
    declineInvitation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
