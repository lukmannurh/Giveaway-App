<div align="center">
  <img src="public/icon-192.png" alt="Giveaway App Logo" width="120" />

  # 🎁 Giveaway App
  
  **A Neobrutalist Community Giveaway Platform**

  *Fair, transparent, and mobile-first giveaways for online communities.*

  [![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](#)
  [![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E?logo=supabase&logoColor=white)](#)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Neobrutalism-38B2AC?logo=tailwind-css&logoColor=white)](#)
</div>

<br />

## 🌟 Overview

The **Community Giveaway Platform** is a modern, mobile-first web application designed for online hobby and entertainment communities (anime, gaming, sports, Discord/WhatsApp groups). It allows users to create giveaway rooms, pick lucky numbers, and conduct secure server-side random drawings.

Built with an aggressive, high-contrast **Neobrutalism** aesthetic, it focuses on transparency, fairness, and a snappy user experience.

---

## ✨ Features

- **Multi-Method Authentication**: Secure sign-up/login via Google OAuth, standard Email & Password, or frictionless **Guest Access**.
- **Credits Economy**: Verified users get a daily allowance and starting balance. Room creation costs credits, preventing spam.
- **Fair Random Drawing**: Uses cryptographically secure RNG (`crypto.randomInt`) on the server to prevent cheating. Drawings are completely automated via Vercel Cron!
- **Neobrutalism UI**: Bold borders, hard shadows, vibrant colors, and high contrast. Looks amazing on mobile and desktop.
- **Dark & Light Mode**: Seamless theme toggling via `next-themes` that perfectly respects the brutalist aesthetic.
- **Progressive Web App (PWA)**: Installable directly to your mobile home screen (powered by `@serwist/next`).
- **Profile Management & Avatar Compression**: Manage your account and upload avatars with built-in client-side image compression.
- **Admin Dashboard**: Real-time analytics and platform metrics restricted to admin roles.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database, Auth & Storage**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom Neobrutalism tokens
- **PWA Integration**: [Serwist](https://serwist.build/)
- **Theme Management**: `next-themes`
- **Icons**: Custom SVG

---

## 🚀 Local Development Setup

Follow these steps to run the application locally on your machine.

### 1. Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- A [Supabase](https://supabase.com) account

### 2. Clone the Repository

```bash
git clone https://github.com/yourusername/giveaway-app.git
cd giveaway-app
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Supabase

1. Create a new project on Supabase.
2. Ensure you have the `users`, `rooms`, `participants`, `winners`, and `transactions` tables configured according to the database schema.
3. Enable Email/Password and Google OAuth authentication providers.
4. Create a public storage bucket named `avatars`.
5. Set up the `pg_cron` extension for the daily credits bonus.

### 5. Environment Variables

Create a `.env.local` file in the root directory and populate it with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Generate a random 32-character string for the cron token
CRON_SECRET=your_super_secret_cron_token_here
```

> **Warning:** Never commit your `.env.local` or expose your `SUPABASE_SERVICE_ROLE_KEY` to the public.

### 6. Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Security & Architecture

- **Row Level Security (RLS)** ensures data is isolated.
- **Server-Side Rendering** protects sensitive routes and logic.
- **Optimistic Locking** on the database prevents double-drawing race conditions.

---
