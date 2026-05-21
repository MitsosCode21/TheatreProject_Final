# Ανάπτυξη Εφαρμογής Κράτησης Θέσεων σε θεατρικές παραστάσεις μέσω Κινητής Συσκευής

**Μάθημα:** Mobile & Distributed Systems
**Κωδικός Μαθήματος:** CN6035  

---

## 1. Περιγραφή και Σκοπός της Εργασίας

Η παρούσα εργασία αφορά την ανάπτυξη μιας ολοκληρωμένης mobile εφαρμογής που επιτρέπει στους χρήστες να κάνουν κρατήσεις θέσεων σε θεατρικές παραστάσεις. Ο στόχος ήταν να στηθεί ένα πλήρες σύστημα (frontend, backend, database), ώστε να κατανοήσουμε στην πράξη πώς λειτουργεί και επικοινωνεί ένα σύγχρονο κατανεμημένο σύστημα (mobile client, REST API, Database).

Δόθηκε ιδιαίτερη έμφαση στην αυθεντικοποίηση και εξουσιοδότηση χρηστών, στην ασφάλεια των δεδομένων, καθώς και στη διαχείριση ταυτόχρονων κρατήσεων μέσω μηχανισμών αποφυγής διπλοκρατήσεων (race conditions).

---

## 2. Λειτουργίες της Εφαρμογής

* **Εγγραφή και Σύνδεση Χρήστη:**  
  Ο χρήστης μπορεί να δημιουργήσει λογαριασμό με email/password ή να συνδεθεί μέσω Google με χρήση OAuth 2.1 (Authorization Code flow με PKCE). Η αυθεντικοποίηση βασίζεται σε JWT tokens που αποθηκεύονται με ασφάλεια τοπικά (secure storage) και ανανεώνονται αυτόματα.

* **Προβολή Θεάτρων και Παραστάσεων:**  
  Ο χρήστης περιηγείται σε λίστα θεάτρων και παραστάσεων, με δυνατότητα αναζήτησης και φιλτραρίσματος βάσει τοποθεσίας, ονόματος θεάτρου ή τίτλου παράστασης.

* **Λεπτομέρειες Παράστασης:**  
  Προβολή showtimes, αίθουσας, διάρκειας, ηλικιακής κατηγορίας, βαθμολογίας και κόστους εισιτηρίου.

* **Διαδικασία Κράτησης:**  
  Ο συνδεδεμένος χρήστης επιλέγει showtime και θέσεις μέσω ειδικής φόρμας. Το backend ελέγχει σε πραγματικό χρόνο αν οι θέσεις παραμένουν ελεύθερες πριν οριστικοποιηθεί η κράτηση.

* **Προφίλ Χρήστη και Ιστορικό:**  
  Κάθε χρήστης μπορεί να δει το ιστορικό των κρατήσεών του, να τροποποιήσει ή να ακυρώσει μελλοντικές κρατήσεις. Στην ακύρωση, οι θέσεις ελευθερώνονται αυτόματα.

---

## 3. Αρχιτεκτονική του Συστήματος

Το project ακολουθεί 3-Tier Architecture:

1. **Επίπεδο Παρουσίασης (Frontend - Mobile App):** Уλοποιήθηκε εξ ολοκλήρου με το framework **React Native (v0.81.5)** σε συνδυασμό με την **TypeScript**, το οποίο μας επέτρεψε να δημιουργήσουμε μια σύγχρονη cross-platform εφαρμογή. Χρησιμοποιήσαμε το εξαιρετικά βολικό εργαλείο **Expo (~54.0.33)** και τον **Expo Router** για την πλοήγηση. Δώσαμε μεγάλη σημασία στο UI/UX ώστε ο σχεδιασμός να είναι ομοιόμορφος, εύχρηστος και να παρέχει άμεση ανατροφοδότηση στον χρήστη (π.χ. με ξεκάθαρα μηνύματα επιτυχίας ή αποτυχίας όταν κάνει ένα request).
2. **Επίπεδο Επιχειρησιακής Λογικής (Backend - REST API):** Το API μας γράφτηκε σε **Node.js** χρησιμοποιώντας το δημοφιλές **Express (v5)**. Ο κώδικας οργανώθηκε σωστά με βάση το μοτίβο MVC (δηλαδή διαχωρισμός σε routes, controllers, middlewares). Εκεί βρίσκεται όλη η "καρδιά" της εφαρμογής: η επιχειρησιακή λογική, οι αυστηροί έλεγχοι ασφαλείας (επαλήθευση των JWT), η επικοινωνία με τη βάση δεδομένων και η συνολική διαχείριση των αιτημάτων.
3. **Επίπεδο Δεδομένων (Database):** Ως σύστημα διαχείρισης βάσης δεδομένων επιλέξαμε τη σχεσιακή **MariaDB**. Εκεί αποθηκεύουμε μόνιμα και με ασφάλεια όλα τα στοιχεία: τους χρήστες, τα θέατρα, τις παραστάσεις, τις προβολές και τις τελικές κρατήσεις. Φροντίσαμε να υπάρχουν σωστά foreign keys για να διασφαλίζεται απολύτως η ακεραιότητα και η ορθότητα των σχέσεων μεταξύ των πινάκων.

