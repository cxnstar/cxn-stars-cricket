# CXN STARS Cricket Performance Dashboard

GitHub Pages frontend + Supabase database/authentication.

## Supabase
1. The HTML loads Supabase JS from jsDelivr.
2. `js/app.js` contains the project URL and publishable key.
3. Run `SUPABASE_SETUP.sql` in the Supabase SQL Editor after the base tables have been created.
4. Admin login uses Supabase Authentication.
5. Public users are read-only through RLS.
6. The admin account can add/edit/delete players and matches, mark PKR 400 monthly player dues paid, and record fund expenses.

Never put a Supabase service-role/secret key in the website.
