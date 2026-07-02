// 📁 src/services/keepalive.service.ts

/**
 * Service Keep-Alive pour empêcher le backend Render de s'endormir
 * Version améliorée avec gestion d'URL robuste
 */

// ✅ CONSTANTE UNIQUE - Sans /api en double
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ✅ Fonction utilitaire pour normaliser les URLs - CORRIGÉE
const normalizeUrl = (base: string, endpoint: string): string => {
  // Nettoyer le base URL (enlever les slashs en fin)
  let cleanBase = base.replace(/\/+$/, '');
  
  // Nettoyer l'endpoint (enlever les slashs en début)
  let cleanEndpoint = endpoint.replace(/^\/+/, '');
  
  // ✅ Si l'endpoint commence déjà par "api/", on le garde tel quel
  if (cleanEndpoint.startsWith('api/')) {
    return `${cleanBase}/${cleanEndpoint}`;
  }
  
  // ✅ Si le base contient déjà "api", on ne l'ajoute pas
  if (cleanBase.includes('/api')) {
    return `${cleanBase}/${cleanEndpoint}`;
  }
  
  // ✅ Cas général : ajouter "api" si nécessaire
  return `${cleanBase}/api/${cleanEndpoint}`;
};

// ✅ Fonction de log pour le debug
const logUrls = () => {
  console.log('📡 API_URL:', API_URL);
  console.log('📡 Exemples d\'URLs générées:');
  console.log(`   - /health → ${normalizeUrl(API_URL, '/health')}`);
  console.log(`   - /api/health → ${normalizeUrl(API_URL, '/api/health')}`);
  console.log(`   - /billing/health → ${normalizeUrl(API_URL, '/billing/health')}`);
  console.log(`   - /api/offers → ${normalizeUrl(API_URL, '/api/offers')}`);
};

interface KeepAliveConfig {
  interval: number;
  endpoints: string[];
  enabled: boolean;
  onPing?: (endpoint: string, status: number) => void;
  onError?: (endpoint: string, error: any) => void;
  onWakeUp?: () => void;
}

