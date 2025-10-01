// KRIPYA YAHAN APNI RAILWAY URL DAALEIN!
// Deployment ke baad is line ko Railway se mili asli URL se badalna hai.
const BACKEND_URL = 'https://[APNI-RAILWAY-DOMAIN].up.railway.app'; 
// Jab tak aap ise nahi badalte, yeh kaam nahi karega.

const fileListElement = document.getElementById('file-list');
const fileUploadInput = document.getElementById('file-upload');
const telegramModal = document.getElementById('telegram-modal');
const telegramStatus = document.getElementById('telegram-status');
let currentFiles = [];

// --- API Calls ---

async function loadFiles() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/files`);
        if (!response.ok) throw new Error('Files load nahi ho payi');
        currentFiles = await response.json();
        renderFiles();
    } catch (e) {
        fileListElement.innerHTML = '<li style="color: red; padding: 10px;">❌ Server tak pahunch nahi paye. Kripya BACKEND_URL (script.js mein) aur Railway server check karein.</li>';
        console.error("Files load nahi ho payi:", e);
    }
}

async function connectTelegram() {
    const token = document.getElementById('bot-token').value.trim();
    const channelId = document.getElementById('channel-id').value.trim();
    if (!token || !channelId) {
        telegramStatus.textContent = "Kripya Bot Token aur Channel ID dono daalein.";
        return;
    }
    
    telegramStatus.textContent = 'Connection test ho raha hai...';
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/telegram/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, channelId })
        });

        const result = await response.json();

        if (result.success) {
            telegramStatus.style.color = 'green';
            telegramStatus.textContent = result.message;
            await loadFiles(); 
            setTimeout(closeModal, 1500);
        } else {
            telegramStatus.style.color = 'red';
            telegramStatus.textContent = result.message;
        }

    } catch (error) {
        telegramStatus.style.color = 'red';
        telegramStatus.textContent = 'Server se connection fail. Deployment aur URL check karein.';
    }
}

// ... (Baaki sab functions jaise renderFiles, createNewFolder, formatBytes, getFileIcon, pichle baar ki tarah hi rahenge) ...

// --- UI Rendering ---

function renderFiles() {
    fileListElement.innerHTML = ''; 
    if (currentFiles.length === 0) {
        fileListElement.innerHTML = '<li class="file-item" style="justify-content: center; color: #999;">Koi file ya folder nahi hai.</li>';
        return;
    }

    currentFiles.forEach(item => {
        const li = document.createElement('li');
        li.className = 'file-item';
        
        let icon = item.type === 'folder' ? '📁' : item.type === 'telegram-cloud' ? '☁️' : getFileIcon(item.name);
        let sizeText = item.size ? formatBytes(item.size) : item.type === 'folder' ? 'Folder' : 'Cloud';

        li.onclick = () => alert(`Item: ${item.name} | Type: ${item.type}`);

        li.innerHTML = `
            <span class="icon">${icon}</span>
            <span class="file-name">${item.name}</span>
            <span class="file-date">${item.date || '---'}</span>
            <span class="file-size">${sizeText}</span>
        `;
        fileListElement.appendChild(li);
    });
}

fileUploadInput.addEventListener('change', async (event) => {
    const fileToUpload = event.target.files[0];
    if (!fileToUpload) return;
    
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
        const response = await fetch(`${BACKEND_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload asafal raha');

        alert(`✅ File safaltapoorvak upload hui!`);
        await loadFiles(); 

    } catch (error) {
        alert(`❌ File upload mein error: ${error.message}. Server down ho sakta hai.`);
        console.error('Upload Error:', error);
    }
});

async function createNewFolder() {
    const folderName = prompt("Naye folder ka naam daalein:");
    if (!folderName) return;

    try {
        const response = await fetch(`${BACKEND_URL}/api/create-folder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderName })
        });
        
        if (!response.ok) throw new Error('Folder nahi ban paya');

        alert(`✅ Folder "${folderName}" ban gaya!`);
        await loadFiles();
        
    } catch (error) {
        alert(`❌ Folder banane mein error: ${error.message}`);
    }
}

function closeModal() { telegramModal.style.display = 'none'; }
function formatBytes(bytes, decimals = 2) { /* ... utility logic ... */ if (bytes === 0) return '0 Bytes'; const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]; }
function getFileIcon(fileName) { const extension = fileName.split('.').pop().toLowerCase(); switch (extension) { case 'png': case 'jpg': case 'jpeg': case 'gif': return '🖼️'; case 'pdf': return '📕'; case 'zip': case 'rar': return '📦'; case 'mp4': case 'avi': case 'mov': return '🎬'; case 'js': case 'html': case 'css': return '📜'; default: return '📄'; } }

window.onload = loadFiles;

