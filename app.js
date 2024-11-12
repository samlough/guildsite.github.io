// app.js

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAva5MXpIx8gIbhEqrUHMnhQEPZKrPIp_U",
    authDomain: "guild-loot-dist.firebaseapp.com",
    projectId: "guild-loot-dist",
    storageBucket: "guild-loot-dist.firebasestorage.app",
    messagingSenderId: "297350433168",
    appId: "1:297350433168:web:9727253e5fad6a50bbcb15",
    measurementId: "G-KPPWXFCN7N"
  };
 
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// Elements
const leaderLoginDiv = document.getElementById('leader-login');
const leaderDashboardDiv = document.getElementById('leader-dashboard');
const memberViewDiv = document.getElementById('member-view');

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

const logoutButton = document.getElementById('logout-button');
const addLootForm = document.getElementById('add-loot-form');
const lootListDiv = document.getElementById('loot-list');

const activeLootDiv = document.getElementById('active-loot');
const archivedLootDiv = document.getElementById('archived-loot');

const rollModal = document.getElementById('roll-modal');
const closeButton = document.querySelector('.close-button');
const modalLootName = document.getElementById('modal-loot-name');
const rollForm = document.getElementById('roll-form');
const rollError = document.getElementById('roll-error');

let currentLootId = null;

// Authentication State Listener
auth.onAuthStateChanged(user => {
  if (user) {
    // Check if user is a leader
    db.collection('leaders').doc(user.uid).get()
      .then(doc => {
        if (doc.exists) {
          // User is a leader
          leaderLoginDiv.classList.add('hidden');
          leaderDashboardDiv.classList.remove('hidden');
          memberViewDiv.classList.add('hidden');
          loadLeaderDashboard();
        } else {
          // Not a leader, sign out
          auth.signOut();
          alert('Access denied. Only leaders can log in.');
        }
      });
  } else {
    // No user signed in
    leaderLoginDiv.classList.remove('hidden');
    leaderDashboardDiv.classList.add('hidden');
    memberViewDiv.classList.remove('hidden');
    loadMemberView();
  }
});

// Leader Login Handling
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      loginError.textContent = '';
    })
    .catch(error => {
      loginError.textContent = error.message;
    });
});

// Leader Logout
logoutButton.addEventListener('click', () => {
  auth.signOut();
});

// Load Leader Dashboard
function loadLeaderDashboard() {
  // Clear existing loot list
  lootListDiv.innerHTML = '';

  // Fetch loot items from Firestore
  db.collection('loot_items').orderBy('expiresAt').onSnapshot(snapshot => {
    lootListDiv.innerHTML = ''; // Clear list
    snapshot.forEach(doc => {
      const loot = doc.data();
      const lootId = doc.id;
      const lootDiv = document.createElement('div');
      lootDiv.classList.add('loot-item');

      lootDiv.innerHTML = `
        <h4>${loot.name}</h4>
        <p>${loot.description}</p>
        <p>Status: ${loot.status}</p>
        <p>Expires At: ${loot.expiresAt.toDate().toLocaleString()}</p>
        <button class="edit-button" data-id="${lootId}">Edit</button>
        <button class="delete-button" data-id="${lootId}">Delete</button>
      `;

      lootListDiv.appendChild(lootDiv);
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-button').forEach(button => {
      button.addEventListener('click', () => {
        const lootId = button.getAttribute('data-id');
        editLootItem(lootId);
      });
    });

    document.querySelectorAll('.delete-button').forEach(button => {
      button.addEventListener('click', () => {
        const lootId = button.getAttribute('data-id');
        deleteLootItem(lootId);
      });
    });
  });
}

// Add New Loot Item
addLootForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('loot-name').value;
  const description = document.getElementById('loot-description').value;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 4); // 4 days from now

  db.collection('loot_items').add({
    name: name,
    description: description,
    status: 'open',
    expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt)
  }).then(() => {
    addLootForm.reset();
  }).catch(error => {
    console.error('Error adding loot:', error);
  });
});

// Edit Loot Item
function editLootItem(lootId) {
  const newName = prompt('Enter new loot name:');
  if (newName === null) return; // Cancelled

  const newDescription = prompt('Enter new description:');
  if (newDescription === null) return; // Cancelled

  db.collection('loot_items').doc(lootId).update({
    name: newName,
    description: newDescription
  }).then(() => {
    console.log('Loot item updated');
  }).catch(error => {
    console.error('Error updating loot:', error);
  });
}

