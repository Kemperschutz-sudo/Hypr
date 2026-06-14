"use client";
// app/hashtag/page.jsx

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Post from "@/components/Post";
import styles from "./hashtag.module.css";

function HashtagContent() {
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag") || "";
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists() && snap.data().username) setUsername(snap.data().username);
      }
    });
  }, []);

  useEffect(() => {
    if (!tag) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(p => p.content?.toLowerCase().includes(`#${tag.toLowerCase()}`));
      setPosts(filtered);
      setLoading(false);
    });
    return unsub;
  }, [tag]);

  return (
    <>
      {currentUser && <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />}
      <main className={styles.main}>
        <div className="container">
          <div className={styles.header}>
            <h1 className={styles.title}>#{tag}</h1>
            {!loading && <p className={styles.count}>{posts.length} post{posts.length !== 1 ? "s" : ""}</p>}
          </div>
          <div className={styles.feed}>
            {loading ? (
              <div className={styles.spinner} />
            ) : posts.length === 0 ? (
              <p className={styles.empty}>No posts with #{tag} yet.</p>
            ) : (
              posts.map(post => currentUser ? <Post key={post.id} post={post} currentUser={currentUser} /> : null)
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function HashtagPage() {
  return (
    <Suspense>
      <HashtagContent />
    </Suspense>
  );
}