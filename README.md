# Horse Barn Game

An iPad-friendly browser game with two phases:

1. Color a black-and-white horse.
2. Herd runaway horses into a red barn by dragging them.

After all horses are in the barn, the player can play again or return to customization.

## Tech Stack

- Plain HTML/CSS/JavaScript for the game UI and logic
- Cloudflare Workers with Static Assets for hosting
- Wrangler for local development and deployment

## Project Structure

- `index.html` - game UI, styles, and gameplay logic
- `wrangler.toml` - Cloudflare Worker configuration

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start local dev server:

```bash
npm run dev
```

## Deploy to Cloudflare Workers

### Option A: CLI Deploy

1. Authenticate Wrangler:

```bash
npx wrangler login
```

2. Deploy:

```bash
npm run deploy
```

### Option B: Cloudflare Workers Builds (Git-based)

1. Push this project to your Git provider.
2. In Cloudflare Dashboard, go to Workers & Pages and create a new Worker from Git.
3. Select this repository and branch.
4. If this game is inside a larger repository, set the Workers Build **Root directory** to the folder that contains `wrangler.toml`.
5. Use these build settings:
   - Install command: `npm install`
   - Build command: `npm run build`
6. Deploy command:
   - `npx wrangler deploy`
7. Save and trigger the first build.

## Notes

- The build step copies `index.html` into `dist/` for Cloudflare static asset serving.
- `wrangler.toml` uses static assets mode with SPA fallback (`not_found_handling = "single-page-application"`).
- If needed, change the `name` value in `wrangler.toml` before first deploy.
