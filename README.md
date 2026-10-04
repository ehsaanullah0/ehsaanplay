<div align="center">
<img width="180" height="180" alt="icon" src="https://github.com/user-attachments/assets/f9948882-08cb-4527-b673-7decae6b6068" />

# EHSAAN PLAY

# **Your watchlist. Your taste. Your space.**
# [ehsaanplay.ai.studio](https://ehsaanplay.ai.studio/)
### **EHSAAN PLAY is a personal, local-first movie and series management app designed to make tracking what you watch feel simple, calm, and enjoyable.**

<p align="center">  
<a href="https://www.youtube.com/watch?v=gPZd-t4EcNs" target="_blank">
  <img
    width="200"
    src="https://github.com/user-attachments/assets/bf633cc6-a8ed-4fca-b7b1-1aef2df991d3"
    alt="Watch EHSAAN MOVIE Demo Video"
  />
</a>

<p>
  <a href="https://ehsaancolour.ai.studio/" target="_blank">
    <img height="70" src="https://github.com/user-attachments/assets/102323a5-e5f2-4174-8a25-7be76d1ef7d3" />
  </a>
  <a href="https://ehsaanflow.ai.studio/" target="_blank">
    <img height="70" src="https://github.com/user-attachments/assets/934bccf2-cafa-4494-a773-dd315ab51ccf" />
  </a>
  <a href="https://ehsaanqr.ai.studio/" target="_blank">
    <img height="70" src="https://github.com/user-attachments/assets/1f63c7f3-7c86-45fd-9af6-ed9b14805820" />
  </a>
  <a href="https://ehsaanmovie.ai.studio/" target="_blank">
   <img height="70" src="https://github.com/user-attachments/assets/7e3c4963-7c62-4175-9a77-b389a78a42e6" />
  </a>
  <a href="https://ehsaancompress.ai.studio/" target="_blank">
   <img height="70" src="https://github.com/user-attachments/assets/de9dd1ed-3480-442f-af74-62c3924dd747" />
</p>
<br>

</div>

---

## ✨ What is EHSAAN PLAY?

EHSAAN PLAY brings your personal movie and series collection into one clean interface.

You can:

* 🎬 Discover movies and TV series
* 🔎 Search titles using TMDB
* ❤️ Build your personal watchlist
* ✅ Track watched movies and episodes
* ⭐ Give your own ratings
* 📝 Add personal notes
* 📚 Organize titles into custom lists
* 🎨 Customize your experience
* 📊 Keep track of your viewing progress
* 📱 Use it as an installable PWA

Everything is designed around one idea:

> **Your library should feel like yours.**

---

# PREVIEW OF APP

<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/703cfbec-5781-4205-b1ba-00f725236443" />

<img width="1366" height="605" alt="image" src="https://github.com/user-attachments/assets/367acd6c-a606-44ec-897e-12776918d48a" />

<img width="1365" height="754" alt="image" src="https://github.com/user-attachments/assets/c230d554-9efb-45e5-a0b6-052d02f8c9da" />

<details>
<summary>View More Screenshots</summary>

<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/3e669e86-9a89-4467-8769-b34b8eb2bdb1" />

<img width="1366" height="560" alt="image" src="https://github.com/user-attachments/assets/25dc9b63-706c-41b1-b600-4bca05ec3a77" />

<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/750616fd-4e8e-45ce-863f-31f5b6b0b47b" />

<img width="1366" height="558" alt="image" src="https://github.com/user-attachments/assets/ed8667e6-2747-4c8b-93a1-135347678dd0" />

<img width="1365" height="691" alt="image" src="https://github.com/user-attachments/assets/814ad037-95c0-4ead-acaa-7736e5558a66" />

<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/1348ff16-4233-44dc-852d-3328fd6004a0" />

<img width="1366" height="762" alt="image" src="https://github.com/user-attachments/assets/6b47fad8-f63f-4e8f-ba47-9de2467645f3" />

<img width="1366" height="754" alt="image" src="https://github.com/user-attachments/assets/4bb54cca-8388-4378-8e4a-023702c46831" />

</details>

## It is **not a streaming platform**. EHSAAN PLAY is a personal library for discovering, organizing, rating, and keeping track of movies and TV series.

---

### 🔒 Your data stays yours

EHSAAN PLAY does not require an account or personal cloud database for your library.

Personal data is stored locally in your browser/device.

---

## 🖼️ Smart Artwork Storage

Large movie libraries can become surprisingly heavy when posters and backdrops are permanently stored on the device.

EHSAAN PLAY therefore separates:

