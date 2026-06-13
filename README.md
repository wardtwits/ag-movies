# CastLink

> Discover cast connections between movies, TV shows, and actors.

CastLink is an entertainment web app that helps users explore the relationships between actors, movies, and TV shows. Search for shared cast members between titles, discover which films actors have appeared in together, and uncover entertainment connections with ease.

**Live at:** [castlink.app](https://castlink.app)

## Features

- 🎬 **Actor-to-Actor Search**: Find all movies and TV shows where two actors have worked together
- 📺 **Title-to-Title Search**: Discover shared cast members between different movies or TV shows
- 🔗 **Cast Connections**: Explore how actors, shows, and movies are interconnected
- 📱 **Cross-Platform**: Works on web, iOS, and Android via Capacitor
- ⚡ **Fast & Responsive**: Built with React and Vite for quick performance

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: CSS
- **Build Tool**: Vite
- **Mobile**: Capacitor for iOS/Android support
- **Package Manager**: npm
- **Code Quality**: ESLint, TypeScript

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm
- Capacitor CLI (for mobile development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/wardtwits/ag-movies.git
   cd ag-movies
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173` (or the port shown in your terminal)

## Available Scripts

- `npm run dev` - Start development server with Vite
- `npm run build` - Compile TypeScript and build for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to GitHub Pages
- `npm run cap:copy` - Copy web build to Capacitor projects
- `npm run cap:sync` - Sync changes with Capacitor projects
- `npm run ios:sync` - Build and sync with iOS project
- `npm run ios:open` - Open iOS project in Xcode

## Project Structure

```
ag-movies/
├── src/              # Source code
├── dist/             # Production build output
├── public/           # Static assets
├── package.json      # Dependencies and scripts
└── tsconfig.json     # TypeScript configuration
```

## Development

### Code Quality

This project uses ESLint for code linting. Check for issues with:

```bash
npm run lint
```

### Building

To create a production build:

```bash
npm run build
```

The optimized build will be output to the `dist/` directory.

## Mobile Development

This project uses Capacitor to support iOS and Android:

- **iOS Development**: Run `npm run ios:open` to open the iOS project in Xcode
- **Android Development**: Use the Capacitor CLI to sync and build for Android

## Deployment

The app is configured to deploy to GitHub Pages:

```bash
npm run deploy
```

## License / Usage

This repository is publicly visible because the CastLink web app is hosted through GitHub Pages.

All source code, design, branding, copy, and assets in this repository are copyright © Chris Ward. All rights reserved.

You may view the source code for reference, but you may not copy, redistribute, publish, sell, rebrand, or use this project or its assets to create a competing or derivative product without written permission.

**CastLink is not open source.**

By accessing this repository, you agree to these terms. Unauthorized use or reproduction is prohibited and subject to legal action.

## Questions?

If you have questions about licensing or usage rights, please contact me directly.

---

Made with ❤️ by [@wardtwits](https://github.com/wardtwits)
