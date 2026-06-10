"use client";
// components/Navbar.jsx

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import styles from "./Navbar.module.css";

const OWNER_UID = "Gj0LKhJoonOJGHYyi8SwOqocZX42";

export default function Navbar({ user, username, onLogout }) {
  const router = useRouter();
  const [photo, setPhoto] = useState(null);
  const [displayName, setDisplayName] = useState(username || user?.displayName || "");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPhoto(data.photoURL || user?.photoURL || null);
        if (data.username) setDisplayName(data.username);
      } else {
        setPhoto(user?.photoURL || null);
      }
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size));
    return unsub;
  }, [user?.uid]);

  const isOwner = user?.uid === OWNER_UID;

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

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
          <Link href="/search" className={`btn btn-ghost ${styles.iconBtn}`} title="Search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>

          <Link href="/notifications" className={`btn btn-ghost ${styles.iconBtn} ${styles.notifBtn}`} title="Notifications">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </Link>

          {isOwner && (
            <Link href="/admin" className={`btn btn-ghost ${styles.iconBtn}`} title="Admin Panel">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </Link>
          )}

          <Link href={`/profile/${user?.uid}`} className={styles.avatar}>
            {photo ? (
              <img src={photo} alt={displayName} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{displayName?.[0]?.toUpperCase() ?? "?"}</div>
            )}
          </Link>

          <Link href="/settings" className={`btn btn-ghost ${styles.iconBtn}`} title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          <button className={`btn btn-ghost ${styles.logoutBtn}`} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>
    </nav>
  );
}