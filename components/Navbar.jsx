"use client";
// components/Navbar.jsx

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import styles from "./Navbar.module.css";

export default function Navbar({ user, username: initialUsername, onLogout, onUsernameChange }) {
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [displayUsername, setDisplayUsername] = useState(initialUsername || "");
  const [usernameInput, setUsernameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load user settings from Firestore
  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data.username) setDisplayUsername(data.username);
        if (data.darkMode !== undefined) {
          setDarkMode(data.darkMode);
          document.documentElement.setAttribute("data-theme", data.darkMode ? "dark" : "light");
        }
      }
    };
    load();
  }, [user.uid]);

  const toggleDarkMode = async () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    await setDoc(doc(db, "users", user.uid), { darkMode: next }, { merge: true });
  };

  const saveUsername = async () => {
    const trimmed = usernameInput.trim().toLowerCase().replace(/\s+/g, "_");
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { username: trimmed }, { merge: true });
      await setDoc(doc(db, "usernames", trimmed), { uid: user.uid });
      setDisplayUsername(trimmed);
      onUsernameChange?.(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setUsernameInput("");
    } catch (err) {
      console.error("Failed to save username:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
            <Link href={`/profile/${user.uid}`} className={styles.avatar}>
              {user.photoURL ? (
                <Image src={user.photoURL} alt={displayUsername || user.displayName} width={32} height={32} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback}>{(displayUsername || user.displayName)?.[0] ?? "?"}</div>
              )}
            </Link>
            <button className={`btn btn-ghost ${styles.editBtn}`} onClick={() => setShowSettings(true)} title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button className={`btn btn-ghost ${styles.logoutBtn}`} onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </nav>

      {showSettings && (
        <div className={styles.overlay} onClick={() => setShowSettings(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Settings</h2>
              <button className={styles.closeBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div className={styles.section}>
              <label className={styles.label}>Username</label>
              {displayUsername && <p className={styles.currentUsername}>Current: @{displayUsername}</p>}
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="New username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveUsername()}
                  maxLength={30}
                />
                <button className={`btn btn-primary ${styles.saveBtn}`} onClick={saveUsername} disabled={!usernameInput.trim() || saving}>
                  {saved ? "Saved!" : saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className={styles.section}>
              <label className={styles.label}>Appearance</label>
              <div className={styles.toggleRow}>
                <span className={styles.darkModeLabel}>
                  {darkMode ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                      Dark mode
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                      Light mode
                    </>
                  )}
                </span>
                <button className={`${styles.toggle} ${darkMode ? styles.toggleOn : styles.toggleOff}`} onClick={toggleDarkMode}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
