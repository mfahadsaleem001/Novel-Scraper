# 📚 Novel Scraper & Reader Website

A full-stack **Novel Scraper and Online Novel Reader** built with **Python, Flask, HTML, CSS, and JavaScript**.

The project allows novels to be scraped from supported novel websites, stored as JSON files, managed through an admin-style interface, and displayed through a user-friendly online reading library.

---

## 🚀 Project Overview

The main purpose of this project is to build a complete novel management and reading system where:

* Novel information can be scraped from a novel website.
* Scraped novels are automatically saved as JSON files.
* Novel metadata such as title, author, genre, status, synopsis, and chapters is stored.
* Novel covers can be stored and displayed.
* Novels can also be added manually.
* Manually added and scraped novels can be edited.
* Chapters can be added, edited, or removed.
* Users can search novels by title or author.
* Users can filter novels by genre.
* Users can open a novel and read its chapters.
* The reading interface displays clean chapter content without unnecessary source/debug information.

---

## ✨ Features

### 🔍 Novel Scraping

The project includes a Python-based scraper using:

* `Requests`
* `BeautifulSoup`

The scraper extracts available novel information such as:

* Novel Title
* Author
* Genre
* Status
* Synopsis
* Cover Image
* Total Chapters
* Chapter Titles
* Chapter URLs
* Chapter Content

The scraped information is converted into structured JSON data.

---

### 📖 Online Novel Reader

Users can browse the available novels through a dedicated library.

Each novel provides:

* Cover image
* Title
* Author
* Genre
* Status
* Synopsis
* Total chapter count
* Chapter list
* Chapter reading interface

The reader displays the actual chapter content in a clean and readable format.

---

### 🔎 Search System

The website includes a search feature that allows users to search novels by:

* Novel title
* Author name

Search results update dynamically without requiring a page reload.

---

### 🏷️ Dynamic Genre Filtering

Genres are generated dynamically from the available novel JSON files.

This means new genres can automatically appear in the filter system when new novels are added.

Search and genre filtering can also work together.

---

### ✏️ Manual Novel Addition

Novels can also be added manually without scraping a website.

The manual novel form supports:

* Title
* Author
* Genre
* Status
* Synopsis
* Cover image upload
* Multiple chapters
* Chapter title
* Chapter content

This allows novels from other sources to be added directly to the system.

---

### 🖼️ Cover Image Upload

Manual novels support uploading cover images directly from the user's device.

Uploaded images are stored on the backend and served through the Flask server.

Supported image formats include:

* JPG
* JPEG
* PNG
* GIF
* WEBP

A preview of the selected cover is also displayed before submission.

---

### ✏️ Novel Editing

An editing system has been implemented for novels.

Novel information can be updated, including:

* Title
* Author
* Genre
* Status
* Synopsis
* Cover image
* Chapters

The chapter management system also allows:

* Editing existing chapters
* Removing chapters
* Adding new chapters

Both scraped and manually added novels can be edited.

---

### 📚 Chapter Management

The system supports complete chapter management.

Each chapter can contain:

* Chapter number
* Chapter title
* Chapter URL
* Chapter content

Administrators can add, edit, and remove chapters through the management interface.

---

### 🗂️ JSON-Based Data Storage

Novel data is stored in individual JSON files inside the `novels/` directory.

Example:

```text
novels/
├── novel_jackpot-of-vengeance.json
├── novel_jilted-heiress-marrying-the-untouchable-tycoon-novel.json
├── novel_the-goodbye-he-missed-novel.json
├── novel_the-mafia-princess-asked-for-a-beautiful-ashes-box-novel.json
├── novel_when-the-clouds-finally-break.json
└── novel_apparently-my-girlfriend-is-a-murderer.json
```

This makes the project simple to manage during development while keeping novel information structured.

---

## 🏗️ Project Architecture

The project is divided into three main parts:

