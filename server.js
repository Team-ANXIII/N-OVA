import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __distname = path.join(__dirname, 'front', 'dist');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    if(fs.existsSync(path.join(__distname, 'index.html'))) {
        res.sendFile(path.join(__distname, 'index.html'));
    } else {
        res.status(500).send('Build the front-end application first.');
    }
});

app.use(express.static(__distname));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});