<<<<<<< HEAD
# ◈ Hypr
=======
# Hypr
>>>>>>> d67294c88d3d23e9c6834fd1a3090ebaa001ac6a

A social media platform built with Next.js and Firebase.

🌐 **Live at: [hypr-orpin.vercel.app](https://hypr-orpin.vercel.app)**

---

## Features

- Posts with text, images, and GIFs
- Replies and likes
- Follow/unfollow users
- User profiles with bio and profile picture
- Verified badge system
- Notifications for likes, replies, follows and mentions
- Search users by username
- Dark/light mode
- Admin panel with ban system

---

## Tech Stack

- **Frontend/Backend** — Next.js 14
- **Database & Auth** — Firebase (Firestore + Google Auth)
- **Image Hosting** — Cloudinary
- **GIFs** — Giphy API
- **Hosting** — Vercel

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/Kemperschutz-sudo/Hypr.git
cd Hypr
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project
2. Enable **Firestore Database** (start in test mode)
3. Enable **Authentication** → Google provider
4. Go to **Project Settings** → Add a Web app → copy your config

### 4. Set up Cloudinary

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Go to Settings → Upload → Add an upload preset (unsigned)
3. Note your **Cloud name** and **upload preset name**

### 5. Configure environment variables

Create a `.env.local` file in the root:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

Also update the Cloudinary constants in `components/CreatePost.jsx` and `app/settings/page.jsx`:

```js
const CLOUD_NAME = "your-cloud-name";
const UPLOAD_PRESET = "your-upload-preset";
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add your environment variables
4. Deploy!

---

## Firestore Security Rules

Once ready for production, update your Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && resource.data.authorId == request.auth.uid;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

Built by [Kemperschutz-sudo](https://github.com/Kemperschutz-sudo)