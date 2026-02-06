import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';
import ItemRow from '../components/ItemRow';
import { CATEGORIES } from '../data/categories';

const GroceryListScreen = ({ navigation }) => {
  const {
    user,
    userData,
    pendingInvitation,
    signOut,
    createNewList,
    acceptInvitation,
    declineInvitation,
  } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [processingList, setProcessingList] = useState(false);

  const listId = userData?.listId;

  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }

    const itemsRef = collection(db, 'lists', listId, 'items');
    const q = query(itemsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const itemsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(itemsList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching items:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [listId]);

  const getSectionedItems = () => {
    // Group items by category
    const grouped = {};

    // First add crossed off items to their own section
    const crossedOff = items.filter((item) => item.crossedOff);
    const active = items.filter((item) => !item.crossedOff);

    // Group active items by category
    active.forEach((item) => {
      const category = item.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Sort categories by predefined order
    const sections = CATEGORIES
      .filter((category) => grouped[category]?.length > 0)
      .map((category) => ({
        title: category,
        data: grouped[category],
      }));

    // Add "Other" category for items with unknown categories
    Object.keys(grouped).forEach((category) => {
      if (!CATEGORIES.includes(category)) {
        sections.push({
          title: category,
          data: grouped[category],
        });
      }
    });

    // Add crossed off section at the end
    if (crossedOff.length > 0) {
      sections.push({
        title: 'Completed',
        data: crossedOff,
      });
    }

    return sections;
  };

  const handleToggleCrossOff = async (itemId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'lists', listId, 'items', itemId), {
        crossedOff: !currentStatus,
      });
    } catch (error) {
      console.error('Error toggling item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'lists', listId, 'items', itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  const handleCreateList = async () => {
    setProcessingList(true);
    try {
      await createNewList();
    } catch (error) {
      Alert.alert('Error', 'Failed to create list');
    } finally {
      setProcessingList(false);
    }
  };

  const handleAcceptInvitation = async () => {
    setProcessingList(true);
    try {
      await acceptInvitation();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setProcessingList(false);
    }
  };

  const handleDeclineInvitation = async () => {
    setProcessingList(true);
    try {
      await declineInvitation();
    } catch (error) {
      Alert.alert('Error', 'Failed to decline invitation');
    } finally {
      setProcessingList(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  // Show invitation prompt if user has pending invitation
  if (pendingInvitation) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>You've Been Invited!</Text>
        <Text style={styles.subtitle}>
          You have a pending invitation to join a shared grocery list.
        </Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleAcceptInvitation}
            disabled={processingList}
          >
            {processingList ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Accept Invitation</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleDeclineInvitation}
            disabled={processingList}
          >
            <Text style={styles.secondaryButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show create list prompt if user doesn't have a list
  if (!listId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>
          Create a new grocery list to get started, or wait for an invitation.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreateList}
          disabled={processingList}
        >
          {processingList ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create New List</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signOutLink}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutLinkText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const sections = getSectionedItems();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Grocery List</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your list is empty</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to add items
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onToggleCrossOff={handleToggleCrossOff}
              onDelete={handleDeleteItem}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddItem', { listId, items })}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Invite', { listId });
              }}
            >
              <Text style={styles.menuItemText}>Invite Others</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleSignOut();
              }}
            >
              <Text style={[styles.menuItemText, styles.signOutText]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonGroup: {
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  signOutLink: {
    marginTop: 24,
  },
  signOutLinkText: {
    color: '#888',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  sectionHeader: {
    backgroundColor: '#e8e8e8',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 90,
    marginRight: 16,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  signOutText: {
    color: '#FF5252',
  },
});

export default GroceryListScreen;
