# Production Planning Tool with Firebase Integration

A web-based application for visualizing and managing production plan performance. This tool allows you to track raw material receipts, daily production plans and actuals, and product splits between RP 101 Black, RP 106 White, and Non PP.

## Features

- **Raw Material Tracking**: Monitor Post Consumer Waste (PCW) and Post Industrial Waste (PIW) received per week
- **Daily Production Planning**: Plan and record actual production for each day of the week
- **Product Split Management**: Track the percentage split between RP 101 Black, RP 106 White, and Non PP products
- **Visual Reporting**: View a bar graph showing planned vs. actual production for each day of the month
- **Data Management**: Save, load, and export data to Excel

## How to Use

### Getting Started

1. Open `index.html` in a web browser to launch the application
2. The application will automatically load with sample data for demonstration purposes

### Raw Material Section

- Enter the amount of PCW and PIW received each week
- End of Week Stock can be manually entered
- Totals are calculated automatically

### Production Section

- Switch between "Planned" and "Actual" tabs to enter data
- Enter production values for each day of the week
- Weekly and monthly totals are calculated automatically

### Product Split Section

- Switch between "Planned" and "Actual" tabs to enter data
- Enter percentage splits for RP 101 Black and RP 106 White products
- Non PP percentage is automatically calculated to ensure the total equals 100%
- Tonnage values are calculated based on the percentages and production totals

### Monthly Overview Chart

- The chart displays planned vs. actual production for each day of the month
- Actual production is shown as bars
- Planned production is shown as dots

### Data Management

- Click "Save Data" to save your data to the browser's local storage
- Click "Load Data" to load previously saved data
- Click "Export to Excel" to download your data as a CSV file

## Technical Information

- Built with HTML, CSS, and JavaScript
- Uses Chart.js for data visualization
- Data is stored in Firebase Firestore for shared access across users
- Local storage is used as a fallback when offline

## Firebase Setup for GitHub Pages Hosting

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps to create a new project
3. Once your project is created, click on the web icon (</>) to add a web app to your project
4. Register your app with a nickname (e.g., "Production Planning Tool")
5. Copy the Firebase configuration object

### 2. Update Firebase Configuration

1. Open the `firebase-config.js` file in this project
2. Replace the placeholder configuration with your Firebase configuration

### 3. Set Up Firestore Database

1. In the Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in production mode or test mode (you can adjust security rules later)
4. Choose a location for your database that's closest to your users

### 4. Configure Firestore Security Rules

For a simple shared application, you can use these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // WARNING: This allows anyone to read/write
    }
  }
}
```

**Note:** These rules allow anyone to read and write to your database. For a production application, you should implement proper authentication and more restrictive rules.

### 5. Deploy to GitHub Pages

1. Create a GitHub repository for your project
2. Push your code to the repository
3. Go to the repository settings
4. Scroll down to the "GitHub Pages" section
5. Select the branch you want to deploy (usually `main` or `master`)
6. Click "Save"

Your application will be available at `https://[your-username].github.io/[repository-name]/`

## Browser Compatibility

This application works best in modern browsers such as:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Safari