```text
                    ┌─────────────────────┐
                    │   Novel Website     │
                    │ HTML / CSS / JS     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Flask Backend    │
                    │      REST API       │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │  Novel Scraper  │        │  JSON Storage   │
        │ Requests + BS4  │        │    /novels      │
        └─────────────────┘        └─────────────────┘
```

---

## 📁 Project Structure

```text
Novel Scraper/
│
├── backend/
│   ├── app.py
│   ├── main.py
│   ├── novels/
│   └── __pycache__/
│
├── novels/
│   ├── novel_jackpot-of-vengeance.json
│   ├── novel_jilted-heiress-marrying-the-untouchable-tycoon-novel.json
│   ├── novel_the-goodbye-he-missed-novel.json
│   ├── novel_the-mafia-princess-asked-for-a-beautiful-ashes-box-novel.json
│   ├── novel_when-the-clouds-finally-break.json
│   └── novel_apparently-my-girlfriend-is-a-murderer.json
│
├── website/
│   ├── index.html
│   ├── novel.html
│   ├── scraper.html
│   ├── manual_novel.html
│   ├── manual_novel.js
│   ├── manual_novel.css
│   ├── edit_novel.html
│   ├── edit_novel.js
│   ├── script.js
│   └── style.css
│
├── scraper.py
│
└── .venv/
```

---

## 🛠️ Technologies Used

### Backend

* Python
* Flask
* Flask-CORS
* Requests
* BeautifulSoup4
* JSON

### Frontend

* HTML5
* CSS3
* JavaScript
* Fetch API
* Responsive Design

### Storage

* JSON files
* Local image storage

### Development Tools

* VS Code
* Python Virtual Environment
* Git
* GitHub

---

## 🔌 Backend API

The Flask backend provides endpoints for interacting with the novel system.

### Get All Novels

```http
GET /novels
```

Returns the available novels from the `novels` directory.

---

### Get a Specific Novel

```http
GET /novel/<filename>
```

Returns the complete JSON data of a specific novel.

---

### Scrape a Novel

```http
POST /scrape
```

Accepts a novel URL and starts the scraping process.

Example request:

```json
{
    "url": "https://example.com/novel/example"
}
```

---

### Add Manual Novel

```http
POST /manual-novel
```

Adds a novel manually using form data.

It supports novel metadata, chapters, and cover image uploads.

---

### Edit Novel

```http
PUT /manual-novel/<filename>
```

Updates an existing novel's information and chapters.

---

### Serve Uploaded Covers

```http
GET /uploads/<path>
```

Used by the frontend to display uploaded cover images.

---

## 🧩 Main Website Pages

### `index.html`

The main public novel library.

It provides:

* Novel listing
* Search
* Genre filtering
* Novel cards
* Navigation to individual novels

---

### `novel.html`

The novel details and reading page.

It displays:

* Novel cover
* Title
* Author
* Genre
* Status
* Synopsis
* Chapter count
* Chapter list
* Chapter content

---

### `scraper.html`

The novel management page.

It allows the administrator to:

* Enter a novel URL
* Scrape a novel
* View the scraped result
* Open the novel
* Edit the novel
* View manually added novels
* Navigate to manual novel creation

---

### `manual_novel.html`

The manual novel creation page.

It allows the administrator to create a complete novel manually.

---

### `edit_novel.html`

The novel editing page.

It allows existing novels to be updated and their chapters to be managed.

---

## 🔄 Application Workflow

### Scraping Workflow

```text
Novel URL
    ↓
Flask /scrape Endpoint
    ↓
Python Scraper
    ↓
Requests
    ↓
BeautifulSoup
    ↓
Extract Novel Information
    ↓
Extract Chapters
    ↓
Extract Chapter Content
    ↓
Create JSON File
    ↓
Save in /novels
    ↓
Display Novel
```

---

### Manual Novel Workflow

