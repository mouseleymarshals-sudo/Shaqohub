# Google Sign-In Setup Guide for TeachLink

This guide walks you through setting up Google Sign-In for your TeachLink app. You need to do these steps manually because they require logging into Google and your Supabase dashboard with your own account.

## Prerequisites

- A Google account (any Gmail account works — create one at gmail.com if you don't have one)
- Your Supabase project URL: check your `.env` file for `VITE_SUPABASE_URL`

---

## Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Sign in with your Google account
3. Click the project dropdown at the top (it might say "Select a project")
4. Click "New Project"
5. Name it "TeachLink" and click "Create"
6. Wait for it to finish, then select it from the dropdown at the top

## Step 2: Configure the OAuth Consent Screen

1. In the left menu, go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" and click "Create"
3. Fill in the app information:
   - **App name:** TeachLink
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click "Save and Continue"
5. On the "Scopes" page, click "Add or Remove Scopes"
6. Search for and add these scopes:
   - `.../auth/userinfo.email` (openid)
   - `.../auth/userinfo.profile`
7. Click "Save and Continue"
8. On the "Test users" page, add your own email address
9. Click "Save and Continue"

## Step 3: Create OAuth 2.0 Credentials

1. In the left menu, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Name it "TeachLink Web Client"
5. Under "Authorized redirect URIs", click "Add URI" and paste:

   ```
   https://YOUR-SUPABASE-PROJECT-REF.supabase.co/auth/v1/callback
   ```

   Replace `YOUR-SUPABASE-PROJECT-REF` with your Supabase project reference. Find this in your `.env` file — it's the part of the URL before `.supabase.co`. For example, if your URL is `https://abc123.supabase.co`, your project ref is `abc123`.

6. Click "Create"
7. A dialog appears with your **Client ID** and **Client Secret**. Copy both — you'll need them in the next step.

## Step 4: Add Google Credentials to Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Open your project
3. In the left menu, go to "Authentication" > "Providers"
4. Find "Google" and click to expand it
5. Toggle the "Enable Google" switch to ON
6. Paste your **Client ID** into the "Client ID" field
7. Paste your **Client Secret** into the "Client Secret" field
8. Copy the "Redirect URL" shown in Supabase (it should match what you entered in Step 3)
9. Click "Save"

## Step 5: Configure Redirect URLs in Supabase

1. In your Supabase dashboard, go to "Authentication" > "URL Configuration"
2. Under "Redirect URLs", add these URLs:
   - Your published Bolt URL (e.g., `https://your-app.bolt.host`)
   - `http://localhost:5173` (for local testing)
3. Set the "Site URL" to your published Bolt URL
4. Click "Save"

## Step 6: Test Google Sign-In

1. Open your app (published or running locally)
2. Go to the login page
3. Click "Continue with Google"
4. You should be redirected to Google to sign in
5. After signing in, you'll be redirected back to the app
6. A new profile is created automatically with your Google name and profile picture

---

## For the Android APK

Google Sign-In inside the APK works through the web browser. When a user taps "Continue with Google", the app opens the phone's browser for the Google login, then redirects back to the app. Make sure your published web URL is in the Supabase redirect allow list (Step 5 above).

---

## Troubleshooting

**Error: "Google sign-in is not yet configured"**
- Google is not enabled in your Supabase project. Follow Steps 1-4 above.

**Error: "redirect_uri_mismatch"**
- The redirect URL in Google Cloud Console doesn't match your Supabase callback URL. Make sure the redirect URI in Step 3 exactly matches the Supabase callback URL.

**Google sign-in works on web but not in the APK**
- Make sure your published Bolt URL is in the Supabase redirect allow list (Step 5).
