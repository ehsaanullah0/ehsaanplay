<img width="1024" height="491" alt="image" src="https://github.com/user-attachments/assets/65d22b9f-9d77-430f-922f-bb7d4b4416bd" />


# EHSAAN PLAY • Cloud Sync Activation Guide

---

## ☁️ Why Is Supabase Setup & Account Registration Required?

EHSAAN PLAY is designed around a **Local-First Architecture with Optional Cloud Synchronization**.

Your personal movie and TV library works without an account. Cloud synchronization is an optional feature that lets you access your library across multiple devices.

### 1. Complete Local Privacy

Without cloud synchronization, your personal library remains stored locally in your browser/device.

You can continue using EHSAAN PLAY without registering or connecting to Supabase.

### 2. Your Own Supabase Database

EHSAAN PLAY uses a Bring Your Own Database (BYOD) approach.

You provide your own:

- Supabase Project URL
- Supabase Publishable Key

Your personal library metadata is synchronized through your own Supabase project rather than a shared EHSAAN PLAY database.

### 3. Secure Account-Based Data Isolation

Connecting Supabase establishes the database connection, but registering and signing in establishes your personal authenticated session.

Supabase Row Level Security (RLS) protects user data by restricting database access to the authenticated account.

### 4. Lightweight Metadata-Only Synchronization

EHSAAN PLAY synchronizes personal library information rather than uploading large artwork files.

Synchronized information includes:

- Movie and TV series library entries
- Watchlist and watched status
- Episode and season progress
- Personal ratings
- Personal notes
- Custom lists
- Relevant library preferences

Movie posters and backdrops are handled separately through TMDB artwork retrieval and browser caching.

**Your library metadata is synchronized, not your entire artwork collection.**

### Activation Flow

```text
        EHSAAN PLAY
              |
              v
    1. Connect Supabase
       Project URL + Key
              |
              v
    2. Configure Database
       Run EHSAAN PLAY SQL
              |
              v
    3. Verify Database Setup
              |
              v
    4. Register Personal Account
       Email + Password
              |
              v
    5. Sign In
              |
              v
       CLOUD SYNC ACTIVE
```

---

## 🚀 Step-by-Step Activation Walkthrough

### Step 1: Create Your Supabase Project

1. Open the official Supabase dashboard:
   https://supabase.com/dashboard
2. Sign in or create a Supabase account.
3. Create a new project.
4. Choose your project name and database password.
5. Select a suitable region.
6. Wait until your project has finished provisioning.

Keep your Supabase project dashboard accessible.

### Step 2: Connect Your Supabase Project to EHSAAN PLAY

1. Open EHSAAN PLAY.
2. Navigate to **Settings → Cloud Database & Sync**.
3. Locate your Supabase connection settings.
4. Open your Supabase Dashboard.
5. Navigate to Project Settings → API Keys.
6. Copy the following information:

   - **Project URL:** Your Supabase project URL.
   - **Publishable Key:** Your project's publishable key.

7. Return to EHSAAN PLAY.
8. Enter the Project URL and Publishable Key into their respective fields.
9. Use the connection test option.
10. Save the connection settings.

**Important:** Use your project's Publishable Key (or legacy anon public key where supported). Never enter your Supabase service_role key or secret key into the browser application.

### Step 3: Configure the EHSAAN PLAY Database

Connecting Supabase alone does not create the tables required by EHSAAN PLAY.

You must initialize the database schema.

1. Open your EHSAAN PLAY repository.
2. Locate the SQL setup script corresponding to your installed application version.
3. Copy the complete SQL script.
4. Open your Supabase Dashboard.
5. Navigate to SQL Editor.
6. Create a new query.
7. Paste the EHSAAN PLAY SQL setup script.
8. Execute the query.
9. Wait for the SQL execution to finish successfully.

**Important:**

- Use the official EHSAAN PLAY schema, not a schema from another application.
- Do not manually rename or remove required tables.
- Make sure Row Level Security (RLS) policies are created successfully.
- Do not run an unrelated or outdated SQL script.

### Step 4: Verify Database Setup

After executing the SQL script:

1. Return to EHSAAN PLAY.
2. Open Settings → Cloud Database & Sync.
3. Locate **Verify Database Setup**.
4. Run the verification.
5. Wait for the application to check the required database structure and configuration.

If verification succeeds, proceed to account registration.

If verification fails, review the database setup and troubleshooting section below.

### Step 5: Register Your EHSAAN PLAY Account

Once your Supabase connection and database setup are ready:

1. Navigate to Settings → Cloud Database & Sync.
2. Locate the account registration section.
3. Select Register / Create Account.
4. Enter your details:

   - **Email Address:** Your personal email address.
   - **Password:** A secure password meeting the application's requirements.

5. Submit the registration form.
6. If email confirmation is enabled in your Supabase project, open your email inbox.
7. Find the Supabase confirmation email.
8. Click the confirmation link to verify your account.

Check your Spam or Junk folder if the email does not arrive.

### Step 6: Sign In & Activate Cloud Sync

After registration:

