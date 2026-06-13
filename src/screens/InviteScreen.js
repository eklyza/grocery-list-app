import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';

const InviteScreen = ({ navigation, route }) => {
  const { listId } = route.params;
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadListData();
  }, []);

  const loadListData = async () => {
    try {
      // Get list members
      const listDoc = await getDoc(doc(db, 'lists', listId));
      if (listDoc.exists()) {
        setMembers(listDoc.data().memberEmails || []);
      }

      // Get pending invitations
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('listId', '==', listId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(invitationsQuery);
      const invites = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingInvites(invites);
    } catch (error) {
      console.error('Error loading list data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Check if already a member
    if (members.includes(trimmedEmail)) {
      Alert.alert('Error', 'This person is already a member of your list');
      return;
    }

    // Check if already invited
    if (pendingInvites.some((inv) => inv.invitedEmail === trimmedEmail)) {
      Alert.alert('Error', 'This person has already been invited');
      return;
    }

    // Can't invite yourself
    if (trimmedEmail === user.email.toLowerCase()) {
      Alert.alert('Error', "You can't invite yourself");
      return;
    }

    setLoading(true);
    try {
      const invitationRef = await addDoc(collection(db, 'invitations'), {
        listId,
        invitedEmail: trimmedEmail,
        invitedBy: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setPendingInvites([
        ...pendingInvites,
        {
          id: invitationRef.id,
          invitedEmail: trimmedEmail,
          status: 'pending',
        },
      ]);
      setEmail('');

      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${trimmedEmail}. They will see it when they log in.`
      );
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberIcon}>
        <Text style={styles.memberIconText}>
          {item.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.memberEmail}>{item}</Text>
      {item === user.email.toLowerCase() && (
        <Text style={styles.youBadge}>You</Text>
      )}
    </View>
  );

  const renderPendingInvite = ({ item }) => (
    <View style={styles.pendingItem}>
      <View style={styles.pendingIcon}>
        <Text style={styles.pendingIconText}>✉</Text>
      </View>
      <View style={styles.pendingInfo}>
        <Text style={styles.pendingEmail}>{item.invitedEmail}</Text>
        <Text style={styles.pendingStatus}>Pending</Text>
      </View>
    </View>
  );

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#29AB87" />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Invite Others</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Invite Form */}
        <View style={styles.inviteForm}>
          <Text style={styles.sectionTitle}>Invite by Email</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleInvite}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Current Members ({members.length})
          </Text>
          <FlatList
            data={members}
            keyExtractor={(item) => item}
            renderItem={renderMember}
            scrollEnabled={false}
          />
        </View>

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Invitations ({pendingInvites.length})
            </Text>
            <FlatList
              data={pendingInvites}
              keyExtractor={(item) => item.id}
              renderItem={renderPendingInvite}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
  },
  inviteForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#29AB87',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#85D4BC',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#29AB87',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  youBadge: {
    fontSize: 12,
    color: '#29AB87',
    fontWeight: '600',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pendingIconText: {
    fontSize: 16,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingEmail: {
    fontSize: 14,
    color: '#333',
  },
  pendingStatus: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
});

export default InviteScreen;
