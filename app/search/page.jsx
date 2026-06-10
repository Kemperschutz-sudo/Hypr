"use client";
// app/search/page.jsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, orderBy, startAt, endAt, getDocs, doc, getDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import styles from "./search.module.css";

export default function SearchPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setCurrentUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().username) setUsername(snap.data().username);
    });
  }, []);

  const handleSearch = async () => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const usersRef = collection(db, "users");
      const snap = await getDocs(
        query(usersRef, orderBy("username"), startAt(q), endAt(q + "\uf8ff"))
      );
      const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setResults(users);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      {currentUser && <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />}
      <main className={styles.main}>
        <div className="container">
          <h1 className={styles.title}>Search</h1>

          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by username…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoFocus
            />
            <button className={`btn btn-primary ${styles.searchBtn}`} onClick={handleSearch} disabled={!searchInput.trim() || searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          <div className={styles.results}>
            {searched && results.length === 0 && !searching && (
              <p className={styles.empty}>No users found for "{searchInput}"</p>
            )}
            {results.map((user) => (
              <Link key={user.uid} href={`/profile/${user.uid}`} className={styles.userCard}>
                <div className={styles.avatar}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.username} className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarFallback}>{user.username?.[0]?.toUpperCase() ?? "?"}</div>
                  )}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userUsername}>
                    @{user.username}
                    {user.verified && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4, verticalAlign: "middle" }}>
                        <circle cx="12" cy="12" r="12" fill="#6366f1" />
                        <path d="M7 13l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {user.bio && <span className={styles.userBio}>{user.bio}</span>}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.arrow}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
