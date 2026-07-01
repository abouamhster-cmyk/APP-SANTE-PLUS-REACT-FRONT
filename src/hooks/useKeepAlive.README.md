# 📡 Keep-Alive Service

## Pourquoi ?

Le service Keep-Alive maintient votre backend Render actif en mode gratuit. Render met en veille les services après **15 minutes d'inactivité**. Ce service envoie des pings toutes les **4 minutes** pour garder le backend éveillé.

## Fonctionnalités

- ✅ Ping automatique toutes les 4 minutes
- ✅ Plusieurs endpoints pour plus de fiabilité
- ✅ Indicateur visuel dans l'interface
- ✅ Activation uniquement en production
- ✅ Détection des erreurs et reconnexion

## Utilisation

### 1. Dans `App.tsx`

```tsx
import { initKeepAlive } from '@/services/keepalive.service';

function App() {
  useEffect(() => {
    // Initialiser le Keep-Alive après l'authentification
    if (isAuthenticated) {
      initKeepAlive();
    }
  }, [isAuthenticated]);
}