class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private wakeUpAttempts = 0;
  private maxWakeUpAttempts = 3;
  private _isBackendAwake = false;
  private pendingPings: Set<string> = new Set();

  private config: KeepAliveConfig = {
    interval: 3 * 60 * 1000, // 3 minutes
    endpoints: [
      '/api/health',        // ✅ Test avec /api
      '/api/offers',        // ✅ Test offers
      '/billing/health',    // ✅ Test billing
      '/health',            // ✅ Test simple (fallback)
    ],
    enabled: true,
  };

  constructor(config?: Partial<KeepAliveConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.log('📡 Keep-Alive Service initialisé');
    logUrls();
  }

  /**
   * Démarrer le service Keep-Alive
   */
  start() {
    if (!this.config.enabled) {
      console.log('ℹ️ Keep-Alive désactivé');
      return;
    }

    if (this.isRunning) {
      console.log('ℹ️ Keep-Alive déjà en cours');
      return;
    }

    console.log('🔄 Démarrage du service Keep-Alive...');
    this.isRunning = true;
    this.wakeUpAttempts = 0;
    this._isBackendAwake = false;

    // Ping immédiat pour réveiller le backend
    this.wakeUpBackend();

    // Puis ping régulier
    this.intervalId = setInterval(() => {
      this.pingAll();
    }, this.config.interval);

    console.log(`✅ Keep-Alive actif (intervalle: ${this.config.interval / 1000}s)`);
  }

  /**
   * Réveiller le backend - tentative agressive avec plusieurs endpoints
   */
  private async wakeUpBackend() {
    console.log('🌙 [Wake-Up] Tentative de réveil du backend...');
    
    // ✅ Ordre des endpoints : les plus légers d'abord
    const wakeEndpoints = ['/api/health', '/health', '/billing/health'];
    
    for (const endpoint of wakeEndpoints) {
      try {
        const url = normalizeUrl(API_URL, endpoint);
        console.log(`🌙 [Wake-Up] Tentative sur ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ [Wake-Up] Backend réveillé via ${endpoint} (${response.status})`);
          this._isBackendAwake = true;
          this.wakeUpAttempts = 0;
          
          if (this.config.onWakeUp) {
            this.config.onWakeUp();
          }
          return;
        } else {
          console.warn(`⚠️ [Wake-Up] ${endpoint} a répondu ${response.status}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`⚠️ [Wake-Up] Timeout sur ${endpoint}`);
        } else {
          console.warn(`⚠️ [Wake-Up] Échec via ${endpoint}:`, error.message);
        }
      }
    }

    this.wakeUpAttempts++;
    console.log(`⚠️ [Wake-Up] Tentative ${this.wakeUpAttempts}/${this.maxWakeUpAttempts} échouée`);

    if (this.wakeUpAttempts < this.maxWakeUpAttempts) {
      setTimeout(() => this.wakeUpBackend(), 3000);
    } else {
      console.log('⏳ [Wake-Up] Backend toujours endormi, continuera les pings réguliers');
      this.wakeUpAttempts = 0;
    }
  }

  /**
   * Pinger tous les endpoints configurés
   */
  private async pingAll() {
    const timestamp = new Date().toISOString();
    
    if (!this._isBackendAwake) {
      console.log(`📡 [${timestamp}] Ping Keep-Alive (tentative de réveil)...`);
      await this.wakeUpBackend();
      return;
    }

    console.log(`📡 [${timestamp}] Ping Keep-Alive...`);
    this.pendingPings = new Set(this.config.endpoints);

    const pingPromises = this.config.endpoints.map(endpoint => 
      this.pingEndpoint(endpoint)
    );

    await Promise.allSettled(pingPromises);
  }

  /**
   * Pinger un endpoint spécifique - CORRIGÉ
   */
  private async pingEndpoint(endpoint: string) {
    try {
      // ✅ Utilisation de normalizeUrl pour éviter le double /api
      const url = normalizeUrl(API_URL, endpoint);
      
      console.log(`📡 Ping: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'SantéPlus-KeepAlive/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.pendingPings.delete(endpoint);

      if (response.ok) {
        console.log(`✅ Ping OK: ${endpoint} (${response.status})`);
        if (this.config.onPing) {
          this.config.onPing(endpoint, response.status);
        }
        this._isBackendAwake = true;
      } else {
        console.warn(`⚠️ Ping: ${endpoint} (${response.status})`);
        this._isBackendAwake = false;
        if (this.config.onError) {
          this.config.onError(endpoint, { status: response.status });
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⚠️ Ping timeout: ${endpoint}`);
      } else {
        console.warn(`⚠️ Ping échoué: ${endpoint}`, error.message);
      }
      this._isBackendAwake = false;
      this.pendingPings.delete(endpoint);
      if (this.config.onError) {
        this.config.onError(endpoint, error);
      }
    }
  }

  /**
   * Arrêter le service Keep-Alive
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this._isBackendAwake = false;
    console.log('⏹️ Keep-Alive arrêté');
  }

  /**
   * Vérifier si le service est actif
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Vérifier si le backend est réveillé
   */
  isBackendAwake(): boolean {
    return this._isBackendAwake;
  }

  /**
   * Obtenir la configuration
   */
  getConfig(): KeepAliveConfig {
    return { ...this.config };
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(config: Partial<KeepAliveConfig>) {
    this.config = { ...this.config, ...config };
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Ping manuel immédiat
   */
  async pingNow(): Promise<boolean> {
    console.log('🔄 Ping manuel...');
    await this.wakeUpBackend();
    return this._isBackendAwake;
  }
}

// ✅ Singleton avec configuration optimisée
export const keepAliveService = new KeepAliveService({
  enabled: true,
  interval: 3 * 60 * 1000, // 3 minutes
  endpoints: [
    '/api/health',
    '/api/offers',
    '/billing/health',
    '/health',
  ],
});

// ✅ Initialisation
export const initKeepAlive = () => {
  console.log('🚀 Initialisation Keep-Alive');
  
  // ✅ Afficher les URLs qui seront utilisées
  logUrls();
  
  keepAliveService.start();
  
  // Ping après 1 seconde pour réveiller immédiatement
  setTimeout(() => {
    keepAliveService.pingNow();
  }, 1000);
};

// ✅ Préchargement du backend (à appeler sur la page de login)
export const preheatBackend = async (): Promise<boolean> => {
  console.log('🔥 Préchargement du backend...');
  return await keepAliveService.pingNow();
};

export default keepAliveService;
