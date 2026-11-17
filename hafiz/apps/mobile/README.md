# HAFIZ Mobile (à venir) — React Native + Expo + TypeScript

Cette application n'est pas encore créée. L'architecture est prête pour elle :

- **Même API** : l'app mobile appellera exactement les mêmes routes REST/SSE que le Web
  (`/api/conversations`, `/api/conversations/:id/messages`, …).
- **Mêmes types** : importer `@hafiz/shared` (types `ChatMessage`, `ConversationSummary`,
  `ChatStreamEvent`, constantes `LIMITS`, etc.).
- **Même authentification** : `@supabase/supabase-js` avec un stockage de session
  `expo-secure-store`, puis envoi du jeton `Authorization: Bearer <access_token>` à l'API.
- **Streaming** : React Native ne fournit pas `ReadableStream` sur `fetch` ; utiliser
  `expo/fetch` (SDK 52+) qui le supporte, ou `react-native-sse`.

Création (le moment venu) :

```bash
npx create-expo-app@latest apps/mobile --template default
```

Puis ajouter `"apps/mobile"` dans `workspaces` du `package.json` racine.
