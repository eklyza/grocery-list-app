import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

const ItemRow = ({ item, onToggleCrossOff, onDelete }) => {
  const swipeableRef = useRef(null);

  const handleToggle = () => {
    onToggleCrossOff(item.id, item.crossedOff);
  };

  const handleDelete = () => {
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

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={[styles.container, item.crossedOff && styles.crossedOff]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.checkbox}>
          {item.crossedOff && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.content}>
          <Text
            style={[
              styles.name,
              item.crossedOff && styles.crossedOffText,
            ]}
          >
            {item.name}
          </Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
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
    backgroundColor: '#f9f9f9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#4CAF50',
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
});

export default ItemRow;
