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
  Platform,
  TextInput,
  Share,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';
import ItemRow from '../components/ItemRow';
import AutocompleteInput from '../components/AutocompleteInput';
import CategoryPicker from '../components/CategoryPicker';
import { isDuplicate, findDuplicate } from '../utils/duplicateCheck';
import { CATEGORIES } from '../data/categories';

const GroceryListScreen = ({ navigation, route }) => {
  const { listId, listName: initialListName } = route.params;
  const { user, renameList, deleteList, signOut } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [addingFromSearch, setAddingFromSearch] = useState(false);
  const [listName, setListName] = useState(initialListName || 'My List');
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [editingName, setEditingName] = useState('');

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

  const handleRenameItem = async (itemId, newName) => {
    const otherItems = items.filter((i) => i.id !== itemId);
    if (isDuplicate(newName, otherItems)) {
      return false;
    }
    try {
      await updateDoc(doc(db, 'lists', listId, 'items', itemId), {
        name: newName,
        nameLower: newName.toLowerCase(),
      });
      return true;
    } catch (error) {
      console.error('Error renaming item:', error);
      Alert.alert('Error', 'Failed to rename item');
      return false;
    }
  };

  const handleOpenNameModal = () => {
    setEditingName(listName);
    setNameModalVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    try {
      await renameList(listId, trimmed);
      setListName(trimmed);
      setNameModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to rename list');
    }
  };

  const handleDeleteList = () => {
    const confirm = () => {
      deleteList(listId)
        .then(() => {
          setNameModalVisible(false);
          navigation.goBack();
        })
        .catch(() => Alert.alert('Error', 'Failed to delete list'));
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${listName}"? This cannot be undone.`)) {
        confirm();
      }
    } else {
      Alert.alert('Delete List', `Delete "${listName}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirm },
      ]);
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
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]);
    }
  };

  const handleShareList = async () => {
    const activeItems = items.filter((item) => !item.crossedOff);

    if (activeItems.length === 0) {
      Alert.alert('Nothing to share', 'Your list has no remaining items.');
      return;
    }

    const grouped = {};
    activeItems.forEach((item) => {
      const category = item.category || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item.name);
    });

    const orderedCategories = CATEGORIES.filter((c) => grouped[c]);
    Object.keys(grouped).forEach((c) => {
      if (!CATEGORIES.includes(c)) orderedCategories.push(c);
    });

    let message = `${listName}\n\n`;
    orderedCategories.forEach((category) => {
      message += `${category}:\n`;
      grouped[category].forEach((name) => {
        message += `• ${name}\n`;
      });
      message += '\n';
    });

    try {
      await Share.share({ message: message.trim() });
    } catch (error) {
      Alert.alert('Error', 'Failed to share list');
    }
  };

  const handleSearchSelectSuggestion = (suggestion) => {
    setSearchText(suggestion.name);
    setSearchCategory(suggestion.category);
  };

  const handleAddFromSearch = async () => {
    const trimmedName = searchText.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!searchCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Check for duplicates
    if (isDuplicate(trimmedName, items)) {
      const duplicate = findDuplicate(trimmedName, items);

      // If crossed off, uncross it
      if (duplicate && duplicate.crossedOff) {
        try {
          await updateDoc(doc(db, 'lists', listId, 'items', duplicate.id), {
            crossedOff: false,
          });
          setSearchText('');
          setSearchCategory('');
        } catch (error) {
          console.error('Error uncrossing item:', error);
          Alert.alert('Error', 'Failed to re-add item');
        }
        return;
      }

      const msg = `"${trimmedName}" was not added since it already exists in the list.`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Duplicate Item', msg);
      return;
    }

    setAddingFromSearch(true);
    try {
      await addDoc(collection(db, 'lists', listId, 'items'), {
        name: trimmedName,
        nameLower: trimmedName.toLowerCase(),
        category: searchCategory,
        crossedOff: false,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setSearchText('');
      setSearchCategory('');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setAddingFromSearch(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#29AB87" />
      </View>
    );
  }

  const sections = getSectionedItems();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerNameButton} onPress={handleOpenNameModal}>
          <Text style={styles.headerTitle}>{listName}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AutocompleteInput
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            if (!text.trim()) {
              setSearchCategory('');
            }
          }}
          onSelectSuggestion={handleSearchSelectSuggestion}
          placeholder="Start typing to search"
        />
        {searchText.trim().length > 0 && (
          <View style={styles.searchAddControls}>
            <CategoryPicker
              selectedCategory={searchCategory}
              onSelectCategory={setSearchCategory}
            />
            <TouchableOpacity
              style={[styles.searchAddButton, addingFromSearch && styles.searchAddButtonDisabled]}
              onPress={handleAddFromSearch}
              disabled={addingFromSearch}
            >
              {addingFromSearch ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchAddButtonText}>Add to List</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your list is empty</Text>
          <Text style={styles.emptySubtext}>
            Use the search bar above to add items
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
              onRename={handleRenameItem}
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

      {/* Rename / Delete Modal */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNameModalVisible(false)}
        >
          <TouchableOpacity style={styles.nameModalCard} activeOpacity={1}>
            <Text style={styles.nameModalTitle}>List Name</Text>
            <TextInput
              style={styles.nameModalInput}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity style={styles.nameModalSaveButton} onPress={handleSaveName}>
              <Text style={styles.nameModalSaveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nameModalDeleteButton} onPress={handleDeleteList}>
              <Text style={styles.nameModalDeleteText}>Delete List</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
                handleShareList();
              }}
            >
              <Text style={styles.menuItemText}>Share List</Text>
            </TouchableOpacity>
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
    backgroundColor: '#29AB87',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  backButtonText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
  },
  headerNameButton: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    padding: 8,
    width: 40,
    alignItems: 'flex-end',
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
    backgroundColor: '#29AB87',
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
    backgroundColor: '#d3d3d3',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
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
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  searchAddControls: {
    marginTop: 8,
  },
  searchAddButton: {
    backgroundColor: '#29AB87',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  searchAddButtonDisabled: {
    backgroundColor: '#85D4BC',
  },
  searchAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nameModalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
  },
  nameModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  nameModalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  nameModalSaveButton: {
    backgroundColor: '#29AB87',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  nameModalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nameModalDeleteButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nameModalDeleteText: {
    color: '#FF5252',
    fontSize: 16,
  },
});

export default GroceryListScreen;
