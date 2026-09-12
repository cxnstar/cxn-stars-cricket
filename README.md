# CXN STARS — Cricket Performance Dashboard

A responsive, animated cricket team management website built with HTML, CSS and vanilla JavaScript.

## Included
- Modern responsive UI for mobile, laptop and large screens
- Animated hero section, buttons, cards and dashboard bars
- Day/Night theme toggle
- Dashboard with total players, runs, wickets, matches and win rate
- Win/Loss/Tie/No Result tracking
- Player profiles with photo upload
- Batting: runs, balls, dismissals, average, strike rate
- Bowling: wickets, overs, runs conceded, economy
- Match result recording with score, venue, best batter and bowler
- Batting, bowling and all-rounder rankings
- Leader page using the supplied captain photo
- Admin-only add/edit/delete controls
- Visitors can browse all public statistics without editing
- Data persists in the browser using localStorage

## Start
Just open `index.html` in a modern browser.

## Admin
Starter login:
- Username: `admin`
- Password: `CXNStars@2026`

IMPORTANT: This starter uses browser localStorage for its demo admin gate. It is NOT secure authentication for a public production website because the password is inside JavaScript. For real private admin access, connect Supabase Auth + Row Level Security before publishing.

## Files
- `index.html`
- `css/style.css`
- `js/app.js`
- `assets/captain.jpg`

## Reset data
Open browser DevTools Console and run:
`localStorage.removeItem("cxnStarsDataV1"); location.reload();`

## Production upgrade
For multi-device sync, real admin security, backups and members using different phones/computers, move players/matches to Supabase tables and use Supabase Auth + RLS. GitHub Pages can host the front end.
