import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { GROCERY_ITEMS } from '../data/groceryItems';

const AutocompleteInput = ({
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder = 'Enter item name',
  completedItems = [],
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Build the pool of suggestions: the predefined catalog plus any completed
  // items from this list that the catalog doesn't already include.
  const suggestionPool = useMemo(() => {
    const seen = new Set(GROCERY_ITEMS.map((item) => item.name.toLowerCase()));
    const extras = [];
    completedItems.forEach((item) => {
      if (!item.name) return;
      const key = item.name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      extras.push({ name: item.name, category: item.category || 'Other' });
    });
    return [...GROCERY_ITEMS, ...extras];
  }, [completedItems]);

  const filterSuggestions = useCallback((text) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = text.toLowerCase();
    const filtered = suggestionPool
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 5);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [suggestionPool]);

  const handleChangeText = (text) => {
    onChangeText(text);
    filterSuggestions(text);
  };

  const handleSelectSuggestion = (item) => {
    onChangeText(item.name);
    onSelectSuggestion(item);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (value && value.length >= 2) {
      filterSuggestions(value);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow tap to register
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(item)}
    >
      <Text style={styles.suggestionName}>{item.name}</Text>
      <Text style={styles.suggestionCategory}>{item.category}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCapitalize="words"
        autoCorrect={false}
      />
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={renderSuggestion}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionName: {
    fontSize: 16,
    color: '#333',
  },
  suggestionCategory: {
    fontSize: 12,
    color: '#888',
  },
});

export default AutocompleteInput;
