## Can I create a pull request for Dockge?

Yes or no, it depends on what you will try to do. Since I don't want to waste your time, be sure to **create open a discussion, so we can have a discussion first**. Especially for a large pull request or you don't know if it will be merged or not.

Here are some references:

### ✅ Usually accepted:
- Bug fix
- Security fix
- Adding new language files (see [these instructions](https://github.com/louislam/dockge/blob/master/frontend/src/lang/README.md))
- Adding new language keys: `$t("...")`

### ⚠️ Discussion required:
- Large pull requests
- New features

### ❌ Won't be merged:
- A dedicated PR for translating existing languages (see [these instructions](https://github.com/louislam/dockge/blob/master/frontend/src/lang/README.md))
- Do not pass the auto-test
- Any breaking changes
- Duplicated pull requests
- Buggy
- UI/UX is not close to Dockge
- Modifications or deletions of existing logic without a valid reason.
- Adding functions that is completely out of scope
- Converting existing code into other programming languages
- Unnecessarily large code changes that are hard to review and cause conflicts with other PRs.

The above cases may not cover all possible situations.

I (@louislam) have the final say. If your pull request does not meet my expectations, I will reject it, no matter how much time you spend on it. Therefore, it is essential to have a discussion beforehand.

I will assign your pull request to a [milestone](https://github.com/louislam/dockge/milestones), if I plan to review and merge it.

Also, please don't rush or ask for an ETA, because I have to understand the pull request, make sure it is no breaking changes and stick to my vision of this project, especially for large pull requests.

## Project Styles

I personally do not like something that requires so many configurations before you can finally start the app.

- Settings should be configurable in the frontend. Environment variables are discouraged, unless it is related to startup such as `DOCKGE_STACKS_DIR`
- Easy to use
- The web UI styling should be consistent and nice
- No native build dependency

## Coding Styles

- 4 spaces indentation
- Follow `.editorconfig`
- Follow ESLint
- Methods and functions should be documented with JSDoc

## Name Conventions

- Javascript/Typescript: camelCaseType
- SQLite: snake_case (Underscore)
- CSS/SCSS: kebab-case (Dash)

## Tools

- [`Node.js`](https://nodejs.org/) >= 22.14.0
- [`git`](https://git-scm.com/)
- IDE that supports [`ESLint`](https://eslint.org/) and EditorConfig (I am using [`IntelliJ IDEA`](https://www.jetbrains.com/idea/))
- A SQLite GUI tool (f.ex. [`SQLite Expert Personal`](https://www.sqliteexpert.com/download.html) or [`DBeaver Community`](https://dbeaver.io/download/))

## Install Dependencies for Development

```bash
npm install
cp .env.example .env
```

Edit `.env` for ports and paths (`DOCKGE_PORT`, `DOCKGE_FRONTEND_PORT`, `DOCKGE_STACKS_DIR`, etc.). The backend loads `.env` via dotenv; Vite and `npm run dev` use the same file.

## Dev Server

Both frontend and backend must be running at the same time. The Vite frontend connects to the Socket.IO backend (`DOCKGE_PORT`). If you only start the frontend, the UI will show:

> Cannot connect to the socket server […] Reconnecting…

**Recommended** (starts both processes):

```bash
npm run dev
```

Or start them in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Then open `http://localhost:<DOCKGE_FRONTEND_PORT>` (default `5002`).

### macOS note (port 5000)

macOS often binds **AirPlay Receiver** to port `5000`. Keep `DOCKGE_FRONTEND_PORT` off `5000` and different from `DOCKGE_PORT`.

## Backend Dev Server

Binds to `DOCKGE_PORT` (default `5001`). Socket.IO + Express.

## Frontend Dev Server

Binds to `DOCKGE_FRONTEND_PORT` (default `5002`). Dev-only; production builds to `frontend-dist`.

You can use Vue.js devtools Chrome extension for debugging.

### Build the frontend

```bash
npm run build:frontend
```

## Production image from local source

The root `compose.yaml` pulls the published `louislam/dockge` image. To build and run from this checkout (local `./data` + `./stacks` via `.env`):

```bash
cp .env.example .env   # if you have not already
mkdir -p stacks data
docker compose -f compose.yaml up -d --build
```

Open `http://localhost:<DOCKGE_HOST_PORT>` (default `5001`).

### Tagging builds with Git commit hash

To tag images or pass the current Git commit hash into builds:

```bash
GIT_HASH=$(git rev-parse --short HEAD) docker compose -f compose.yaml up -d --build
```

- `$(git rev-parse --short HEAD)`: Resolves the 7-character Git commit hash.
- `GIT_HASH`: Exposes the hash as an environment variable for Compose.

To consume `GIT_HASH` in your services:

```yaml
# compose.yaml
services:
  app:
    build:
      context: .
      args:
        GIT_HASH: ${GIT_HASH:-dev}
    image: app:${GIT_HASH:-latest}
    environment:
      - GIT_HASH=${GIT_HASH:-dev}
```

```dockerfile
# Dockerfile
ARG GIT_HASH=unknown
ENV GIT_HASH=${GIT_HASH}
```

> **Note:** Dockge automatically inspects `.git` in stack directories and injects `GIT_HASH` into the environment during stack actions (`start`, `restart`).

## Database Migration

TODO

## Dependencies

Both frontend and backend share the same package.json. However, the frontend dependencies are eventually not used in the production environment, because it is usually also baked into dist files. So:

- Frontend dependencies = "devDependencies"
    - Examples: vue, chart.js
- Backend dependencies = "dependencies"
    - Examples: socket.io, sqlite3
- Development dependencies = "devDependencies"
    - Examples: eslint, sass

### Update Dependencies

Should only be done by the maintainer.

```bash
npm update
````

It should update the patch release version only.

Patch release = the third digit ([Semantic Versioning](https://semver.org/))

If for security / bug / other reasons, a library must be updated, breaking changes need to be checked by the person proposing the change.

## Translations

Please add **all** the strings which are translatable to `src/lang/en.json` (If translation keys are omitted, they can not be translated).

**Don't include any other languages in your initial Pull-Request** (even if this is your mother tongue), to avoid merge-conflicts between weblate and `master`.  
The translations can then (after merging a PR into `master`) be translated by awesome people donating their language skills.

If you want to help by translating Uptime Kuma into your language, please visit the [instructions on how to translate using weblate](https://github.com/louislam/uptime-kuma/blob/master/src/lang/README.md).

## Spelling & Grammar

Feel free to correct the grammar in the documentation or code.
My mother language is not English and my grammar is not that great.