// Delete Loot Item
function deleteLootItem(lootId) {
  if (confirm('Are you sure you want to delete this loot item?')) {
    db.collection('loot_items').doc(lootId).delete()
      .then(() => {
        console.log('Loot item deleted');
      })
      .catch(error => {
        console.error('Error deleting loot:', error);
      });
  }
}

// Load Member View
function loadMemberView() {
  // Load Active Loot
  db.collection('loot_items')
    .where('status', '==', 'open')
    .where('expiresAt', '>', firebase.firestore.Timestamp.now())
    .orderBy('expiresAt')
    .onSnapshot(snapshot => {
      activeLootDiv.innerHTML = '';
      snapshot.forEach(doc => {
        const loot = doc.data();
        const lootId = doc.id;
        const lootDiv = document.createElement('div');
        lootDiv.classList.add('loot-item');

        // Calculate remaining time
        const now = new Date();
        const expiresAt = loot.expiresAt.toDate();
        const timeLeft = Math.max(expiresAt - now, 0);
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        lootDiv.innerHTML = `
          <h4>${loot.name}</h4>
          <p>${loot.description}</p>
          <p>Time Left: ${days}d ${hours}h ${minutes}m ${seconds}s</p>
          <button class="roll-button" data-id="${lootId}" data-name="${loot.name}">Roll</button>
        `;

        activeLootDiv.appendChild(lootDiv);
      });

      // Add event listeners for roll buttons
      document.querySelectorAll('.roll-button').forEach(button => {
        button.addEventListener('click', () => {
          const lootId = button.getAttribute('data-id');
          const lootName = button.getAttribute('data-name');
          openRollModal(lootId, lootName);
        });
      });
    });

  // Load Archived Loot
  db.collection('loot_items')
    .where('status', '==', 'archived')
    .orderBy('expiresAt', 'desc')
    .onSnapshot(snapshot => {
      archivedLootDiv.innerHTML = '';
      snapshot.forEach(doc => {
        const loot = doc.data();
        const lootId = doc.id;
        const lootDiv = document.createElement('div');
        lootDiv.classList.add('loot-item');

        // Fetch votes for this loot item
        db.collection('votes').where('lootItemId', '==', lootId).get()
          .then(votesSnapshot => {
            const voters = [];
            votesSnapshot.forEach(voteDoc => {
              voters.push(voteDoc.data().memberName);
            });

            lootDiv.innerHTML = `
              <h4>${loot.name}</h4>
              <p>${loot.description}</p>
              <p>Voted By:</p>
              <ul>
                ${voters.map(name => `<li>${name}</li>`).join('')}
              </ul>
            `;

            archivedLootDiv.appendChild(lootDiv);
          })
          .catch(error => {
            console.error('Error fetching votes:', error);
          });
      });
    });
}

// Roll Modal Functionality
function openRollModal(lootId, lootName) {
  currentLootId = lootId;
  modalLootName.textContent = lootName;
  rollModal.classList.remove('hidden');
}

closeButton.addEventListener('click', () => {
  rollModal.classList.add('hidden');
  rollForm.reset();
  rollError.textContent = '';
});

// Handle Roll Form Submission
rollForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const memberName = document.getElementById('member-name').value.trim();

  if (memberName === '') {
    rollError.textContent = 'Please enter your name.';
    return;
  }

  // Check if member has already rolled for this loot item
  db.collection('votes')
    .where('lootItemId', '==', currentLootId)
    .where('memberName', '==', memberName)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        rollError.textContent = 'You have already rolled for this item.';
      } else {
        // Add vote
        db.collection('votes').add({
          lootItemId: currentLootId,
          memberName: memberName,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          rollError.textContent = 'Your roll has been recorded!';
          rollForm.reset();
          setTimeout(() => {
            rollModal.classList.add('hidden');
            rollError.textContent = '';
          }, 2000);
        }).catch(error => {
          console.error('Error recording roll:', error);
          rollError.textContent = 'An error occurred. Please try again.';
        });
      }
    })
    .catch(error => {
      console.error('Error checking rolls:', error);
      rollError.textContent = 'An error occurred. Please try again.';
    });
});