Ολόκληρος ο κώδικας (frontend και backend) γράφτηκε και αναπτύχθηκε μέσω του **Visual Studio Code**.

---

## 4. Δομή του Project

```text
TheatreProject_Final/
│
├── TheatreApp/                  # Frontend - React Native & Expo
│   ├── app/
│   │   ├── (tabs)/              # Κύριες καρτέλες (Bottom Tabs)
│   │   │   ├── index.tsx        # Οθόνη Login / Register
│   │   │   ├── home.tsx         # Λίστα παραστάσεων & αναζήτηση
│   │   │   └── reservations.tsx # Ιστορικό & διαχείριση κρατήσεων
│   │   ├── show/                # Λεπτομέρειες παράστασης & showtimes
│   │   ├── book/                # Επιλογή θέσεων & κράτηση
│   │   ├── theatre/             # Πληροφορίες θεάτρου
│   │   └── profile/             # Προφίλ χρήστη
│   └── package.json
│
├── TheatreBackend/              # Backend - Node.js & Express
│   ├── config/db.js             # Σύνδεση MariaDB (connection pool)
│   ├── controllers/
│   │   ├── authController.js    # Login, Register, Refresh Token, Google OIDC
│   │   └── apiController.js     # Θέατρα, Παραστάσεις, Κρατήσεις, Προφίλ
│   ├── middlewares/
│   │   └── authMiddleware.js    # Επαλήθευση JWT (Bearer Token)
│   ├── routes/
│   │   ├── authRoutes.js        # /login, /register, /refresh, /auth/external
│   │   └── apiRoutes.js         # /shows, /theatres, /seats, /reservations, κλπ.
│   └── server.js                # Entry point (port 3000)
│
└── database/
    └── theatre_app.sql          # SQL script (πίνακες + mock data)
```

---

## 5. API Endpoints

### Δημόσια Endpoints (χωρίς JWT)

| Μέθοδος | Endpoint | Περιγραφή |
|---|---|---|
| `POST` | `/login` | Σύνδεση χρήστη με email και κωδικό |
| `POST` | `/register` | Δημιουργία νέου λογαριασμού |
| `POST` | `/refresh` | Ανανέωση του Access Token |
| `POST` | `/auth/external` | Σύνδεση μέσω Google (OIDC) |
| `GET` | `/shows` | Λίστα παραστάσεων (υποστηρίζει φίλτρα) |
| `GET` | `/theatres` | Λίστα θεάτρων |
| `GET` | `/showtimes/:show_id` | Διαθέσιμα showtimes παράστασης |
| `GET` | `/seats/:showtimeId` | Ελεύθερες θέσεις για συγκεκριμένο showtime |

### Προστατευμένα Endpoints (απαιτείται JWT)

| Μέθοδος | Endpoint | Περιγραφή |
|---|---|---|
| `POST` | `/reservations` | Δημιουργία νέας κράτησης |
| `PUT` | `/reservations/:id/:userId` | Τροποποίηση υπάρχουσας κράτησης |
| `DELETE` | `/reservations/:id/:userId` | Ακύρωση κράτησης |
| `GET` | `/user/reservations/:user_id` | Ιστορικό κρατήσεων χρήστη |
| `GET` | `/user/profile/:userId` | Στοιχεία προφίλ χρήστη |
| `PUT` | `/user/profile/:userId` | Ενημέρωση στοιχείων προφίλ |
| `PUT` | `/user/change-password/:userId` | Αλλαγή κωδικού πρόσβασης |

---

## 6. Σχεδιασμός Βάσης Δεδομένων

Η βάση σχεδιάστηκε στη MariaDB με γνώμονα την κανονικοποίηση και την αποτελεσματική εκτέλεση ερωτημάτων. Οι βασικοί πίνακες:

* **users:** `user_id` (PK), `name`, `email`, `password` (hashed), `role`, `external_id` (για Google OIDC), `profile_picture`, `phone`.
* **theatres:** `theatre_id` (PK), `name`, `location`, `description`, `image_url`.
* **shows:** `show_id` (PK), `theatre_id` (FK), `title`, `description`, `duration`, `age_rating`, `image_url`, `category`, `rating`, `room_name`.
* **showtimes:** `showtime_id` (PK), `show_id` (FK), `show_date`, `show_time`, `price`, `room_name`.
* **reservations:** `reservation_id` (PK), `user_id` (FK), `showtime_id` (FK), `seats_booked`, `total_price`, `created_at`, `seat_numbers`.

> **Race Conditions:** Κατά την υποβολή κράτησης, το backend εφαρμόζει database transactions (κλείδωμα) ώστε αν δύο χρήστες πατήσουν κράτηση για τις ίδιες θέσεις ταυτόχρονα, μόνο ο ένας θα τις πάρει.

---

