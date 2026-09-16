import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Your Firebase Config
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

// Initialize Firebase & Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "chat_rooms/cst433_general");

// DOM elements
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const usernameInput = document.getElementById("usernameInput");
const sendBtn = document.getElementById("sendBtn");

// Persistent user name via localStorage
const savedName = localStorage.getItem("chat_user_name") || "";
usernameInput.value = savedName;

usernameInput.addEventListener("change", (e) => {
  localStorage.setItem("chat_user_name", e.target.value.trim());
});

// Send Message
function sendMessage() {
  const text = messageInput.value.trim();
  const sender = usernameInput.value.trim() || "Anonymous";

  if (!text) return;

  push(messagesRef, {
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

// Format timestamps (e.g., 09:45 PM)
function formatTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Listen for incoming messages in real-time
onChildAdded(messagesRef, (snapshot) => {
  const data = snapshot.val();
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
});

// Basic XSS mitigation
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}