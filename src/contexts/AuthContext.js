import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
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
  deleteDoc,
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
        let data = userDoc.data();

        // Migrate legacy listId (string) to listIds (array)
        if (data.listId && !data.listIds) {
          data = { ...data, listIds: [data.listId] };
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            listIds: [data.listId],
          });
        }

        setUserData(data);

        await checkPendingInvitations(firebaseUser.email);
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
      listIds: [],
      createdAt: serverTimestamp(),
    });

    // Check for pending invitations
    await checkPendingInvitations(email);

    return firebaseUser;
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const createNewList = async (name) => {
    if (!user) return null;

    try {
      const listRef = doc(collection(db, 'lists'));
      await setDoc(listRef, {
        name,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      setUserData((prev) => ({
        ...prev,
        listIds: [...(prev?.listIds || []), listRef.id],
      }));

      return listRef.id;
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  };

  const renameList = async (listId, newName) => {
    try {
      await updateDoc(doc(db, 'lists', listId), { name: newName });
    } catch (error) {
      console.error('Error renaming list:', error);
      throw error;
    }
  };

  const deleteList = async (listId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'lists', listId));
    } catch (error) {
      console.error('Error deleting list:', error);
      throw error;
    }
  };

  const acceptInvitation = async () => {
    if (!user || !pendingInvitation) return;

    try {
      const { listId, invitedBy: inviterUid, id: invitationId } = pendingInvitation;

      // Update invitation status
      await updateDoc(doc(db, 'invitations', invitationId), {
        status: 'accepted',
      });

      // Get all lists the inviter is a member of
      const inviterListsSnapshot = await getDocs(
        query(collection(db, 'lists'), where('members', 'array-contains', inviterUid))
      );

      // Get the inviter's email from their user doc
      const inviterUserDoc = await getDoc(doc(db, 'users', inviterUid));
      const inviterEmail = inviterUserDoc.data()?.email || '';

      // Add invitee to all of the inviter's lists
      await Promise.all(
        inviterListsSnapshot.docs.map((d) =>
          updateDoc(d.ref, {
            members: arrayUnion(user.uid),
            memberEmails: arrayUnion(user.email.toLowerCase()),
          })
        )
      );

      // Get all lists the invitee already has
      const myListsSnapshot = await getDocs(
        query(collection(db, 'lists'), where('members', 'array-contains', user.uid))
      );

      // Add inviter to all of the invitee's existing lists
      if (myListsSnapshot.docs.length > 0) {
        await Promise.all(
          myListsSnapshot.docs.map((d) =>
            updateDoc(d.ref, {
              members: arrayUnion(inviterUid),
              memberEmails: arrayUnion(inviterEmail),
            })
          )
        );
      }

      // Update or create invitee's user document
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const inviterListIds = inviterListsSnapshot.docs.map((d) => d.id);

      if (userDoc.exists()) {
        if (inviterListIds.length > 0) {
          await updateDoc(userRef, { listIds: arrayUnion(...inviterListIds) });
        }
      } else {
        await setDoc(userRef, {
          email: user.email.toLowerCase(),
          displayName: user.displayName || user.email.split('@')[0],
          listIds: inviterListIds,
          createdAt: serverTimestamp(),
        });
      }

      // Update inviter's user doc with the invitee's list IDs
      const myListIds = myListsSnapshot.docs.map((d) => d.id);
      if (myListIds.length > 0) {
        await updateDoc(doc(db, 'users', inviterUid), {
          listIds: arrayUnion(...myListIds),
        });
      }

      setUserData((prev) => ({
        ...prev,
        listIds: [...new Set([...(prev?.listIds || []), ...inviterListIds])],
      }));
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
    resetPassword,
    createNewList,
    renameList,
    deleteList,
    acceptInvitation,
    declineInvitation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
