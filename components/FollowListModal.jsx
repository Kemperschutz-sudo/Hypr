"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import styles from "./FollowListModal.module.css";

export default function FollowListModal({ type, uids, currentUser, onClose }) {
  const [users, setUsers] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!uids || uids.length === 0) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }
    Promise.all(
      uids.map((uid) =>
        getDoc(doc(db, "users", uid)).then((snap) => ({
          uid,
          username: snap.data()?.username || "Unknown",
          photo: snap.data()?.photoURL || null,
        }))
      )
    ).then((results) => {
      setUsers(results);
      setLoadingUsers(false);
    });
  }, [uids]);

  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then((snap) => {
      const following = snap.data()?.following || [];
      const map = {};
      following.forEach((uid) => { map[uid] = true; });
      setFollowingMap(map);
    });
  }, [currentUser]);

  const toggleFollow = async (targetUid) => {
    if (!currentUser) return;
    const isFollowing = !!followingMap[targetUid];
    setFollowingMap((prev) => ({ ...prev, [targetUid]: !isFollowing }));
    const myRef = doc(db, "users", currentUser.uid);
    const targetRef = doc(db, "users", targetUid);
    if (isFollowing) {
      await updateDoc(myRef, { following: arrayRemove(targetUid) });
      await updateDoc(targetRef, { followers: arrayRemove(currentUser.uid) });
    } else {
      await setDoc(myRef, { following: arrayUnion(targetUid) }, { merge: true });
      await setDoc(targetRef, { followers: arrayUnion(currentUser.uid) }, { merge: true });
    }
  };

  const label = type === "followers" ? "Followers" : "Following";
  const emptyMsg = type === "followers" ? "No followers yet." : "Not following anyone yet.";

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{label}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.list}>
          {loadingUsers ? (
            <div className={styles.spinnerWrap}><div className={styles.spinner} /></div>
          ) : users.length === 0 ? (
            <p className={styles.empty}>{emptyMsg}</p>
          ) : (
            users.map((user) => (
              <div key={user.uid} className={styles.row}>
                <Link href={`/profile/${user.uid}`} onClick={onClose} className={styles.userInfo}>
                  {user.photo ? (
                    <Image src={user.photo} alt={user.username} width={40} height={40} className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarFallback}>{user.username[0]?.toUpperCase() ?? "?"}</div>
                  )}
                  <span className={styles.username}>@{user.username}</span>
                </Link>
                {currentUser && currentUser.uid !== user.uid && (
                  <button
                    className={followingMap[user.uid] ? styles.unfollowBtn : styles.followBtn}
                    onClick={() => toggleFollow(user.uid)}
                  >
                    {followingMap[user.uid] ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
