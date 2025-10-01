const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises; // File System for persistence
const path = require('path');
const axios = require('axios'); // For Telegram API calls

const app = express();
// PORT Railway se automatic milega, ya local chalane par 3000 use hoga
const PORT = process.env.PORT || 3000; 
const HOST = '0.0.0.0'; // Railway par chalaane ke liye zaroori

// File storage paths
const UPLOADS_DIR = path.join(__dirname, 'files');
const METADATA_FILE = path.join(__dirname, 'file_metadata.json');

// Middleware
app.use(cors()); 
app.use(express.json()); 

// UPLOADS_DIR ko sirf local testing ke liye taiyar karein
(async () => {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
    } catch (error) {
        // Deployment platforms (like Railway) mein yeh error aayega, jo theek hai
        console.warn("Upload directory nahi ban payi ya local nahi hai. Railway par files storage alag tarike se handle hoti hai.");
    }
})();

// Multer storage configuration - Local testing ke liye
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

/**
 * Metadata (File List) Load aur Save Functions (Persistence ke liye)
 */
async function loadMetadata() {
    try {
        const data = await fs.readFile(METADATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Agar file exist nahi karti
        return [];
    }
}

async function saveMetadata(metadata) {
    // Railway par files/metadata disk par save karna behtar nahi hai (kyunki woh volatile hota hai). 
    // Real project mein yahan MongoDB/PostgreSQL ka istemaal hota hai.
    // Lekin is demo ke liye hum disk use kar rahe hain.
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
}

// --- API Endpoints ---

// 1. Files ki list load karna (Persistence)
app.get('/api/files', async (req, res) => {
    const files = await loadMetadata();
    res.json(files);
});

// 2. File Upload aur Persistence
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        // Agar deployment platform disk storage ki ijazat nahi deta
        return res.status(500).send('File upload asafal. Hosting environment file storage ko support nahi karta.');
    }
    
    // File metadata ko database (yahan JSON file) mein save karna
    const newFile = {
        id: req.file.filename, 
        name: req.file.originalname,
        size: req.file.size,
        type: 'file',
        date: new Date().toLocaleDateString('hi-IN'),
    };

    const metadata = await loadMetadata();
    metadata.push(newFile);
    await saveMetadata(metadata);

    res.status(200).json({ message: 'File safaltapoorvak upload hui aur list mein jodi gayi', file: newFile });
});

// 3. Folder banana
app.post('/api/create-folder', async (req, res) => {
    const { folderName } = req.body;
    if (!folderName) {
        return res.status(400).send('Folder ka naam dena zaruri hai.');
    }

    const newFolder = {
        id: Date.now(),
        name: folderName,
        type: 'folder',
        date: new Date().toLocaleDateString('hi-IN'),
        path: '/' + folderName
    };

    const metadata = await loadMetadata();
    metadata.push(newFolder);
    await saveMetadata(metadata);

    res.status(200).json({ message: 'Folder safaltapoorvak banaya gaya', folder: newFolder });
});


// 4. TELEGRAM CLOUD INTEGRATION Test
app.post('/api/telegram/connect', async (req, res) => {
    const { token, channelId } = req.body;
    
    const TELEGRAM_API = `https://api.telegram.org/bot${token}/getMe`;

    try {
        const response = await axios.get(TELEGRAM_API);
        if (response.data.ok) {
            
            const telegramCloud = {
                id: 'telegram-' + channelId,
                name: `Telegram Cloud (@${response.data.result.username || 'Bot'})`,
                type: 'telegram-cloud',
                date: new Date().toLocaleDateString('hi-IN'),
                channelId: channelId, 
            };
            
            const metadata = await loadMetadata();
            // Agar pehle se joda hua hai toh update karein
            const index = metadata.findIndex(item => item.id === telegramCloud.id);
            if(index === -1) {
                metadata.push(telegramCloud);
            } else {
                metadata[index] = telegramCloud; 
            }
            
            await saveMetadata(metadata);

            res.status(200).json({ 
                success: true, 
                message: `Bot "${response.data.result.first_name}" ka connection safaltapoorvak test hua. Cloud joda gaya.`,
                cloud: telegramCloud
            });
            
        } else {
             res.status(400).json({ success: false, message: 'Invalid Bot Token. Connection asafal.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Telegram API tak pahunchne mein error. Token ya network check karein.' });
    }
});


// Server ko shuru karein
app.listen(PORT, HOST, () => {
    console.log(`✅ Backend Server chal raha hai http://${HOST}:${PORT}`);
    console.log(`Ab is code ko GitHub par upload karein aur Railway par deploy karein.`);
});

