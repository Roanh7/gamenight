# Game Night 🎮

Agenda + ranglijsten voor de gamenights van de vriendengroep.

- **Next.js** (App Router) + **Tailwind**
- **Supabase** voor accounts en database (`supabase/migrations/0001_init.sql`)
- Gehost op **Vercel**

## Uitnodigingscode
Nieuwe spelers hebben de groepscode nodig. Aanpassen: Supabase → Table Editor → `app_settings` → `invite_code`.

## Lokaal draaien
Maak `.env.local` met `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `npm install` en `npm run dev`.
