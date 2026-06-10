"use client";
// app/notifications/page.jsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, writeBatch, where, limit } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import { formatDistanceToNow } from "date-fns";
import styles from "./notifications.module.css";

function NotifIcon({ type }) {
  if (type === "like") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={styles.iconLike}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
  if (type === "reply") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.iconReply}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
  if (type === "follow") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.iconFollow}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
  if (type === "mention") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.iconMention}>
      <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setCurrentUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().username) setUsername(snap.data().username);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "users", currentUser.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);

      // Mark all as read
      const unread = snap.docs.filter((d) => !d.data().read);
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach((d) => batch.update(d.ref, { read: true }));
        batch.commit();
      }
    });
    return unsub;
  }, [currentUser]);

  const getNotifText = (n) => {
    if (n.type === "like") return <><strong>@{n.fromUsername}</strong> liked your post</>
    if (n.type === "reply") return <><strong>@{n.fromUsername}</strong> replied to your post</>
    if (n.type === "follow") return <><strong>@{n.fromUsername}</strong> followed you</>
    if (n.type === "mention") return <><strong>@{n.fromUsername}</strong> mentioned you in a post</>
    return "New notification";
  };

  const getNotifLink = (n) => {
    if (n.type === "follow") return `/profile/${n.fromUid}`;
    if (n.postId) return `/post/${n.postId}`;
    return "/";
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <>
      {currentUser && <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />}
      <main className={styles.main}>
        <div className="container">
          <h1 className={styles.title}>Notifications</h1>
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <p className={styles.empty}>No notifications yet!</p>
            ) : (
              notifications.map((n) => (
                <Link key={n.id} href={getNotifLink(n)} className={`${styles.notif} ${!n.read ? styles.unread : ""}`}>
                  <div className={styles.notifIcon}><NotifIcon type={n.type} /></div>
                  <div className={styles.notifAvatar}>
                    {n.fromPhoto ? (
                      <img src={n.fromPhoto} alt={n.fromUsername} className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarFallback}>{n.fromUsername?.[0]?.toUpperCase() ?? "?"}</div>
                    )}
                  </div>
                  <div className={styles.notifBody}>
                    <p className={styles.notifText}>{getNotifText(n)}</p>
                    {n.preview && <p className={styles.notifPreview}>{n.preview}</p>}
                    <p className={styles.notifTime}>
                      {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : "just now"}
                    </p>
                  </div>
                  {!n.read && <div className={styles.unreadDot} />}
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
