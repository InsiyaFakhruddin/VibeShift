# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Dependency note for contributors

- **Problem encountered:** `lucide-react` has a peer dependency that doesn't list React 19, which caused `npm install` to fail with an ERESOLVE peer dependency error in some environments.

- **Short-term / quick workaround:** run the installer with legacy peer-deps to bypass the strict peer dependency resolution:

```pwsh
npm install --legacy-peer-deps
```

- **Suggested permanent fixes (pick one):**
   - **Pin a compatible React version**: downgrade `react` to a version that `lucide-react` declares support for (for example `18.x`) and commit the change if you want full compatibility without flags.
   - **Upgrade or replace `lucide-react`**: check for a newer `lucide-react` release that supports React 19 and update `package.json` accordingly, or replace it with an alternative icon approach (SVG-only or another icon library that supports React 19).
   - **Keep current deps and document the installer flag**: continue using `react@19` and `lucide-react` together, but document the requirement to run `npm install --legacy-peer-deps` (this is what the project currently uses for local development).

- **CI recommendation:** ensure your CI uses the same install flag or lockfile (for example, generate an `npm-shrinkwrap.json` or ensure `npm ci` uses a lockfile that encodes the resolved tree) to avoid unexpected resolution failures in automated environments.

If you want, I can update `package.json` to pin or replace dependencies, and open a PR with the change.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
