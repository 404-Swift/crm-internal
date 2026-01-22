# Custom CRM

A lightweight, modern CRM application built with React, TypeScript, Supabase, and Google Sheets integration. Features an Apple Human Interface Guidelines-inspired design with clean, minimal aesthetics.

## 🚀 Tech Stack

### Frontend
- **React 18+** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Apache ECharts** - Data visualization
- **TanStack Query** - Data fetching and caching
- **React Router v6** - Client-side routing

### Backend & Data
- **Supabase** - Authentication and PostgreSQL database
- **Google Sheets** - Primary data source (source of truth)
- **n8n** - Workflow automation for Sheets ↔ Supabase sync

### Architecture
- **Atomic Design** - Component organization (atoms, molecules, organisms, templates, pages)
- **Clean Architecture** - Separation of concerns (components, hooks, services, types)

## 📋 Features

- ✅ **Dashboard** - Key metrics and data visualizations
- ✅ **Contacts Management** - CRUD operations with search, filter, and sort
- ✅ **Deals Pipeline** - Kanban-style board with drag-and-drop
- ✅ **Activity Logging** - Track calls, emails, meetings, and notes
- ✅ **Authentication** - Email/password and magic link login
- ✅ **Responsive Design** - Mobile-first, optimized for desktop
- ✅ **Apple HIG Design** - Clean, minimal, professional UI

## 🏗️ Project Structure

```
custom-crm/
├── src/
│   ├── components/
│   │   ├── atoms/          # Basic building blocks
│   │   ├── molecules/       # Composite components
│   │   ├── organisms/      # Complex components
│   │   ├── templates/       # Page layouts
│   │   ├── pages/          # Route components
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and business logic
│   │   ├── supabase/       # Supabase client and services
│   │   └── charts/         # Chart configurations
│   ├── types/              # TypeScript type definitions
│   ├── contexts/           # React contexts
│   ├── routes/             # React Router setup
│   ├── lib/                # Utilities and constants
│   └── styles/             # Global styles
├── supabase/
│   └── migrations/         # Database migrations
└── docs/                   # Documentation
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account
- Google Sheets account (for data source)
- n8n (optional, for automation)

### 1. Clone and Install

```bash
git clone <repository-url>
cd custom-crm
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_SHEETS_ID=your_google_sheets_id
VITE_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
VITE_GOOGLE_SHEETS_ACCESS_TOKEN=your_oauth2_access_token
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

Get your Supabase credentials from your [Supabase Dashboard](https://app.supabase.com).

### 3. Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database migration:**
   - Open the Supabase SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the SQL

3. **Verify tables and RLS:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

4. **Configure Authentication:**
   - Enable Email provider in Authentication settings
   - Configure email templates (optional)
   - Set up redirect URLs for magic links

### 4. Google Sheets Setup

1. **Create a new Google Sheet** with three tabs:
   - `Contacts`
   - `Deals`
   - `Activities`

2. **Set up column headers** as described in `docs/google-sheets-schema.md`
   - Headers will be created automatically on first write, or you can add them manually

3. **Get your Google Sheets ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```

4. **Get Google Sheets API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google Sheets API
   - Create API Key in Credentials section

5. **Set up OAuth2 for write operations** (required for create/update/delete):
   - Create OAuth2 credentials in Google Cloud Console
   - Or use Service Account (recommended for production)
   - See `docs/google-sheets-integration.md` for details

6. **Add to `.env.local`:**
   ```env
   VITE_GOOGLE_SHEETS_ID=your_sheet_id
   VITE_GOOGLE_SHEETS_API_KEY=your_api_key
   VITE_GOOGLE_SHEETS_ACCESS_TOKEN=your_oauth2_token  # For writes
   ```

### 5. n8n Workflow Setup (Optional)

See `docs/n8n-workflows.md` for detailed instructions on setting up:
- Google Sheets → Supabase sync workflow
- Supabase → Google Sheets backup workflow

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📚 Documentation

- **[Supabase Schema](./docs/supabase-schema.md)** - Database structure and RLS policies
- **[Google Sheets Schema](./docs/google-sheets-schema.md)** - Sheets structure and setup
- **[Google Sheets Integration](./docs/google-sheets-integration.md)** - Direct API integration guide
- **[n8n Workflows](./docs/n8n-workflows.md)** - Advanced automation workflows (optional)

## 🎨 Design Principles

This CRM follows Apple's Human Interface Guidelines (HIG) principles:

- **Clarity** - Clear typography and information hierarchy
- **Deference** - Content is primary, UI supports it
- **Depth** - Subtle shadows and translucency for depth
- **Harmony** - Consistent spacing and alignment
- **Minimalism** - Clean, uncluttered interface

### Design Features

- System font stack (SF Pro on macOS, Segoe UI on Windows)
- Generous whitespace (8px grid system)
- Subtle shadows (no heavy Material shadows)
- Translucent backgrounds where appropriate
- Smooth transitions and hover states
- Clean cards with rounded corners (8-12px)

## 🚢 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Configure Environment Variables:**
   - Add all environment variables in Vercel dashboard
   - Redeploy after adding variables

### Other Platforms

The app can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any Node.js hosting

Build command: `npm run build`
Output directory: `dist`

## 🔒 Security

- **Row Level Security (RLS)** - Users can only access their own data
- **Environment Variables** - Never commit `.env.local`
- **Supabase Auth** - Secure authentication with JWT tokens
- **HTTPS Only** - Always use HTTPS in production

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier (recommended) for formatting
- Atomic design for component organization

## 📝 Data Flow

### Dual-Write Architecture

```
User Action (Create/Update/Delete)
    ↓
Write to Supabase (immediate, fast UI update)
    ↓
Background: Write to Google Sheets (source of truth)
    ↓
Reads: Always from Supabase (fast, cached)
```

**Benefits:**
- Fast UI updates (Supabase writes are instant)
- Google Sheets remains source of truth
- Graceful error handling (if Sheets write fails, Supabase still succeeds)
- Background sync doesn't block user experience

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For issues and questions:
1. Check the documentation in `docs/`
2. Review Supabase logs
3. Check n8n workflow execution logs
4. Review browser console for errors

## 🎯 Roadmap

- [ ] Contact import/export (CSV)
- [ ] Advanced filtering and sorting
- [ ] Email integration
- [ ] Calendar integration
- [ ] Custom fields
- [ ] Team collaboration features
- [ ] Mobile app (React Native)

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com) for component library
- [Supabase](https://supabase.com) for backend infrastructure
- [Apache ECharts](https://echarts.apache.org) for charts
- Apple Human Interface Guidelines for design inspiration
