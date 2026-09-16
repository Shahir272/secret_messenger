import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  push, 
  onChildAdded, 
  off 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX8lrsj1cf3Zc0FEpp-XKlA7UYHwmWymE",
  authDomain: "chatbot-6e3d6.firebaseapp.com",
  databaseURL: "https://chatbot-6e3d6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chatbot-6e3d6",
  storageBucket: "chatbot-6e3d6.firebasestorage.app",
  messagingSenderId: "1051462704030",
  appId: "1:1051462704030:web:9e261ccc46ab221994d48f",
  measurementId: "G-63T6W4ZFF3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Preset channels for CST 433 modules
const DEFAULT_ROOMS = [
  { id: "cst433_general", name: "CST 433 General", desc: "Main student lobby & queries", icon: "GEN" },
  { id: "mod1_ciphers", name: "Module 1: Classical Ciphers", desc: "Caesar, Playfair, Hill, Vigenere", icon: "M1" },
  { id: "mod2_des_aes", name: "Module 2: DES & AES", desc: "Feistel structures, key scheduling", icon: "M2" },
  { id: "mod3_rsa_dh", name: "Module 3: Asymmetric Cryptography", desc: "RSA, ElGamal, Diffie-Hellman", icon: "M3" },
  { id: "mod4_mac_signatures", name: "Module 4: MAC & Signatures", desc: "SHA-512, HMAC, Digital Signatures", icon: "M4" },
  { id: "mod5_system_sec", name: "Module 5: System Security", desc: "Intrusion, Viruses, DDoS & Certificates", icon: "M5" }
];

// State
let activeRoomId = null;
let currentMessagesRef = null;

// DOM Elements
const roomsList = document.getElementById("roomsList");
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const usernameInput = document.getElementById("usernameInput");
const sendBtn = document.getElementById("sendBtn");
const activeRoomTitle = document.getElementById("activeRoomTitle");
const activeRoomMeta = document.getElementById("activeRoomMeta");
const activeRoomAvatar = document.getElementById("activeRoomAvatar");
const myAvatar = document.getElementById("myAvatar");
const searchRoomsInput = document.getElementById("searchRoomsInput");
const newRoomBtn = document.getElementById("newRoomBtn");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const container = document.querySelector(".multi-chat-layout");

// Load stored username
const savedName = localStorage.getItem("chat_user_name") || "Anonymous";
usernameInput.value = savedName === "Anonymous" ? "" : savedName;
updateUserAvatar(savedName);

usernameInput.addEventListener("input", (e) => {
  const val = e.target.value.trim() || "Anonymous";
  localStorage.setItem("chat_user_name", val);
  updateUserAvatar(val);
});

function updateUserAvatar(name) {
  myAvatar.textContent = (name || "A").charAt(0).toUpperCase();
}

// Render Room List
function renderRooms(filterText = "") {
  roomsList.innerHTML = "";
  const rooms = getRooms();

  const filtered = rooms.filter(r => 
    r.name.toLowerCase().includes(filterText.toLowerCase()) || 
    r.desc.toLowerCase().includes(filterText.toLowerCase())
  );

  filtered.forEach(room => {
    const item = document.createElement("div");
    item.className = `room-item ${room.id === activeRoomId ? "active" : ""}`;
    item.dataset.roomId = room.id;

    item.innerHTML = `
      <div class="room-avatar">${room.icon || room.name.substring(0, 2).toUpperCase()}</div>
      <div class="room-info">
        <div class="room-info-header">
          <div class="room-name">${escapeHTML(room.name)}</div>
        </div>
        <div class="room-desc">${escapeHTML(room.desc)}</div>
      </div>
    `;

    item.addEventListener("click", () => switchRoom(room));
    roomsList.appendChild(item);
  });
}

// Local storage support for custom rooms
function getRooms() {
  const custom = JSON.parse(localStorage.getItem("custom_chat_rooms") || "[]");
  return [...DEFAULT_ROOMS, ...custom];
}

// Switch Active Room
function switchRoom(room) {
  if (activeRoomId === room.id) return;

  // Detach previous listener if active
  if (currentMessagesRef) {
    off(currentMessagesRef);
  }

  activeRoomId = room.id;
  activeRoomTitle.textContent = room.name;
  activeRoomMeta.textContent = room.desc;
  activeRoomAvatar.textContent = room.icon || room.name.substring(0, 2).toUpperCase();

  // Highlight selected room item
  document.querySelectorAll(".room-item").forEach(el => {
    el.classList.toggle("active", el.dataset.roomId === room.id);
  });

  // Clear chat area
  chatArea.innerHTML = "";

  // Mobile layout switch
  container.classList.add("chat-open");

  // Subscribe to the new room path in Firebase
  currentMessagesRef = ref(db, `chat_rooms/${activeRoomId}`);

  onChildAdded(currentMessagesRef, (snapshot) => {
    const data = snapshot.val();
    appendMessage(data);
  });

  messageInput.focus();
}

// Append Message to UI
function appendMessage(data) {
  const currentSender = usernameInput.value.trim() || "Anonymous";
  const isOutgoing = data.sender === currentSender;

  const bubble = document.createElement("div");
  bubble.className = `wa-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

  bubble.innerHTML = `
    ${!isOutgoing ? `<div class="bubble-sender">${escapeHTML(data.sender)}</div>` : ''}
    <div class="bubble-text">${escapeHTML(data.text)}</div>
    <div class="bubble-time">${formatTime(data.timestamp)}</div>
  `;

  chatArea.appendChild(bubble);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Send Message
function sendMessage() {
  if (!activeRoomId) {
    alert("Please select a discussion room first.");
    return;
  }

  const text = messageInput.value.trim();
  const sender = usernameInput.value.trim() || "Anonymous";

  if (!text) return;

  push(currentMessagesRef, {
    sender: sender,
    text: text,
    timestamp: Date.now()
  });

  messageInput.value = "";
  messageInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Create custom room button
newRoomBtn.addEventListener("click", () => {
  const roomName = prompt("Enter a new room or topic name:");
  if (!roomName || !roomName.trim()) return;

  const roomId = "custom_" + roomName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  const desc = prompt("Enter brief description:", "Private study topic") || "";

  const customRooms = JSON.parse(localStorage.getItem("custom_chat_rooms") || "[]");
  if (!customRooms.some(r => r.id === roomId)) {
    const newRoom = {
      id: roomId,
      name: roomName.trim(),
      desc: desc.trim(),
      icon: roomName.trim().substring(0, 2).toUpperCase()
    };
    customRooms.push(newRoom);
    localStorage.setItem("custom_chat_rooms", JSON.stringify(customRooms));
    renderRooms();
    switchRoom(newRoom);
  } else {
    alert("Room already exists!");
  }
});

// Search filter
searchRoomsInput.addEventListener("input", (e) => {
  renderRooms(e.target.value.trim());
});

// Mobile back button to room list
mobileBackBtn.addEventListener("click", () => {
  container.classList.remove("chat-open");
});

// Helper utilities
function formatTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Initial boot: render rooms & select general lobby by default
renderRooms();
switchRoom(DEFAULT_ROOMS[0]);