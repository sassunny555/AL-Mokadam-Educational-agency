# AL-Mokadam Educational Agency Website

A modern, premium website for AL-Mokadam Educational Agency - helping international students enroll in Malaysian universities.

## 🌐 Live Demo

Once deployed, your website will be available at:
`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## 🚀 Deployment Instructions

### GitHub Pages Deployment

1. **Create a GitHub Repository**
   - Go to [github.com](https://github.com) and create a new repository
   - Name it something like `al-mokadam-website`
   - Keep it public for free GitHub Pages hosting

2. **Upload Files**
   - Upload all files from this folder to your repository
   - Make sure the folder structure is preserved:
     ```
     ├── index.html
     ├── css/
     │   └── styles.css
     ├── js/
     │   ├── main.js
     │   └── firebase-config.js
     └── assets/
         └── images/
     ```

3. **Enable GitHub Pages**
   - Go to your repository's **Settings**
   - Scroll down to **Pages** (in left sidebar)
   - Under "Source", select **Deploy from a branch**
   - Select **main** branch and **/ (root)** folder
   - Click **Save**

4. **Wait for Deployment**
   - GitHub will automatically deploy your site
   - It may take a few minutes
   - Your site will be available at `https://YOUR-USERNAME.github.io/REPO-NAME/`

### Firebase Setup (For Contact Form)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Follow the setup wizard

2. **Enable Firestore**
   - Go to Firestore Database
   - Click "Create database"
   - Start in test mode (for development)

3. **Get Firebase Config**
   - Go to Project Settings > Your Apps
   - Click "Add app" and select Web (</>)
   - Register your app
   - Copy the config values

4. **Update firebase-config.js**
   - Open `js/firebase-config.js`
   - Replace the placeholder values with your Firebase config

5. **Add Firebase SDK to index.html**
   Add these scripts before your JS files:
   ```html
   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
   ```

## 📁 Project Structure

```
AL-Mokadam Educational agency/
├── index.html              # Main landing page
├── README.md               # This file
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── main.js             # Main JavaScript
│   └── firebase-config.js  # Firebase setup
└── assets/
    └── images/
        ├── logo.png
        ├── student-hero.jpeg
        ├── study-desk.jpeg
        └── students-group.jpg
```

## ✨ Features

- **Modern Design**: Clean white background with glassmorphism effects
- **Responsive**: Works on all devices (mobile, tablet, desktop)
- **Animations**: Smooth scroll animations and hover effects
- **Contact Form**: Firebase-ready contact form
- **SEO Optimized**: Proper meta tags and semantic HTML

## 🎨 Customization

### Update Colors
Edit the CSS variables in `css/styles.css`:
```css
:root {
    --primary-coral: #DF6951;    /* Main accent color */
    --primary-gold: #F1A501;     /* Secondary accent */
    --primary-navy: #14183E;     /* Dark text color */
}
```

### Update Content
- Edit `index.html` to change text, images, and sections
- Replace images in `assets/images/` with your own

### Update Contact Info
Search for these in `index.html`:
- `info@al-mokadam.edu` - Email address
- `+60 12-345-6789` - Phone number
- `123 Education Street, Kuala Lumpur` - Address

## 📝 License

© 2026 AL-Mokadam Educational Agency. All Rights Reserved.
