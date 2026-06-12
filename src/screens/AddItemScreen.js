import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';
import AutocompleteInput from '../components/AutocompleteInput';
import CategoryPicker from '../components/CategoryPicker';
import { isDuplicate, findDuplicate } from '../utils/duplicateCheck';

const AddItemScreen = ({ navigation, route }) => {
  const { listId, items = [] } = route.params;
  const { user } = useAuth();
  const completedItems = items.filter((item) => item.crossedOff);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectSuggestion = (suggestion) => {
    setName(suggestion.name);
    setCategory(suggestion.category);
  };

  const handleAddItem = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Check for duplicates
    if (isDuplicate(trimmedName, items)) {
      const duplicate = findDuplicate(trimmedName, items);

      // If the duplicate is crossed off, uncross it and go back
      if (duplicate && duplicate.crossedOff) {
        try {
          await updateDoc(doc(db, 'lists', listId, 'items', duplicate.id), {
            crossedOff: false,
          });
          navigation.goBack();
        } catch (error) {
          console.error('Error uncrossing item:', error);
          Alert.alert('Error', 'Failed to re-add item');
        }
        return;
      }

      Alert.alert(
        'Duplicate Item',
        `"${duplicate?.name || trimmedName}" is already on your list.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'lists', listId, 'items'), {
        name: trimmedName,
        nameLower: trimmedName.toLowerCase(),
        category,
        crossedOff: false,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Item</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Item Name</Text>
          <AutocompleteInput
            value={name}
            onChangeText={setName}
            onSelectSuggestion={handleSelectSuggestion}
            placeholder="Start typing to search..."
            completedItems={completedItems}
          />

          <View style={styles.spacer} />

          <Text style={styles.label}>Category</Text>
          <CategoryPicker
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          <View style={styles.spacer} />

          <TouchableOpacity
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={handleAddItem}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add to List</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  spacer: {
    height: 24,
  },
  addButton: {
    backgroundColor: '#29AB87',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonDisabled: {
    backgroundColor: '#85D4BC',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddItemScreen;