## 7. Οδηγίες Εγκατάστασης και Εκτέλεσης

### Προαπαιτούμενα
* **Node.js** (v18+)
* **MariaDB** (v10.6+) — π.χ. μέσω Heidi.SQL ή αυτόνομη εγκατάσταση
* **Expo Go** στο κινητό (App Store / Google Play)

### Βήμα 1: Ρύθμιση Βάσης Δεδομένων
1. Μέσω **HeidiSQL** ή αντίστοιχου εργαλείου, δημιουργήστε μια σύνδεση στη MariaDB με τα εξής στοιχεία:
   * **Hostname / IP:** `127.0.0.1`
   * **Port:** `3307`
   * **User:** `root`
   * **Password:** `12345`
2. Δημιουργήστε νέα βάση με όνομα **`theatre_app`**.
3. Κάντε import το αρχείο `database/theatre_app.sql` και εκτελέστε το — θα δημιουργηθούν οι πίνακες και τα mock data.

> **Σημείωση:** Αν η δική σας εγκατάσταση MariaDB χρησιμοποιεί διαφορετικό port ή password, θα χρειαστεί να ενημερώσετε αντίστοιχα το αρχείο `TheatreBackend/config/db.js` ώστε ο server να μπορεί να συνδεθεί στη βάση.

### Βήμα 2: Εκκίνηση Backend
```bash
cd TheatreBackend
npm install
node server.js
```
Ο server θα τρέχει στο `http://localhost:3000`. Αφήστε το τερματικό ανοιχτό.

### Βήμα 3: Εκκίνηση Frontend

> **ΣΗΜΕΙΩΣΗ:** Η εφαρμογή τρέχει στο κινητό, το οποίο χρειάζεται την IP του υπολογιστή σας για να επικοινωνήσει με το backend. Βρείτε την τοπική σας IPv4 (μέσω `ipconfig` σε Windows ή `ifconfig` σε Mac/Linux) και αντικαταστήστε την IP στα αρχεία του frontend που κάνουν API requests, πριν ξεκινήσετε το Expo.

```bash
cd TheatreApp
npm install
npx expo start
```

### Βήμα 4: Δοκιμή στο Κινητό
1. Βεβαιωθείτε ότι κινητό και υπολογιστής είναι στο **ίδιο Wi-Fi**.
2. Ανοίξτε το **Expo Go** και σκανάρετε το QR Code που εμφανίζεται στο τερματικό.
3. Η εφαρμογή θα φορτώσει στο κινητό — δημιουργήστε λογαριασμό και δοκιμάστε κρατήσεις!

---

## 8. Ρύθμιση IP για Σύνδεση Κινητού με το Backend

Επειδή η εφαρμογή τρέχει σε **φυσική κινητή συσκευή** (μέσω Expo Go), το κινητό δεν μπορεί να χρησιμοποιήσει το `localhost` για να βρει τον backend server — χρειάζεται την **τοπική IPv4 διεύθυνση** του υπολογιστή σας στο δίκτυο.

### Βήμα 1: Βρείτε την IP σας

Ανοίξτε το **Command Prompt** (cmd) και εκτελέστε:

```bash
ipconfig
```

Αναζητήστε την ενότητα **"Wireless LAN adapter Wi-Fi"** (ή Ethernet αν συνδέεστε με καλώδιο) και βρείτε την τιμή δίπλα στο **"IPv4 Address"**. Θα μοιάζει κάπως έτσι:

```
IPv4 Address. . . . . . . . . . . : 192.168.X.X
```

### Βήμα 2: Ενημερώστε την IP στον κώδικα

Πρέπει να αντικαταστήσετε την παλιά IP με τη δική σας στα παρακάτω αρχεία. Σε κάθε αρχείο, βρείτε τη γραμμή `const SERVER_URL = 'http://...'` και αλλάξτε μόνο την IP:

| Αρχείο | Γραμμή προς αλλαγή |
|---|---|
| `TheatreApp/app/utils/api.js` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |
| `TheatreApp/app/(tabs)/index.tsx` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |
| `TheatreApp/app/(tabs)/home.tsx` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |
| `TheatreApp/app/(tabs)/reservations.tsx` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |
| `TheatreApp/app/show/[id].tsx` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |
| `TheatreApp/app/book/[id].tsx` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |
| `TheatreApp/app/theatre/[id].tsx` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |
| `TheatreApp/app/profile/settings.tsx` | `const SERVER_URL = 'http://ΝΕΑ_IP:3000';` |

**Παράδειγμα:** Αν η IP σας είναι `192.168.1.10`, η γραμμή θα γίνει:
```javascript
const SERVER_URL = 'http://192.168.1.10:3000';
```

> **⚠️ Προσοχή:** Αν αλλάξετε δίκτυο Wi-Fi (π.χ. από το σπίτι στο πανεπιστήμιο), η IP αλλάζει. Θα χρειαστεί να επαναλάβετε αυτή τη διαδικασία και να κάνετε Reload την εφαρμογή στο Expo Go.
