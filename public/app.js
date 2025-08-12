const socket = io();
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const photo = document.getElementById('photo');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image');
let username = '';

function login() {
  username = document.getElementById('username').value.trim();
  if (!username) return alert('Please enter a name');
  socket.emit('set username', username);
  document.getElementById('login').style.display = 'none';
  document.getElementById('chat').style.display = 'flex';
  input.focus();
}

// Show preview and disable input when image selected
photo.addEventListener('change', () => {
  if (photo.files && photo.files[0]) {
    const file = photo.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      previewContainer.style.display = 'block';
      input.disabled = true;
      input.value = ''; // Clear input if any
    };
    reader.readAsDataURL(file);
  } else {
    clearImagePreview();
  }
});

removeImageBtn.addEventListener('click', () => {
  clearImagePreview();
  photo.value = '';
  input.disabled = false;
});

function clearImagePreview() {
  imagePreview.src = '';
  previewContainer.style.display = 'none';
  input.disabled = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (photo.files[0]) {
    // Send combined message with image + optional text (empty text here)
    socket.emit('chat message', {
      type: 'mixed',
      text: input.value.trim(),
      image: imagePreview.src,
    });

    // Reset
    clearImagePreview();
    photo.value = '';
    input.value = '';
    input.disabled = false;
  } else if (input.value.trim()) {
    socket.emit('chat message', { type: 'text', text: input.value.trim() });
    input.value = '';
  }
});

socket.on('chat message', function (msg) {
  const item = document.createElement('li');
  const time = new Date(msg.created_at || Date.now()).toLocaleTimeString();
  const isMine = msg.username === username;

  item.className = isMine ? 'my-message' : 'other-message';

  if (msg.type === 'text') {
    item.innerHTML = `<div class="message-text">${escapeHtml(msg.text)}</div><div class="meta">${escapeHtml(msg.username)} • ${time}</div>`;
  } else if (msg.type === 'mixed') {
    let html = '';
    if (msg.image) html += `<img class="message-img" src="${msg.image}"/>`;
    if (msg.text) html += `<div class="message-text">${escapeHtml(msg.text)}</div>`;
    html += `<div class="meta">${escapeHtml(msg.username)} • ${time}</div>`;
    item.innerHTML = html;
  }

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
});

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
