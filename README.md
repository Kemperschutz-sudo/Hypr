# Hypr

A simple social media web app built with Next.js + Firebase. Features: posts, real-time likes, and user profiles.

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Firebase Firestore (real-time)
- **Auth**: Firebase Auth (Google Sign-in)
- **Hosting**: Vercel (optional, free)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → follow the setup steps
3. In your project, go to **Build → Firestore Database** → Create database (start in test mode)
4. Go to **Build → Authentication** → Get started → Enable **Google** provider
5. Go to **Project Settings** (gear icon) → **Your apps** → Add a **Web** app
6. Copy your config values

### 3. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Firebase values from step 5.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign in with Google and start posting!

## Firestore Security Rules

Once you're ready to go beyond test mode, update your Firestore rules in Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
      allow update: if request.auth != null && (
        // Only allow updating the likes array
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes'])
      );
      allow delete: if request.auth != null && resource.data.authorId == request.auth.uid;
    }
  }
}
```

## Deploy to Vercel

1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add your environment variables from `.env.local`
4. Deploy — done!

## Project Structure

```
├── app/
│   ├── page.jsx              # Main feed
│   ├── layout.jsx            # Root layout
│   ├── globals.css           # Global styles
│   └── profile/[id]/         # User profile pages
├── components/
│   ├── Navbar.jsx            # Top navigation
│   ├── CreatePost.jsx        # New post form
│   └── Post.jsx              # Post card with likes
└── lib/
    └── firebase.js           # Firebase initialization
```