**Personal Data**

from

**TMDB Artwork**

Artwork can be fetched from TMDB when needed and handled through browser caching rather than unnecessarily storing large image files inside your personal library data.

This keeps your actual library data lightweight even when your collection grows significantly.

---

## 🎨 Design Philosophy

EHSAAN PLAY follows the EHSAAN design philosophy:

> **Make useful things. Make them feel good to use.**

The interface focuses on:

* Calm visual hierarchy
* Minimal controls
* Comfortable spacing
* Clean typography
* Subtle interactions
* Personal customization
* Dark and light themes
* A distraction-free browsing experience

No unnecessary dashboards.

No complicated menus.

Just your library.

---

```text
EHSAAN PLAY
│
├── 👤 PERSONAL USER DATA
│   │
│   ├── Watchlist & watched status
│   ├── Episode progress & seasonal checkmarks
│   ├── Star ratings & personal notes
│   ├── Custom lists & activities
│   └── Preferences & custom genre palettes
│
│   → Stored locally in browser localStorage
│   → Uses versioned storage keys
│   → Never stores base64 images or image blobs
│   → Compact JSON export for backup
│
└── 🎨 TMDB ARTWORK
    │
    ├── 🌐 ONLINE MODE · Default
    │   │
    │   ├── Posters & backdrops load from TMDB when needed
    │   ├── No intentional permanent image archive
    │   └── Helps prevent uncontrolled storage growth
    │
    └── 📦 OFFLINE MODE
        │
        ├── Artwork stored in a dedicated browser cache
        ├── "Download Artwork for My Library" ~ saves artwork for your library
        ├── Automatic cache capacity limits
        └── LRU-based trimming removes older unused artwork
```
---

## 🛠️ Technology

EHSAAN PLAY is built as a modern web application with a focus on browser-based storage and client-side functionality.

Core technologies include:

* HTML
* CSS
* JavaScript / TypeScript
* TMDB API
* Local browser storage
* Cache API
* Service Worker
* Progressive Web App technologies

---

## 🎞️ TMDB

Movie and TV information and artwork are provided through **[The Movie Database (TMDB)](https://www.themoviedb.org/)**.

### EHSAAN PLAY is **not affiliated with or endorsed by TMDB**.

---

## 🔐 Privacy

EHSAAN PLAY follows a simple principle:

> **Your personal library belongs to you.**

The application is designed so that personal library data can remain on your device.

### EHSAAN PLAY does not need a traditional user account or personal cloud database to manage your collection.

---

## 🗺️ Roadmap

Potential future improvements include:

* [ ] More advanced library filtering
* [ ] Better recommendation system
* [ ] Advanced statistics
* [ ] Improved episode tracking
* [ ] More customization options
* [ ] Better offline artwork management
* [ ] Storage optimization
* [ ] Enhanced PWA capabilities
* [ ] Additional personal library tools

The roadmap may change as EHSAAN PLAY evolves.

AN PLAY** — Your personal movie & series library

---

## 📄 License

## **This project is licencrd under GPN-3**

### Please[ check the repository license](https://github.com/ehsaanullah0/ehsaanplay/tree/main?tab=GPL-3.0-1-ov-file) before using, modifying, or redistributing the project.
<img width="2042" height="260" alt="temp-22-6-12-image_upscayl_2x_upscayl-lite-4x" src="https://github.com/user-attachments/assets/3ce2e126-3184-460b-80a4-e0c1254efb79" />

---

<div align="center">

## MADE BY EHSAAN ULLAH
**Make useful things. Make them feel good to use.**

# 💛 SUPPORT THE DEVELOPMENT
## [ CLICK HERE TO PAY DIRECTLY.](https://ehsaan.odoo.com/support)

<img width="250" height="250" alt="ehsaan-qr-1024x1024 (1)" src="https://github.com/user-attachments/assets/7139284e-c5e5-424a-bd52-aa71ccc392a8" />
</p>

<p align="center">
  <sub> If you find something useful here, a ⭐ is always appreciated. </sub>
</p>


## **EHSAAN ULLAH**

<a href="mailto:worsmon@gmail.com">
  <img src="https://img.shields.io/badge/Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email">
</a>
&nbsp;
<a href="https://github.com/ehsaanullah0">
  <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
</a>
&nbsp;
<a href="https://ehsaan.odoo.com/">
  <img src="https://img.shields.io/badge/Website-0A84FF?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Website">
</a>

<sub>Built with curiosity, too many tabs, and the occasional “let's see what happens.”</sub>

</div>
