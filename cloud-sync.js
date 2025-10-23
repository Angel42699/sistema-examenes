// cloud-sync.js - Sincronización MEJORADA con JSONBin.io
class CloudSync {
    constructor() {
        // TUS CREDENCIALES (mantenidas igual)
        this.BIN_ID = '68f87322ae596e708f23426f';
        this.API_KEY = '$2a$10$hBD/FgscmcLyfx3W1iJOjeXu6YDCLFkDL80CxEoRj.etaXSz/pN5e';
        
        this.isOnline = navigator.onLine;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
        
        this.init();
        console.log('☁️ CloudSync MEJORADO iniciado - Bin ID:', this.BIN_ID);
    }

    init() {
        // Escuchar cambios de conexión
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
        
        // Verificar estado inicial
        this.checkConnectionStatus();
    }

    handleConnectionChange(online) {
        this.isOnline = online;
        if (online) {
            console.log('🌐 Conexión restaurada - CloudSync activo');
            this.trySyncPendingData();
        } else {
            console.log('📴 Sin conexión - CloudSync en modo offline');
        }
    }

    async checkConnectionStatus() {
        try {
            // Verificar conexión a internet
            const response = await fetch('https://api.ipify.org?format=json', { 
                method: 'GET',
                timeout: 5000 
            });
            this.isOnline = response.ok;
        } catch (error) {
            this.isOnline = false;
        }
        
        console.log(this.isOnline ? '✅ CloudSync en línea' : '⚠️ CloudSync en modo offline');
        return this.isOnline;
    }

    // Guardar usuarios en la nube CON REINTENTOS
    async saveUsersToCloud(usersData) {
        if (!this.isOnline) {
            console.log('⚠️ Sin conexión - Guardando localmente para sincronización posterior');
            this.saveLocalBackup(usersData);
            return false;
        }

        try {
            console.log('💾 Guardando en JSONBin.io...', {
                totalUsers: usersData.totalUsers,
                lastSync: usersData.lastSync
            });
            
            const response = await this.makeRequest('PUT', usersData);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Usuarios guardados en la nube. Metadata:', {
                    version: result.metadata?.version,
                    date: result.metadata?.createdAt
                });
                
                // Limpiar backup local después de éxito
                this.clearLocalBackup();
                this.retryCount = 0; // Resetear contador de reintentos
                
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Error guardando en la nube:', error.message);
            
            // Guardar backup local para reintentar después
            this.saveLocalBackup(usersData);
            
