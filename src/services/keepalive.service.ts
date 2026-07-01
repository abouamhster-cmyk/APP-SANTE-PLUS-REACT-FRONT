// 📁 src/services/keepalive.service.ts

/**
 * Service Keep-Alive pour empêcher le backend Render de s'endormir
 * Version améliorée - démarre immédiatement, même sans authentification
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

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
  private _isBackendAwake = false; // ✅ RENOMMÉ AVEC UNDERSCORE
  private pendingPings: Set<string> = new Set();

  private config: KeepAliveConfig = {
    interval: 2.5 * 60 * 1000, // 2.5 minutes
    endpoints: [
      '/health',
      '/api/health',
      '/billing/health',
      '/api/offers',
    ],
    enabled: true,
  };

  constructor(config?: Partial<KeepAliveConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Démarrer le service Keep-Alive immédiatement
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

    console.log('🔄 Démarrage du service Keep-Alive (immédiat)...');
    this.isRunning = true;
    this.wakeUpAttempts = 0;
    this._isBackendAwake = false;

    // ✅ PING IMMÉDIAT - Réveille le backend
    this.wakeUpBackend();

    // Puis ping régulier
    this.intervalId = setInterval(() => {
      this.pingAll();
    }, this.config.interval);

    console.log(`✅ Keep-Alive actif (intervalle: ${this.config.interval / 1000}s)`);
  }

  /**
   * Réveiller le backend - tentative agressive
   */
  private async wakeUpBackend() {
    console.log('🌙 [Wake-Up] Tentative de réveil du backend...');
    
    const endpoints = ['/health', '/api/health', '/billing/health', '/api/offers'];
    
    for (const endpoint of endpoints) {
      try {
        const url = `${API_URL}${endpoint}`;
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
          console.log(`✅ [Wake-Up] Backend réveillé via ${endpoint}`);
          this._isBackendAwake = true;
          this.wakeUpAttempts = 0;
          
          if (this.config.onWakeUp) {
            this.config.onWakeUp();
          }
          return;
        }
      } catch (error) {
        console.warn(`⚠️ [Wake-Up] Échec via ${endpoint}`);
      }
    }

    this.wakeUpAttempts++;
    console.log(`⚠️ [Wake-Up] Tentative ${this.wakeUpAttempts}/${this.maxWakeUpAttempts} échouée`);

    if (this.wakeUpAttempts < this.maxWakeUpAttempts) {
      setTimeout(() => this.wakeUpBackend(), 2000);
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
   * Pinger un endpoint spécifique
   */
  private async pingEndpoint(endpoint: string) {
    try {
      const url = `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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
    } catch (error) {
      console.warn(`⚠️ Ping échoué: ${endpoint}`, error);
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
   * Vérifier si le backend est réveillé - PUBLIC
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

// ✅ Singleton - démarre immédiatement
export const keepAliveService = new KeepAliveService();

// ✅ Initialisation automatique - SANS AUTH
export const initKeepAlive = () => {
  console.log('🚀 Initialisation Keep-Alive (démarrage immédiat)');
  keepAliveService.start();
  
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
