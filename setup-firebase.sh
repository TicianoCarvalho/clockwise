#!/bin/bash

# ClockWise Firebase Project Setup Script
# This script helps you quickly set up your local environment for the ClockWise project.

echo "--- ClockWise Firebase Setup ---"

# 1. Ensure Firebase CLI is installed globally
echo "Checking for Firebase CLI..."
if ! command -v firebase &> /dev/null
then
    echo "Firebase CLI not found. Installing globally via npm..."
    npm install -g firebase-tools
else
    echo "Firebase CLI is already installed."
fi

# 2. Log in to Firebase
echo -e "\nLogging into Firebase... Please follow the prompts in your browser."
firebase login

# 3. Add the project alias for ClockWise on the Blaze Plan
# NOTE: Replace 'clockwise-blaze-project-id' with your actual Firebase project ID.
PROJECT_ID="clockwise-blaze-project-id" # <-- REPLACE THIS

echo -e "\nThis script will now try to associate this directory with the Firebase project: $PROJECT_ID"
echo "If you have access, select it from the list. If not, you can add it manually later."
firebase use --add

# 4. Install dependencies for the Next.js app
echo -e "\nInstalling Next.js project dependencies..."
npm install

# 5. Install dependencies for the Cloud Functions
echo -e "\nInstalling Cloud Functions dependencies..."
cd functions
npm install
cd ..

echo -e "\n--- Setup Complete! ---"
echo "You can now run the app with 'npm run dev' and deploy functions with 'firebase deploy --only functions'."
