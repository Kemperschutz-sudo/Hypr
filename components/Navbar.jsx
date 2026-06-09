"use client";
// components/Navbar.jsx

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import styles from "./Navbar.module.css";

export default function Navbar({ user, username, onLogout }) {
  const [photo, setPhoto] = useState(user?.photoURL || null);
  const [displayName, setDisplayName] = useState(username || user?.displayName || "");

  // Listen to user doc for real-time photo/username updates
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) setPhoto(data.photoURL);
        if (data.username) setDisplayName(data.username);
      }
    });
    return unsub;
  }, [user?.uid]);

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <svg className={styles.logo} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" transform="rotate(45 12 12)" />
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          </svg>
          <span className={styles.name}>Hypr</span>
        </Link>

        <div className={styles.right}>
          <Link href={`/profile/${user?.uid}`} className={styles.avatar}>
            {photo ? (
              <img src={photo} alt={displayName} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{displayName?.[0]?.toUpperCase() ?? "?"}</div>
            )}
          </Link>
          <Link href="/settings" className={`btn btn-ghost ${styles.editBtn}`} title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <button className={`btn btn-ghost ${styles.logoutBtn}`} onClick={onLogout}>Sign out</button>
        </div>
      </div>
    </nav>
  );
}