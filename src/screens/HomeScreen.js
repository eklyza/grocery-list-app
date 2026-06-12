import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = ({ navigation }) => {
  const {
    user,
    pendingInvitation,
    createNewList,
    acceptInvitation,
    declineInvitation,
    signOut,
  } = useAuth();

  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, 'lists'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLists(loaded);
        setLoadingLists(false);
      },
      (error) => {
        console.error('Error loading lists:', error);
        setLoadingLists(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleAcceptInvitation = async () => {
    setProcessingInvitation(true);
    try {
      const listId = await acceptInvitation();
      // Fetch the newly joined list and navigate into it
      const listDoc = await getDoc(doc(db, 'lists', listId));
      const listName = listDoc.exists() ? listDoc.data().name : 'Shared List';
      navigation.navigate('GroceryList', { listId, listName });
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setProcessingInvitation(false);
    }
  };

  const handleDeclineInvitation = async () => {
    setProcessingInvitation(true);
    try {
      await declineInvitation();
    } catch (error) {
      Alert.alert('Error', 'Failed to decline invitation');
    } finally {
      setProcessingInvitation(false);
    }
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a name for the list');
      return;
    }
    setCreating(true);
    try {
      const listId = await createNewList(trimmed);
      setCreateModalVisible(false);
      setNewListName('');
      navigation.navigate('GroceryList', { listId, listName: trimmed });
    } catch (error) {
      Alert.alert('Error', 'Failed to create list');
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        signOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  };

  const renderList = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() =>
        navigation.navigate('GroceryList', {
          listId: item.id,
          listName: item.name || 'Unnamed List',
        })
      }
    >
      <Text style={styles.listItemName}>{item.name || 'Unnamed List'}</Text>
      <Text style={styles.listItemArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Lists</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {pendingInvitation && (
        <View style={styles.inviteBanner}>
          <Text style={styles.inviteTitle}>You've Been Invited!</Text>
          <Text style={styles.inviteSubtitle}>
            You have a pending invitation to join a shared grocery list.
          </Text>
          <View style={styles.inviteButtons}>
            <TouchableOpacity
              style={[styles.inviteButton, styles.acceptButton]}
              onPress={handleAcceptInvitation}
              disabled={processingInvitation}
            >
              {processingInvitation ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inviteButton, styles.declineButton]}
              onPress={handleDeclineInvitation}
              disabled={processingInvitation}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loadingLists ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#29AB87" />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={renderList}
          contentContainerStyle={
            lists.length === 0 && styles.emptyContainer
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No lists yet. Create one below!
            </Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setCreateModalVisible(true)}
      >
        <Text style={styles.createButtonText}>+ Create New List</Text>
      </TouchableOpacity>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCreateModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Name Your List</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor="#999"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              onSubmitEditing={handleCreateList}
            />
            <TouchableOpacity
              style={[styles.modalConfirmButton, creating && styles.modalConfirmButtonDisabled]}
              onPress={handleCreateList}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmText}>Create</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setCreateModalVisible(false);
                setNewListName('');
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#29AB87',
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
  },
  inviteBanner: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#29AB87',
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inviteSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  inviteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#29AB87',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  declineButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listItemArrow: {
    fontSize: 22,
    color: '#bbb',
  },

  createButton: {
    backgroundColor: '#29AB87',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  modalConfirmButton: {
    backgroundColor: '#29AB87',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#85D4BC',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
  },
});

export default HomeScreen;