1. Return to EHSAAN PLAY.
2. Open Settings → Cloud Database & Sync.
3. Switch to Sign In.
4. Enter your registered email address and password.
5. Submit the login form.
6. Wait for authentication and synchronization initialization.

Once authentication and synchronization initialize successfully, your account can synchronize its personal library with your Supabase database.

**Cloud synchronization is now ready!**

---

## 🔄 How Cross-Device Synchronization Works

Once cloud synchronization is active:

1. Sign in using the same EHSAAN PLAY account on another device.
2. Connect that installation to the same Supabase project.
3. Complete database verification if required.
4. Sign in using the same account.
5. Allow the synchronization process to initialize.

Your library metadata can then be synchronized between authenticated devices.

### Example

```text
          YOUR SUPABASE PROJECT
                   |
          Personal User Database
                   |
             Account Session
                   |
          +--------+--------+
          |                 |
          v                 v
       DEVICE A          DEVICE B
       Laptop             Phone
          |                 |
          +--------+--------+
                   |
            Library Metadata
                Sync
```

Both devices use the same personal account and database.

**Note:** Artwork is handled independently. A device may need to retrieve posters and backdrops through TMDB rather than downloading another device's artwork cache.

---

## 🔐 Understanding Your Data & Privacy

EHSAAN PLAY follows a local-first and metadata-only synchronization approach.

| Data | Storage / Handling |
|---|---|
| Movie and series metadata | Local storage + cloud synchronization |
| Watchlist | Local storage + cloud synchronization |
| Watched status | Local storage + cloud synchronization |
| Episode progress | Local storage + cloud synchronization |
| Personal ratings | Local storage + cloud synchronization |
| Personal notes | Local storage + cloud synchronization |
| Custom lists | Local storage + cloud synchronization |
| Movie posters | TMDB / browser artwork cache |
| Backdrop images | TMDB / browser artwork cache |
| Artwork image blobs | Not uploaded as library sync payloads |

### Your Data Protection

- Your Supabase project belongs to you.
- Your account authenticates access to your personal library.
- Database access is protected through Row Level Security.
- The application does not require a shared EHSAAN PLAY cloud account.
- Local library functionality remains available without cloud synchronization.

Never share your Supabase secret or service_role key.

---

## 🛠️ Troubleshooting Common Errors

### "Invalid login credentials"

**Cause:** The email or password is incorrect, or the account has not been properly confirmed.

**Fix:**
1. Verify your email address.
2. Check your password.
3. Confirm your email if verification is enabled.
4. Try signing in again.

### "Email not confirmed"

**Cause:** Supabase requires email verification before authentication.

**Fix:**
1. Open your email inbox.
2. Find the Supabase signup confirmation message.
3. Click the verification link.
4. Return to EHSAAN PLAY and sign in again.

### "Database verification failed"

**Cause:** Required database tables, columns, policies, or other schema elements may be missing or incorrectly configured.

**Fix:**
1. Open Supabase SQL Editor.
2. Check whether the official EHSAAN PLAY SQL setup script executed successfully.
3. Verify that the database schema matches your application version.
4. Check the database verification result.
5. Correct any missing setup requirements before retrying.

### "Permission denied" / "RLS policy violation"

**Cause:** The database security policies may be missing, incorrectly configured, or rejecting the current user's access.

**Fix:**
1. Open Supabase Dashboard.
2. Navigate to Database → Tables.
3. Check that RLS is enabled on the required user-data tables.
4. Verify that the official EHSAAN PLAY RLS policies have been installed.
5. Confirm that you are signed in with the intended account.

Do not solve RLS errors by disabling database security or granting unrestricted access.

### "Supabase connection failed"

**Cause:** Incorrect project credentials, network connectivity problems, or an unavailable/paused Supabase project.

**Fix:**
1. Verify your Project URL.
2. Verify your Publishable Key.
3. Check your internet connection.
4. Check the Supabase project status.
5. Retry the connection test.

### "User already registered"

**Cause:** An account with this email address already exists in your Supabase project.

**Fix:**

Switch from Register to Sign In and use your existing account.

### "Cloud sync is not updating"

**Cause:** Authentication, database configuration, connectivity, or synchronization initialization may be incomplete.

**Fix:**
1. Check your authentication status.
2. Confirm that database verification succeeds.
3. Check your Supabase project availability.
4. Inspect application synchronization errors.
5. Retry synchronization after resolving the underlying issue.

---

## 💡 Important Recommendations

1. Keep your Supabase credentials private.
2. Never expose your service_role key in the application.
3. Use the official, version-matched EHSAAN PLAY SQL schema.
4. Keep RLS enabled.
5. Use the same Supabase project and account across devices.
6. Maintain a local library backup before major database changes.
7. Do not delete your local library when troubleshooting cloud synchronization.

---

## ❤️ Final Note

EHSAAN PLAY is designed to work independently, even without an internet connection or cloud account.

Supabase synchronization is an optional extension that makes your personal library accessible across devices.

You own your database.

You control your account.

Your personal library remains yours.

**EHSAAN PLAY — Your watchlist. Your taste. Your space.**
