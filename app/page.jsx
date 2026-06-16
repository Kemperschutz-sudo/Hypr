"use client";
// app/page.jsx — Main feed

import { useEffect, useState, useRef } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, query, orderBy, onSnapshot, limit,
  doc, getDoc, setDoc, getDocs,
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import CreatePost from "@/components/CreatePost";
import Post from "@/components/Post";
import styles from "./page.module.css";

const TABS = ["For You", "Following", "Liked"];

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState([]);
  const [activeTab, setActiveTab] = useState("For You");
  const [loading, setLoading] = useState(true);

  const [banned, setBanned] = useState(null);
  const [userCount, setUserCount] = useState(null);

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const PULL_THRESHOLD = 72;

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };
    const onTouchMove = (e) => {
      if (!isPulling.current) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        const clamped = Math.min(dy * 0.4, PULL_THRESHOLD);
        pullDistanceRef.current = clamped;
        setPullDistance(clamped);
      } else {
        isPulling.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };
    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistanceRef.current >= PULL_THRESHOLD * 0.85) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        setTimeout(() => window.location.reload(), 600);
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Load user count for landing page
  useEffect(() => {
    const loadCount = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUserCount(snap.size);
      } catch (err) {
        console.error(err);
      }
    };
    loadCount();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if banned
        const banSnap = await getDoc(doc(db, "bans", u.uid));
        if (banSnap.exists()) {
          const banData = banSnap.data();
          // Check if temp ban has expired
          if (!banData.permanent && banData.banUntil) {
            const banUntil = new Date(banData.banUntil);
            if (banUntil < new Date()) {
              // Ban expired — remove it
              await signOut(auth);
              setBanned(null);
            } else {
              setBanned(banData);
              setLoading(false);
              return;
            }
          } else {
            setBanned(banData);
            setLoading(false);
            return;
          }
        } else {
          setBanned(null);
        }

        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists() && snap.data().username) {
          setUsername(snap.data().username);
        } else {
          setUsername("");
        }
      } else {
        setUsername(null);
        setBanned(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Real-time posts feed
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Real-time following list
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setFollowing(snap.data().following ?? []);
    });
    return unsub;
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleChooseUsername = async () => {
    const trimmed = usernameInput.trim().toLowerCase().replace(/\s+/g, "_");
    if (!trimmed) return;
    if (trimmed.length < 3) { setUsernameError("Username must be at least 3 characters"); return; }
    if (!/^[a-z0-9_]+$/.test(trimmed)) { setUsernameError("Only letters, numbers, and underscores"); return; }
    setSavingUsername(true);
    setUsernameError("");
    try {
      const taken = await getDoc(doc(db, "usernames", trimmed));
      if (taken.exists()) { setUsernameError("Username already taken"); setSavingUsername(false); return; }
      await setDoc(doc(db, "users", user.uid), { username: trimmed, darkMode: true }, { merge: true });
      await setDoc(doc(db, "usernames", trimmed), { uid: user.uid });
      setUsername(trimmed);
    } catch (err) {
      console.error("Failed to save username:", err);
      setUsernameError("Something went wrong, try again");
    } finally {
      setSavingUsername(false);
    }
  };

  // Filter posts based on active tab
  const filteredPosts = () => {
    if (activeTab === "Following") {
      if (following.length === 0) return [];
      return posts.filter((p) => following.includes(p.authorId));
    }
    if (activeTab === "Liked") {
      return posts.filter((p) => p.likes?.includes(user?.uid));
    }
    return posts; // For You
  };

  if (loading) {
    return <div className={styles.splash}><div className={styles.spinner} /></div>;
  }

  // Banned screen
  if (banned) {
    return (
      <div className={styles.landing}>
        <div className={styles.landingInner}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <h1 style={{ color: "#ef4444" }}>You're banned</h1>
          <p style={{ color: "var(--text-muted)", maxWidth: 360, textAlign: "center", marginTop: 8 }}>
            {banned.message || "You have been banned from Hypr."}
          </p>
          {banned.banUntil && (
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 8 }}>
              Ban expires: {new Date(banned.banUntil).toLocaleDateString()}
            </p>
          )}
          {banned.permanent && (
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 8 }}>This ban is permanent.</p>
          )}
          <button className={`btn btn-ghost`} style={{ marginTop: 24 }} onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.landing}>
        <div className={styles.landingInner}>
          <svg className={styles.logoSvg} width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" transform="rotate(45 12 12)" />
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          </svg>
          <h1 className={styles.landingTitle}>Hypr</h1>
          {userCount !== null && (
            <div className={styles.userCountBadge}>
              <div className={styles.userCountDot} />
              {userCount.toLocaleString()} {userCount === 1 ? "member" : "members"} joined
            </div>
          )}
          <p className={styles.landingDesc}>Share moments. Follow people. Join the conversation.</p>
          <button className={`btn btn-primary ${styles.loginBtn}`} onClick={handleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (username === "") {
    return (
      <div className={styles.landing}>
        <div className={styles.landingInner}>
          <svg className={styles.logoSvg} width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" transform="rotate(45 12 12)" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
          <p>This is how people will find and mention you on Hypr.</p>
          <div className={styles.usernameForm}>
            <div className={styles.usernameInputRow}>
              <span className={styles.atSign}>@</span>
              <input
                className={styles.usernameInput}
                type="text"
                placeholder="yourname"
                value={usernameInput}
                onChange={(e) => { setUsernameInput(e.target.value); setUsernameError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleChooseUsername()}
                maxLength={30}
                autoFocus
              />
            </div>
            {usernameError && <p className={styles.usernameError}>{usernameError}</p>}
            <button
              className={`btn btn-primary ${styles.loginBtn}`}
              onClick={handleChooseUsername}
              disabled={!usernameInput.trim() || savingUsername}
            >
              {savingUsername ? "Saving…" : "Join Hypr"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayed = filteredPosts();

  return (
    <>
      {(pullDistance > 0 || refreshing) && (
        <div
          className={styles.pullIndicator}
          style={{
            transform: `translateX(-50%) translateY(${(refreshing ? PULL_THRESHOLD : pullDistance) - PULL_THRESHOLD}px)`,
            opacity: refreshing ? 1 : pullDistance / PULL_THRESHOLD,
          }}
        >
          <div className={`${styles.pullSpinner} ${refreshing ? styles.pullSpinnerActive : ""}`} />
        </div>
      )}
      <Navbar user={user} username={username} onLogout={handleLogout} onUsernameChange={setUsername} />
      <main className={styles.main}>
        <div className="container">
          <CreatePost user={user} username={username} />

          {/* Tabs */}
          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className={styles.feed}>
            {displayed.length === 0 ? (
              <div className={styles.empty}>
                {activeTab === "Following"
                  ? "Follow some people to see their posts here!"
                  : activeTab === "Liked"
                  ? "Posts you like will show up here."
                  : "No posts yet — be the first to share something!"}
              </div>
            ) : (
              displayed.map((post) => (
                <Post key={post.id} post={post} currentUser={user} />
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}