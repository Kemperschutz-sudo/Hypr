"use client";
// app/profile/[id]/page.jsx

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Post from "@/components/Post";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setCurrentUser(u));
  }, []);

  // Fetch posts
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "posts"),
      where("authorId", "==", id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const userPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(userPosts);
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return unsub;
  }, [id, currentUser]);

  // Load profile data from users collection (includes custom photo)
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "users", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileData((prev) => ({
          ...prev,
          name: data.username || prev?.name,
          photo: data.photoURL || prev?.photo,
        }));
      }
    });
    return unsub;
  }, [id]);

  // Real-time follow data for this profile
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "users", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFollowers(data.followers ?? []);
        setFollowing(data.following ?? []);
      } else {
        setFollowers([]);
        setFollowing([]);
      }
    });
    return unsub;
  }, [id]);

  const isOwn = currentUser?.uid === id;
  const isFollowing = currentUser ? followers.includes(currentUser.uid) : false;

  const handleFollow = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    try {
      const profileRef = doc(db, "users", id);
      const myRef = doc(db, "users", currentUser.uid);

      // Ensure both user docs exist
      await setDoc(profileRef, { followers: [], following: [] }, { merge: true });
      await setDoc(myRef, { followers: [], following: [] }, { merge: true });

      if (isFollowing) {
        await updateDoc(profileRef, { followers: arrayRemove(currentUser.uid) });
        await updateDoc(myRef, { following: arrayRemove(id) });
      } else {
        await updateDoc(profileRef, { followers: arrayUnion(currentUser.uid) });
        await updateDoc(myRef, { following: arrayUnion(id) });
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}><div className={styles.spinner} /></div>;
  }

  return (
    <>
      {currentUser && (
        <Navbar user={currentUser} onLogout={() => signOut(auth)} />
      )}
      <main className={styles.main}>
        <div className="container">
          <div className={styles.profileCard}>
            <div className={styles.profileTop}>
              {profileData?.photo ? (
                <Image
                  src={profileData.photo}
                  alt={profileData?.name ?? "User"}
                  width={72}
                  height={72}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {profileData?.name?.[0] ?? "?"}
                </div>
              )}
              <div className={styles.profileInfo}>
                <h1 className={styles.name}>
                  {profileData?.name ?? "Unknown user"}
                </h1>
                <div className={styles.stats}>
                  <span><strong>{posts.length}</strong> post{posts.length !== 1 ? "s" : ""}</span>
                  <span><strong>{followers.length}</strong> follower{followers.length !== 1 ? "s" : ""}</span>
                  <span><strong>{following.length}</strong> following</span>
                </div>
              </div>
              {!isOwn && currentUser && (
                <button
                  className={`btn ${isFollowing ? styles.unfollowBtn : styles.followBtn}`}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
              {isOwn && (
                <span className={styles.badge}>Your profile</span>
              )}
            </div>
          </div>

          <div className={styles.posts}>
            {posts.length === 0 ? (
              <p className={styles.empty}>No posts yet.</p>
            ) : (
              posts.map((post) =>
                currentUser ? (
                  <Post key={post.id} post={post} currentUser={currentUser} />
                ) : null
              )
            )}
          </div>
        </div>
      </main>
    </>
  );
}