```text
Manual Novel Form
        ↓
Novel Information
        ↓
Cover Image Upload
        ↓
Chapter Information
        ↓
POST /manual-novel
        ↓
Flask Backend
        ↓
Save Cover
        ↓
Create JSON
        ↓
Save Novel
        ↓
Display in Library
```

---

### Reading Workflow

```text
Novel Library
      ↓
Select Novel
      ↓
Novel Details
      ↓
Select Chapter
      ↓
Load Chapter Content
      ↓
Clean Reading Interface
      ↓
Read Chapter
```

---

## 📊 Novel Data Structure

A novel is stored in JSON format with information similar to:

```json
{
    "title": "Novel Title",
    "author": "Author Name",
    "genre": "Romance",
    "status": "Ongoing",
    "synopsis": "Novel description...",
    "cover_image": "cover-image-url",
    "total_chapters": 10,
    "chapters": [
        {
            "chapter_number": 1,
            "title": "Chapter 1",
            "url": "chapter-url",
            "content": "Chapter content..."
        }
    ]
}
```

The exact fields may vary depending on the source website and novel.

---

## 🧹 Chapter Content Cleaning

The scraper and reader system were developed to keep the reading experience clean.

Unwanted website elements such as:

* Source URLs
* Debug information
* Scraper-specific text
* Unnecessary website messages
* Premium/listen-mode notices

are not intended to appear as part of the actual chapter reading content.

The reader focuses on displaying the novel's chapter content.

---

## 📱 Responsive Design

The website interface is designed to work across different screen sizes.

The layout adapts for:

* Desktop
* Tablet
* Mobile

The management forms, novel cards, buttons, chapter sections, and navigation components use responsive CSS.

---

## 🎯 Current Project Status

### Completed

* [x] Python novel scraper
* [x] Requests integration
* [x] BeautifulSoup integration
* [x] Novel metadata extraction
* [x] Chapter extraction
* [x] Chapter content extraction
* [x] JSON novel storage
* [x] Flask backend
* [x] CORS configuration
* [x] Get all novels API
* [x] Get individual novel API
* [x] Scrape novel API
* [x] Manual novel API
* [x] Novel editing API
* [x] Cover image upload
* [x] Cover image preview
* [x] Manual novel creation
* [x] Chapter addition
* [x] Chapter editing
* [x] Chapter removal
* [x] Novel editing interface
* [x] Public novel library
* [x] Search by title
* [x] Search by author
* [x] Dynamic genre filtering
* [x] Combined search and filtering
* [x] Novel details page
* [x] Chapter list
* [x] Online chapter reader
* [x] Responsive frontend
* [x] Admin-style novel management interface

---

## 🔮 Future Improvements

Possible future improvements include:

* User authentication
* Admin authentication
* Database integration
* Reading progress tracking
* Bookmarks
* Favorites
* User accounts
* Pagination
* Advanced search
* Multiple scraper sources
* Automatic chapter updates
* Background scraping
* Deployment to a production server
* Cloud image storage
* Improved reader themes
* Dark/light reading modes
* Previous/Next chapter navigation
* Reading history

---

## ⚠️ Disclaimer

This project is developed for **educational and software engineering purposes**.

When scraping or displaying content from third-party websites, users should respect the target website's:

* Terms of Service
* Copyright policies
* Robots.txt rules
* Applicable laws and regulations

Only content that you have permission to access, store, and redistribute should be used in a production deployment.

---

## 👨‍💻 Author

**Muhammad Fahad Saleem**

BS Software Engineering Student
University of Haripur, Pakistan

### Skills Used in This Project

`Python` `Flask` `BeautifulSoup` `Requests` `HTML` `CSS` `JavaScript` `JSON` `REST API` `Web Scraping` `Frontend Development` `Backend Development`

---

## ⭐ Project Goal

The goal of this project is to transform a basic **novel scraping script** into a complete **novel management and reading platform** with a clean frontend, backend API, structured data storage, scraping functionality, manual content management, and an online reading experience.
