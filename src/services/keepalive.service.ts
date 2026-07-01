// 📁 src/services/keepalive.service.ts

/**
 * Service Keep-Alive pour empêcher le backend Render de s'endormir
 * En mode gratuit, Render met en veille les services après 15 minutes d'inactivité
 * Ce service envoie des pings réguliers pour maintenir le service actif
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

interface KeepAliveConfig {
  interval: number; // Intervalle en millisecondes
  endpoints: string[]; // Endpoints à pinger
  enabled: boolean; // Activer/désactiver
  onPing?: (endpoint: string, status: number) => void;
  onError?: (endpoint: string, error: any) => void;
}

class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private config: KeepAliveConfig = {
    interval: 4 * 60 * 1000, // 4 minutes (Render endort après 15min)
    endpoints: [
      '/health',
      '/api/health',
      '/billing/health',
    ],
    enabled: true,
  };

  constructor(config?: Partial<KeepAliveConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
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

    // Ping immédiat au démarrage
    this.pingAll();

    // Puis ping régulier
    this.intervalId = setInterval(() => {
      this.pingAll();
    }, this.config.interval);

    console.log(`✅ Keep-Alive actif (intervalle: ${this.config.interval / 1000}s)`);
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
    console.log('⏹️ Keep-Alive arrêté');
  }

  /**
   * Pinger tous les endpoints configurés
   */
  private async pingAll() {
    const timestamp = new Date().toISOString();
    console.log(`📡 [${timestamp}] Ping Keep-Alive...`);

    for (const endpoint of this.config.endpoints) {
      await this.pingEndpoint(endpoint);
    }
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
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ Ping OK: ${endpoint} (${response.status})`);
        if (this.config.onPing) {
          this.config.onPing(endpoint, response.status);
        }
      } else {
        console.warn(`⚠️ Ping: ${endpoint} (${response.status})`);
        if (this.config.onError) {
          this.config.onError(endpoint, { status: response.status });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Ping échoué: ${endpoint}`, error);
      if (this.config.onError) {
        this.config.onError(endpoint, error);
      }
    }
  }

  /**
   * Vérifier si le service est actif
   */
  isActive(): boolean {
    return this.isRunning;
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
}

// ✅ Singleton
export const keepAliveService = new KeepAliveService();

// ✅ Initialisation automatique après l'authentification
export const initKeepAlive = () => {
  // Démarrer seulement en production
  if (import.meta.env.PROD) {
    console.log('🚀 Initialisation Keep-Alive (production)');
    keepAliveService.start();
  } else {
    console.log('ℹ️ Keep-Alive désactivé en développement');
  }
};

export default keepAliveService;