            // Reintentar si no excedió el máximo
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Reintentando en ${this.retryDelay}ms (intento ${this.retryCount}/${this.maxRetries})`);
                
                await this.delay(this.retryDelay);
                return await this.saveUsersToCloud(usersData);
            }
            
            return false;
        }
    }

    // Cargar usuarios desde la nube CON CACHE
    async loadUsersFromCloud() {
        if (!this.isOnline) {
            console.log('⚠️ Sin conexión - Cargando desde cache local');
            return this.loadLocalBackup();
        }

        try {
            console.log('📥 Cargando desde JSONBin.io...');
            
            const response = await this.makeRequest('GET');
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Datos cargados desde la nube:', {
                    totalUsers: data.record?.totalUsers,
                    lastSync: data.record?.lastSync
                });
                
                // Guardar en cache local
                this.saveLocalCache(data.record);
                
                return data.record;
            } else if (response.status === 404) {
                console.log('📭 Bin no encontrado - Primera sincronización');
                return this.initializeFirstSync();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Error cargando desde la nube:', error.message);
            
            // Cargar desde cache local como fallback
            const cachedData = this.loadLocalCache();
            if (cachedData) {
                console.log('📂 Usando datos cacheados localmente');
                return cachedData;
            }
            
            return null;
        }
    }

    // Método de solicitud unificado
    async makeRequest(method, data = null) {
        const url = method === 'GET' 
            ? `https://api.jsonbin.io/v3/b/${this.BIN_ID}/latest`
            : `https://api.jsonbin.io/v3/b/${this.BIN_ID}`;

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': this.API_KEY,
                'X-Bin-Versioning': 'false'
            },
            timeout: 10000 // 10 segundos timeout
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        return await fetch(url, options);
    }

    // Sincronización inicial si el bin está vacío
    async initializeFirstSync() {
        console.log('🚀 Inicializando primera sincronización...');
        
        const initialData = {
            globalUsers: {},
            lastSync: new Date().toISOString(),
            totalUsers: 0,
            syncSource: 'Sistema de Exámenes Unificado',
            firstSync: true
        };

        const success = await this.saveUsersToCloud(initialData);
        if (success) {
            console.log('✅ Primera sincronización completada');
            return initialData;
        }
        
        return null;
    }

    // Sincronizar datos pendientes
    async trySyncPendingData() {
        const pendingData = this.loadLocalBackup();
        if (pendingData && this.isOnline) {
            console.log('🔄 Sincronizando datos pendientes...');
            const success = await this.saveUsersToCloud(pendingData);
            if (success) {
                console.log('✅ Datos pendientes sincronizados exitosamente');
            }
        }
    }

    // ========== GESTIÓN DE CACHE LOCAL ==========

    saveLocalCache(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem('cloudSync_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error guardando cache local:', error);
        }
    }

    loadLocalCache() {
        try {
            const cached = localStorage.getItem('cloudSync_cache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                // Verificar que el cache no sea muy viejo (max 7 días)
                const cacheDate = new Date(cacheData.timestamp);
                const now = new Date();
                const daysDiff = (now - cacheDate) / (1000 * 60 * 60 * 24);
                
                if (daysDiff < 7) {
                    return cacheData.data;
                } else {
                    console.log('🗑️ Cache local expirado');
                    localStorage.removeItem('cloudSync_cache');
                }
            }
        } catch (error) {
            console.error('Error cargando cache local:', error);
        }
        return null;
    }

    saveLocalBackup(data) {
        try {
            const backupData = {
                data: data,
                timestamp: new Date().toISOString(),
                attempt: this.retryCount + 1
            };
            localStorage.setItem('cloudSync_backup', JSON.stringify(backupData));
        } catch (error) {
            console.error('Error guardando backup local:', error);
        }
    }

    loadLocalBackup() {
        try {
            const backup = localStorage.getItem('cloudSync_backup');
            return backup ? JSON.parse(backup).data : null;
        } catch (error) {
            console.error('Error cargando backup local:', error);
            return null;
        }
    }

    clearLocalBackup() {
        try {
            localStorage.removeItem('cloudSync_backup');
        } catch (error) {
            console.error('Error limpiando backup local:', error);
        }
    }

    // ========== MÉTODOS UTILITARIOS ==========

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Verificar estado del servicio
    async checkServiceStatus() {
        try {
            const response = await fetch('https://api.jsonbin.io/health', { timeout: 5000 });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Obtener estadísticas
    getStats() {
        const cache = this.loadLocalCache();
        const backup = this.loadLocalBackup();
        
        return {
            online: this.isOnline,
            retryCount: this.retryCount,
            hasCache: !!cache,
            hasBackup: !!backup,
            lastSync: cache?.lastSync || 'Nunca',
            totalUsers: cache?.totalUsers || 0
        };
    }

    // Forzar sincronización
    async forceSync(usersData) {
        console.log('🔄 Forzando sincronización...');
        this.retryCount = 0;
        return await this.saveUsersToCloud(usersData);
    }

    // Limpiar todo el cache
    clearAllCache() {
        try {
            localStorage.removeItem('cloudSync_cache');
            localStorage.removeItem('cloudSync_backup');
            console.log('🧹 Cache de CloudSync limpiado');
            return true;
        } catch (error) {
            console.error('Error limpiando cache:', error);
            return false;
        }
    }
}

// Crear instancia global MEJORADA
document.addEventListener('DOMContentLoaded', () => {
    window.cloudSync = new CloudSync();
    
    // Exponer métodos útiles globalmente
    window.forceCloudSync = () => {
        if (window.userManager) {
            const usersData = {
                globalUsers: window.userManager.globalUsers,
                lastSync: new Date().toISOString(),
                totalUsers: Object.keys(window.userManager.globalUsers).length
            };
            return window.cloudSync.forceSync(usersData);
        }
    };
    
    window.getCloudSyncStats = () => window.cloudSync.getStats();
    
    console.log('☁️ CloudSync MEJORADO listo y funciones globales disponibles');
});

// Hacer la clase disponible globalmente
window.CloudSync = CloudSync;