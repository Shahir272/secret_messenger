import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  push, 
  onChildAdded, 
  off 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

const DEFAULT_ROOMS = [
  { id: "cst433_general", name: "CST 433 General", desc: "Main student lobby & queries", icon: "GEN" },
  { id: "mod1_ciphers", name: "Module 1: Classical Ciphers", desc: "Caesar, Playfair, Hill, Vigenere", icon: "M1" },
  { id: "mod2_des_aes", name: "Module 2: DES & AES", desc: "Feistel structures, key scheduling", icon: "M2" },
  { id: "mod3_rsa_dh", name: "Module 3: Asymmetric Cryptography", desc: "RSA, ElGamal, Diffie-Hellman", icon: "M3" },
  { id: "mod4_mac_signatures", name: "Module 4: MAC & Signatures", desc: "SHA-512, HMAC, Digital Signatures", icon: "M4" },
  { id: "mod5_system_sec", name: "Module 5: System Security", desc: "Intrusion, Viruses, DDoS & Certificates", icon: "M5" }
];

// Current Auth State
const currentUserId = localStorage.getItem("chat_user_id") || "guest_" + Math.floor(Math.random() * 1000);
const currentUserName = localStorage.getItem("chat_user_name") || "Student";
const currentUserRole = localStorage.getItem("chat_user_role") || "Member";

let activeRoomId = null;
let currentMessagesRef = null;
let activeReplyTarget = null;

// Elements
const roomsList = document.getElementById("roomsList");
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const activeRoomTitle = document.getElementById("activeRoomTitle");
const activeRoomMeta = document.getElementById("activeRoomMeta");
const activeRoomAvatar = document.getElementById("activeRoomAvatar");
const myAvatar = document.getElementById("myAvatar");
const myDisplayName = document.getElementById("myDisplayName");
const myRoleBadge = document.getElementById("myRoleBadge");
const searchRoomsInput = document.getElementById("searchRoomsInput");
const newRoomBtn = document.getElementById("newRoomBtn");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const container = document.querySelector(".multi-chat-layout");
const replyBar = document.getElementById("replyBar");
const replyTargetName = document.getElementById("replyTargetName");
const replyTargetText = document.getElementById("replyTargetText");
const cancelReplyBtn = document.getElementById("cancelReplyBtn");

// Set Profile UI
myDisplayName.textContent = currentUserName;
myRoleBadge.textContent = currentUserRole;
myAvatar.textContent = currentUserName.charAt(0).toUpperCase();

// Render Chat Rooms
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

function getRooms() {
  const custom = JSON.parse(localStorage.getItem("custom_chat_rooms") || "[]");
  return [...DEFAULT_ROOMS, ...custom];
}

function switchRoom(room) {
  if (activeRoomId === room.id) return;

  if (currentMessagesRef) off(currentMessagesRef);

  activeRoomId = room.id;
  activeRoomTitle.textContent = room.name;
  activeRoomMeta.textContent = room.desc;
  activeRoomAvatar.textContent = room.icon || room.name.substring(0, 2).toUpperCase();

  document.querySelectorAll(".room-item").forEach(el => {
    el.classList.toggle("active", el.dataset.roomId === room.id);
  });

  chatArea.innerHTML = "";
  clearReply();
  container.classList.add("chat-open");

  currentMessagesRef = ref(db, `chat_rooms/${activeRoomId}`);
  onChildAdded(currentMessagesRef, (snapshot) => {
    appendMessage(snapshot.val());
  });

  messageInput.focus();
}

function appendMessage(data) {
  // Check ownership via senderId to distinguish self vs other logins
  const isOutgoing = data.senderId === currentUserId;

  const bubble = document.createElement("div");
  bubble.className = `wa-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

  let replyHTML = "";
  if (data.replyTo) {
    replyHTML = `
      <div class="bubble-reply-quote">
        <div class="quote-sender">${escapeHTML(data.replyTo.sender)}</div>
        <div class="quote-text">${escapeHTML(data.replyTo.text)}</div>
      </div>
    `;
  }

  bubble.innerHTML = `
    ${!isOutgoing ? `<div class="bubble-sender">${escapeHTML(data.sender)} <span style="font-size:0.65rem; color:#8696a0;">(${escapeHTML(data.role || "Member")})</span></div>` : ''}
    ${replyHTML}
    <div class="bubble-text">${escapeHTML(data.text)}</div>
    <div class="bubble-time">${formatTime(data.timestamp)}</div>
    <div class="bubble-actions">
      <button class="reply-btn">&#x21A9; Reply</button>
    </div>
  `;

  // Hook reply click
  bubble.querySelector(".reply-btn").addEventListener("click", () => {
    setReplyTarget(data);
  });

  chatArea.appendChild(bubble);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function setReplyTarget(data) {
  activeReplyTarget = {
    sender: data.sender,
    text: data.text
  };
  replyTargetName.textContent = `Replying to ${data.sender}`;
  replyTargetText.textContent = data.text;
  replyBar.style.display = "flex";
  messageInput.focus();
}

function clearReply() {
  activeReplyTarget = null;
  replyBar.style.display = "none";
}

cancelReplyBtn.addEventListener("click", clearReply);

function sendMessage() {
  if (!activeRoomId) {
    alert("Please select a discussion room first.");
    return;
  }

  const text = messageInput.value.trim();
  if (!text) return;

  const payload = {
    senderId: currentUserId,
    sender: currentUserName,
    role: currentUserRole,
    text: text,
    timestamp: Date.now()
  };

  if (activeReplyTarget) {
    payload.replyTo = activeReplyTarget;
  }

  push(currentMessagesRef, payload);

  messageInput.value = "";
  clearReply();
  messageInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Custom room creator
newRoomBtn.addEventListener("click", () => {
  const roomName = prompt("Enter a new room topic:");
  if (!roomName || !roomName.trim()) return;

  const roomId = "room_" + roomName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  const desc = prompt("Enter brief description:", "Discussion topic") || "";

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
  }
});

searchRoomsInput.addEventListener("input", (e) => renderRooms(e.target.value.trim()));
mobileBackBtn.addEventListener("click", () => container.classList.remove("chat-open"));

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

// Initial Run
renderRooms();
switchRoom(DEFAULT_ROOMS[0]);