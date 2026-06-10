"use client";
// components/GifPicker.jsx

import { useState, useEffect, useRef } from "react";
import styles from "./GifPicker.module.css";

const GIPHY_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65"; // Giphy public beta key

export default function GifPicker({ onSelect, onClose, anchorRef }) {
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ bottom: 60, right: 16 });
  const ref = useRef(null);

  // Load trending on open
  useEffect(() => {
    fetchGifs("");
    // Calculate position
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const pickerHeight = 400;
      const pickerWidth = 320;
      const top = rect.top - pickerHeight - 8;
      const left = Math.min(rect.left, window.innerWidth - pickerWidth - 16);
      setPos({ top: Math.max(8, top), left: Math.max(8, left) });
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchGifs = async (q) => {
    setLoading(true);
    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error("Giphy failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (val.length === 0 || val.length > 2) fetchGifs(val);
  };

  return (
    <div className={styles.picker} ref={ref} style={{ top: pos.top, left: pos.left }}>
      <div className={styles.header}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search GIFs…"
          value={search}
          onChange={handleSearch}
          autoFocus
        />
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className={styles.grid}>
        {loading && <p className={styles.loading}>Loading…</p>}
        {!loading && gifs.length === 0 && <p className={styles.loading}>No GIFs found</p>}
        {gifs.map((gif) => (
          <button key={gif.id} className={styles.gifBtn} onClick={() => onSelect(gif.images.original.url)}>
            <img src={gif.images.fixed_height_small.url} alt={gif.title} className={styles.gif} loading="lazy" />
          </button>
        ))}
      </div>
      <p className={styles.poweredBy}>Powered by GIPHY</p>
    </div>
  );
}
