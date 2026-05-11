const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000; 

// --- MIDDLEWARES ---
// Απαραίτητα για την επικοινωνία με το Mobile App (React Native/Expo)
app.use(cors());

// SOS: Αυξήσαμε το όριο δεδομένων στα 50MB (το προεπιλεγμένο είναι πολύ μικρό). 
// Αυτό είναι απαραίτητο για να "χωράνε" οι φωτογραφίες προφίλ (Base64 strings) 
// που στέλνει το κινητό χωρίς να κρασάρει ο server!
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// --- ROUTES ---
// Εισαγωγή των Routes: Διαχωρισμός URLs για καθαρή αρχιτεκτονική (MVC)
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Χρήση των Routes στο κεντρικό / path
app.use('/', authRoutes);
app.use('/', apiRoutes);


// --- ENDPOINTS ---
// Δοκιμαστικό Endpoint για να βλέπουμε αν ο server "ζει"
app.get('/', (req, res) => {
    res.send('Theatre API Server 2026 - Structured MVC Architecture');
});

// --- ΕΚΚΙΝΗΣΗ SERVER ---
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Ο Server ξεκίνησε επιτυχώς!`);
});