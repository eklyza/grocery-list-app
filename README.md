# Grocery List App

A React Native mobile app with Firebase backend for a single shared grocery list. Users can invite others, add items with autocomplete, cross off items, and the app prevents duplicate entries.

## Features

- Email/password authentication
- Single shared grocery list per user group
- Add items with autocomplete from 200+ pre-populated grocery items
- Auto-fill category when selecting from suggestions
- Cross off items (tap to toggle)
- Swipe to delete items
- Duplicate detection (case-insensitive + singular/plural matching)
- Invite others to share your list
- Real-time sync across all list members

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Firebase project

### Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)

2. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider

3. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Add the following security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // List members can read/write list and items
    match /lists/{listId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null;

      match /items/{itemId} {
        allow read, write: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/lists/$(listId)).data.members;
      }
    }

    // Users can read invitations sent to their email
    match /invitations/{invitationId} {
      allow read: if request.auth != null &&
        request.auth.token.email == resource.data.invitedEmail;
      allow write: if request.auth != null;
    }
  }
}
```

4. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll to "Your apps" and click "Add app" > Web
   - Copy the firebaseConfig object

5. Update `firebase.js` with your config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Installation

```bash
cd grocery-list-app
npm install
```

### Running the App

```bash
npx expo start
```

Then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan QR code with Expo Go app on your phone

## Project Structure

```
grocery-list-app/
├── App.js                    # Entry point, navigation setup
├── app.json                  # Expo config
├── firebase.js               # Firebase initialization
├── src/
│   ├── contexts/
│   │   └── AuthContext.js    # Auth state management
│   ├── screens/
│   │   ├── LoginScreen.js    # Email/password login
│   │   ├── SignUpScreen.js   # User registration
│   │   ├── GroceryListScreen.js  # Main list view
│   │   ├── AddItemScreen.js  # Add item with autocomplete
│   │   └── InviteScreen.js   # Invite users by email
│   ├── components/
│   │   ├── ItemRow.js        # Single grocery item with cross-off
│   │   ├── CategoryPicker.js # Category selection dropdown
│   │   └── AutocompleteInput.js  # Text input with suggestions
│   ├── utils/
│   │   └── duplicateCheck.js # Case + plural duplicate detection
│   └── data/
│       ├── categories.js     # Predefined category list
│       └── groceryItems.js   # Pre-populated autocomplete items
```

## Usage

1. **Sign Up/Login** - Create an account or sign in
2. **Create or Join List** - New users can create a list or accept an invitation
3. **Add Items** - Tap the + button, start typing to see suggestions
4. **Cross Off Items** - Tap an item to mark it as completed
5. **Delete Items** - Swipe left on an item and tap Delete
6. **Invite Others** - Use the menu to invite others by email
