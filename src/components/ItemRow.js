import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

const ItemRow = ({ item, onToggleCrossOff, onDelete, onRename }) => {
  const swipeableRef = useRef(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingName, setEditingName] = useState('');

  const handleToggle = () => {
    onToggleCrossOff(item.id, item.crossedOff);
  };

  const handleOpenEdit = () => {
    setEditingName(item.name);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== item.name) {
      const success = await onRename(item.id, trimmed);
      if (success === false) {
        const msg = `"${trimmed}" was not added since it already exists in the list.`;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Duplicate Item', msg);
        return;
      }
    }
    setEditModalVisible(false);
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
        onDelete(item.id);
      }
      return;
    }

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={handleDelete}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const isWeb = Platform.OS === 'web';

  const row = (
    <TouchableOpacity
      style={[styles.container, item.crossedOff && styles.crossedOff]}
      onPress={handleToggle}
      activeOpacity={0.7}
    >
      <View style={styles.checkbox}>
        {item.crossedOff && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.content}>
        <TouchableOpacity onPress={handleOpenEdit}>
          <Text style={[styles.name, item.crossedOff && styles.crossedOffText]}>
            {item.name}
          </Text>
        </TouchableOpacity>
        <Text style={styles.category}>{item.category}</Text>
      </View>
      {isWeb && (
        <TouchableOpacity
          style={styles.webDeleteButton}
          onPress={handleDelete}
          accessibilityLabel={`Delete ${item.name}`}
        >
          <Text style={styles.webDeleteText}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {isWeb ? (
        row
      ) : (
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          rightThreshold={40}
        >
          {row}
        </Swipeable>
      )}

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Edit Item</Text>
            <TextInput
              style={styles.modalInput}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              onSubmitEditing={handleSaveEdit}
            />
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveEdit}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  crossedOff: {
    backgroundColor: '#e8e8e8',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#29AB87',
    borderRadius: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#29AB87',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  crossedOffText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  category: {
    fontSize: 12,
    color: '#888',
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
  modalSaveButton: {
    backgroundColor: '#29AB87',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSaveText: {
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
  deleteAction: {
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  webDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  webDeleteText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default ItemRow;
