// Public web address of the game. Invites include it so friends without the app can join
// in a browser. Overridable at build time with EXPO_PUBLIC_WEB_URL (see eas.json / build-web).
export const WEB_URL: string = (process.env.EXPO_PUBLIC_WEB_URL || 'https://cutiermn-commits.github.io/Ludo_Mani/play').replace(/\/$/, '');
