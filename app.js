class ExamSystem {
    constructor() {
        // ✅ SISTEMA DE SEGURIDAD DE IP (del segundo código)
        this.ipSecurity = new IPSecurity();
        this.ipVerified = false;
        this.currentIP = null;

        this.currentUser = null;
        this.users = this.loadUsers();
        this.adminCredentials = this.loadAdminCredentials();
        this.examResults = this.loadExamResults();
        this.sessions = this.loadSessions();
        this.securityMode = this.loadSecurityMode();
        this.globalPassword = "Examen2024!";
        this.failedAttempts = this.loadFailedAttempts();
        
        // Sistema de usuarios globales MEJORADO
        this.globalExamUsers = this.loadGlobalUsers();
        this.deviceFingerprint = this.generateDeviceFingerprint();
        this.maxConcurrentSessions = 1;
        
        // ✅ CONFIGURACIÓN UNIFICADA: JSONBin.io Y Firebase
        this.cloudSync = {
            jsonbin: window.jsonbinSync,
            firebase: window.firebaseSync
        };
        this.syncEnabled = true;
        this.preferredCloudService = this.loadPreferredCloudService(); // 'jsonbin' o 'firebase'
        
        // Configuración del examen
        this.questionsPerPage = 50;
        this.totalPages = 7;
        this.currentPage = 1;
        this.userAnswers = new Array(350).fill(null);
        this.questions = [];
        this.sessionTimer = null;
        this.sessionDuration = 3600 * 24;
        
        // Sistema de voz
        this.speechEnabled = false;
        this.speechSynth = window.speechSynthesis;
        this.currentUtterance = null;
        
        // ✅ HACER DISPONIBLE GLOBALMENTE - DENTRO DEL CONSTRUCTOR
        window.ipSecurity = this.ipSecurity;
        window.examSystem = this;
        
        console.log('✅ Sistemas cargados globalmente:');
        console.log('   - ipSecurity:', typeof this.ipSecurity);
        console.log('   - examSystem:', typeof this);
        console.log('   - Servicio en la nube preferido:', this.preferredCloudService);
        
        this.init();
    }

    // ========== CONFIGURACIÓN DE SERVICIOS EN LA NUBE UNIFICADOS ==========

    loadPreferredCloudService() {
        return localStorage.getItem('preferredCloudService') || 'jsonbin';
    }

    savePreferredCloudService(service) {
        try {
            this.preferredCloudService = service;
            localStorage.setItem('preferredCloudService', service);
            console.log(`✅ Servicio en la nube preferido: ${service}`);
        } catch (e) {
            console.error('Error saving preferred cloud service:', e);
        }
    }

    // ========== MÉTODOS DE SINCRONIZACIÓN UNIFICADOS ==========

    async syncUsersWithCloud() {
        if (!this.syncEnabled) {
            console.log('⚠️ Sincronización desactivada');
            return;
        }
        
        console.log(`🔄 Sincronizando con ${this.preferredCloudService.toUpperCase()}...`);
        
        try {
            let cloudData = null;
            
            // Usar el servicio preferido
            if (this.preferredCloudService === 'jsonbin' && this.cloudSync.jsonbin) {
                cloudData = await this.cloudSync.jsonbin.loadUsersFromCloud();
            } else if (this.preferredCloudService === 'firebase' && this.cloudSync.firebase) {
                cloudData = await this.cloudSync.firebase.loadUsersFromCloud();
            }
            
            if (cloudData && cloudData.globalUsers) {
                // Combinar usuarios locales con los de la nube
                this.globalExamUsers = { 
                    ...cloudData.globalUsers,
                    ...this.globalExamUsers // Los locales tienen prioridad
                };
                this.saveGlobalUsers();
                console.log(`✅ Sincronización completada con ${this.preferredCloudService.toUpperCase()} - Usuarios:`, Object.keys(this.globalExamUsers).length);
            } else {
                console.log(`☁️ No hay datos en ${this.preferredCloudService.toUpperCase()} o primera sincronización`);
            }
        } catch (error) {
            console.error(`❌ Error en sincronización con ${this.preferredCloudService.toUpperCase()}:`, error);
            
            // Intentar con el servicio alternativo
            await this.tryAlternativeCloudService();
        }
    }
    
    async tryAlternativeCloudService() {
        const alternativeService = this.preferredCloudService === 'jsonbin' ? 'firebase' : 'jsonbin';
        console.log(`🔄 Intentando con servicio alternativo: ${alternativeService.toUpperCase()}`);
        
        try {
            let cloudData = null;
            
            if (alternativeService === 'jsonbin' && this.cloudSync.jsonbin) {
                cloudData = await this.cloudSync.jsonbin.loadUsersFromCloud();
            } else if (alternativeService === 'firebase' && this.cloudSync.firebase) {
                cloudData = await this.cloudSync.firebase.loadUsersFromCloud();
            }
            
            if (cloudData && cloudData.globalUsers) {
                this.globalExamUsers = { 
                    ...cloudData.globalUsers,
                    ...this.globalExamUsers
                };
                this.saveGlobalUsers();
                console.log(`✅ Sincronización completada con alternativa ${alternativeService.toUpperCase()}`);
            }
        } catch (error) {
            console.error(`❌ Error también con servicio alternativo ${alternativeService.toUpperCase()}:`, error);
        }
    }
    
    async saveUsersToCloud() {
        if (!this.syncEnabled) {
            console.log('⚠️ Sincronización desactivada');
            return;
        }
        
        const usersData = {
            globalUsers: this.globalExamUsers,
            lastSync: new Date().toISOString(),
            totalUsers: Object.keys(this.globalExamUsers).length,
            syncService: this.preferredCloudService
        };
        
        let success = false;
        
        // Guardar en el servicio preferido
        if (this.preferredCloudService === 'jsonbin' && this.cloudSync.jsonbin) {
            success = await this.cloudSync.jsonbin.saveUsersToCloud(usersData);
        } else if (this.preferredCloudService === 'firebase' && this.cloudSync.firebase) {
            success = await this.cloudSync.firebase.saveUsersToCloud(usersData);
        }
        
        if (success) {
            console.log(`☁️ Usuarios guardados en ${this.preferredCloudService.toUpperCase()} exitosamente`);
        } else {
            console.error(`❌ Error guardando en ${this.preferredCloudService.toUpperCase()}, intentando alternativa...`);
            await this.saveUsersToAlternativeCloud(usersData);
        }
    }
    
    async saveUsersToAlternativeCloud(usersData) {
        const alternativeService = this.preferredCloudService === 'jsonbin' ? 'firebase' : 'jsonbin';
        
        try {
            let success = false;
            
            if (alternativeService === 'jsonbin' && this.cloudSync.jsonbin) {
                success = await this.cloudSync.jsonbin.saveUsersToCloud(usersData);
            } else if (alternativeService === 'firebase' && this.cloudSync.firebase) {
                success = await this.cloudSync.firebase.saveUsersToCloud(usersData);
            }
            
            if (success) {
                console.log(`☁️ Usuarios guardados en alternativa ${alternativeService.toUpperCase()} exitosamente`);
            }
        } catch (error) {
            console.error(`❌ Error también con alternativa ${alternativeService.toUpperCase()}:`, error);
        }
    }

    // ========== INICIALIZACIÓN CON SEGURIDAD DE IP ==========

    async init() {
        console.log('🚀 Inicializando Sistema de Exámenes con Seguridad de IP...');
        
        // Primero verificar la IP
        await this.verifyIPAccess();
        
        // Solo inicializar el resto si la IP está permitida
        if (this.ipVerified) {
            this.initializeElements();
            this.setupEventListeners();
            this.loadQuestions();
            
            // ✅ MEJORADO: Intentar restaurar sesión después de verificar IP
            const sessionRestored = this.restoreSession();
            
            // Si no se restauró ninguna sesión, mostrar pantalla de acceso global
            if (!sessionRestored) {
                this.showScreen('acceso-global-screen');
            }
            
            this.updateSecurityDisplay();
            setInterval(() => this.cleanExpiredSessions(), 60000);
            this.addGlobalStyles();
            this.createRegistrationButton();
            
            setTimeout(() => {
                this.syncUsersWithCloud();
            }, 2000);
        }
    }

    async verifyIPAccess() {
        console.log('🌐 Verificando acceso por IP...');
        
        try {
            // Mostrar pantalla de verificación
            this.showScreen('ip-check-screen');
            
            // Obtener IP actual
            this.currentIP = await this.ipSecurity.getCurrentIP();
            console.log('📡 IP detectada:', this.currentIP);
            
            // Actualizar UI con IP
            const ipStatusElement = document.getElementById('ip-status');
            if (ipStatusElement) {
                ipStatusElement.textContent = `Estado: Verificando IP ${this.currentIP}...`;
            }
            
            // ✅ VERIFICACIÓN MEJORADA: Verificar si la IP está permitida (sin username aún)
            this.ipVerified = await this.ipSecurity.isIPAllowed();
            
            if (this.ipVerified) {
                console.log('✅ IP autorizada - Acceso permitido');
                if (ipStatusElement) {
                    ipStatusElement.textContent = `Estado: ✅ IP autorizada (${this.currentIP})`;
                    ipStatusElement.style.color = '#28a745';
                }
                
                // ✅ REGISTRAR ACCESO PERMITIDO EN FIREBASE (sin usuario aún)
                await this.ipSecurity.logAccess(this.currentIP, true, 'Acceso inicial permitido');
                
            } else {
                console.log('❌ IP no autorizada - Acceso denegado');
                if (ipStatusElement) {
                    ipStatusElement.textContent = `Estado: ❌ IP bloqueada (${this.currentIP})`;
                    ipStatusElement.style.color = '#dc3545';
                }
                
                // ✅ REGISTRAR ACCESO DENEGADO EN FIREBASE (sin usuario aún)
                await this.ipSecurity.logAccess(this.currentIP, false, 'IP no autorizada');
                
                this.showAccessDenied();
            }
            
        } catch (error) {
            console.error('❌ Error en verificación de IP:', error);
            
            const ipStatusElement = document.getElementById('ip-status');
            if (ipStatusElement) {
                ipStatusElement.textContent = 'Estado: ❌ Error en verificación';
                ipStatusElement.style.color = '#dc3545';
            }
            
            // En caso de error, mostrar pantalla de error
            this.showIPError();
        }
    }

    showAccessDenied() {
        document.body.innerHTML = `
            <div class="access-denied-screen">
                <div class="access-denied-container">
                    <div class="access-denied-card">
                        <h1>🚫 Acceso Denegado</h1>
                        <div class="denied-icon">🔒</div>
                        <p class="denied-message">Su dirección IP <strong>${this.currentIP}</strong> no está autorizada para acceder al sistema.</p>
                        <div class="denied-details">
                            <p>📡 <strong>IP detectada:</strong> ${this.currentIP}</p>
                            <p>⏰ <strong>Hora:</strong> ${new Date().toLocaleString()}</p>
                            <p>🌐 <strong>Dispositivo:</strong> ${navigator.userAgent.split(' ')[0]}</p>
                        </div>
                        <div class="denied-actions">
                            <button onclick="location.reload()" class="btn btn-primary">🔄 Reintentar</button>
                            <button onclick="window.examSystem.showMyIP()" class="btn btn-secondary">
                                📡 Ver mi IP
                            </button>
                        </div>
                        <div class="contact-info">
                            <p>Si cree que esto es un error, contacte al administrador del sistema.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar estilos
        const styles = `
            .access-denied-screen {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Arial', sans-serif;
            }
            .access-denied-container {
                width: 100%;
                max-width: 500px;
                padding: 20px;
            }
            .access-denied-card {
                background: white;
                padding: 40px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                text-align: center;
            }
            .access-denied-card h1 {
                color: #dc3545;
                margin-bottom: 20px;
                font-size: 28px;
            }
            .denied-icon {
                font-size: 60px;
                margin: 20px 0;
                color: #dc3545;
            }
            .denied-message {
                font-size: 18px;
                color: #333;
                margin-bottom: 25px;
                line-height: 1.5;
            }
            .denied-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }
            .denied-details p {
                margin: 8px 0;
                font-size: 14px;
            }
            .denied-actions {
                margin: 25px 0;
            }
            .denied-actions .btn {
                margin: 0 10px;
                padding: 10px 20px;
            }
            .contact-info {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    showIPError() {
        document.body.innerHTML = `
            <div class="ip-error-screen">
                <div class="ip-error-container">
                    <div class="ip-error-card">
                        <h1>🌐 Error de Conexión</h1>
                        <div class="error-icon">⚠️</div>
                        <p class="error-message">No se pudo verificar el acceso al sistema.</p>
                        <div class="error-details">
                            <p>Posibles causas:</p>
                            <ul>
                                <li>Problemas de conexión a internet</li>
                                <li>Servicio de verificación no disponible</li>
                                <li>Configuración de firewall</li>
                            </ul>
                        </div>
                        <div class="error-actions">
                            <button onclick="location.reload()" class="btn btn-primary">🔄 Reintentar</button>
                            <button onclick="window.examSystem.bypassIPCheck()" class="btn btn-warning">
                                🚨 Acceso de Emergencia
                            </button>
                        </div>
                        <div class="contact-info">
                            <p>Contacte al administrador si el problema persiste.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar estilos
        const styles = `
            .ip-error-screen {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Arial', sans-serif;
            }
            .ip-error-container {
                width: 100%;
                max-width: 500px;
                padding: 20px;
            }
            .ip-error-card {
                background: white;
                padding: 40px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                text-align: center;
            }
            .ip-error-card h1 {
                color: #e67e22;
                margin-bottom: 20px;
                font-size: 28px;
            }
            .error-icon {
                font-size: 60px;
                margin: 20px 0;
                color: #e67e22;
            }
            .error-message {
                font-size: 18px;
                color: #333;
                margin-bottom: 25px;
                line-height: 1.5;
            }
            .error-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }
            .error-details ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            .error-details li {
                margin: 5px 0;
                font-size: 14px;
            }
            .error-actions {
                margin: 25px 0;
            }
            .error-actions .btn {
                margin: 0 10px;
                padding: 10px 20px;
            }
            .contact-info {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Método de emergencia para bypass (solo para desarrollo)
    bypassIPCheck() {
        if (confirm('⚠️ ADVERTENCIA: Esto desactiva la seguridad de IP. ¿Continuar?')) {
            this.ipVerified = true;
            this.showScreen('acceso-global-screen');
            this.updateIPDisplay();
            console.warn('🚨 Seguridad de IP desactivada - Modo emergencia');
        }
    }

    async showMyIP() {
        const ip = await this.ipSecurity.getCurrentIP();
        alert(`Su IP es: ${ip}`);
    }

    updateIPDisplay() {
        const ipDisplayElement = document.getElementById('current-ip-display');
        if (ipDisplayElement && this.currentIP) {
            ipDisplayElement.textContent = `IP: ${this.currentIP} ✅`;
            ipDisplayElement.style.color = '#28a745';
        }
    }

    // ========== MÉTODOS DE BLOQUEO DE IP ==========

    async blockIP(ipAddress, reason = 'Bloqueada por administrador') {
        try {
            console.log(`🚫 Intentando bloquear IP: ${ipAddress}`);
            
            // 1. Bloquear en Firebase
            const success = await this.ipSecurity.blockIP(ipAddress, reason);
            
            if (success) {
                console.log(`✅ IP ${ipAddress} bloqueada exitosamente`);
                
                // 2. Si el usuario está actualmente en esta IP, forzar logout
                if (this.currentIP === ipAddress) {
                    alert('🚫 Su IP ha sido bloqueada. Será redirigido.');
                    this.logout();
                }
                
                // 3. Recargar la lista de sesiones
                this.loadSessionsList();
                
                return true;
            } else {
                console.error('❌ Error al bloquear IP en Firebase');
                return false;
            }
        } catch (error) {
            console.error('❌ Error en blockIP:', error);
            return false;
        }
    }

    async unblockIP(ipAddress) {
        try {
            console.log(`✅ Intentando desbloquear IP: ${ipAddress}`);
            
            // 1. Desbloquear en Firebase
            const success = await this.ipSecurity.allowIP(ipAddress, 'Desbloqueada por administrador');
            
            if (success) {
                console.log(`✅ IP ${ipAddress} desbloqueada exitosamente`);
                
                // 2. Recargar la lista de sesiones
                this.loadSessionsList();
                
                return true;
            } else {
                console.error('❌ Error al desbloquear IP en Firebase');
                return false;
            }
        } catch (error) {
            console.error('❌ Error en unblockIP:', error);
            return false;
        }
    }

    async toggleIPAccess(ipAddress, currentStatus) {
        if (currentStatus) {
            // Si actualmente está permitida, bloquear
            return await this.blockIP(ipAddress);
        } else {
            // Si actualmente está bloqueada, permitir
            return await this.unblockIP(ipAddress);
        }
    }

    // ========== MÉTODOS DE CARGA ==========

    loadUsers() {
        try {
            const savedUsers = localStorage.getItem('examUsers');
            if (savedUsers) {
                return JSON.parse(savedUsers);
            }
        } catch (e) {
            console.error('Error loading users:', e);
        }
        
        return {
            'usuario1': { password: 'abcd', role: 'user', name: 'Usuario 1' },
            'usuario2': { password: '1234', role: 'user', name: 'Usuario 2' },
            'usuario3': { password: '5678', role: 'user', name: 'Usuario 3' },
            'usuario4': { password: '9123', role: 'user', name: 'Usuario 4' },
            'usuario5': { password: '9456', role: 'user', name: 'Usuario 5' },
            'usuario6': { password: '9789', role: 'user', name: 'Usuario 6' },
            'usuario7': { password: '8123', role: 'user', name: 'Usuario 7' },
            'usuario8': { password: '8456', role: 'user', name: 'Usuario 8' },
            'usuario9': { password: '8789', role: 'user', name: 'Usuario 9' },
            'usuario10': { password:'7123', role: 'user', name: 'Usuario 10' },
            'usuario11': { password:'7456', role: 'user', name: 'Usuario 11' },
            'usuario12': { password:'7789', role: 'user', name: 'Usuario 12' },
            'usuario13': { password:'6123', role: 'user', name: 'Usuario 13' },
            'usuario14': { password:'6456', role: 'user', name: 'Usuario 14' },
            'usuario15': { password:'6789', role: 'user', name: 'Usuario 15' },
            'usuario16': { password:'5123', role: 'user', name: 'Usuario 16' },
        };
    }

    loadAdminCredentials() {
        try {
            const savedAdmin = localStorage.getItem('adminCredentials');
            if (savedAdmin) {
                return JSON.parse(savedAdmin);
            }
        } catch (e) {
            console.error('Error loading admin credentials:', e);
        }
        
        return {
            'admin': { password: 'Admin1234!', role: 'admin', name: 'Administrador' }
        };
    }

    loadExamResults() {
        try {
            const savedResults = localStorage.getItem('examResults');
            return savedResults ? JSON.parse(savedResults) : [];
        } catch (e) {
            console.error('Error loading exam results:', e);
            return [];
        }
    }

    loadSessions() {
        try {
            const savedSessions = localStorage.getItem('examSessions');
            if (savedSessions) {
                const sessions = JSON.parse(savedSessions);
                console.log('📊 Sesiones cargadas:', sessions.length);
                return sessions;
            }
        } catch (e) {
            console.error('Error loading sessions:', e);
        }
        
        console.log('🆕 No hay sesiones guardadas, creando lista vacía');
        return [];
    }

    loadSecurityMode() {
        return localStorage.getItem('securityMode') || 'registro';
    }

    loadFailedAttempts() {
        try {
            const saved = localStorage.getItem('failedAttempts');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading failed attempts:', e);
            return {};
        }
    }

    // ========== SISTEMA DE USUARIOS GLOBALES MEJORADO ==========

    loadGlobalUsers() {
        try {
            const savedGlobalUsers = localStorage.getItem('globalExamUsers');
            if (savedGlobalUsers) {
                const users = JSON.parse(savedGlobalUsers);
                console.log('🌐 Usuarios globales cargados:', Object.keys(users).length);
                return users;
            }
        } catch (e) {
            console.error('Error loading global users:', e);
        }
        
        // Usuarios globales por defecto
        const defaultGlobalUsers = {
            'usuario1': { 
                password: 'abcd', 
                role: 'user', 
                name: 'Usuario 1',
                isGlobal: true,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                activeSessions: [],
                email: 'usuario1@ejemplo.com'
            },
            'usuario2': { 
                password: '1234', 
                role: 'user', 
                name: 'Usuario 2',
                isGlobal: true,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                activeSessions: [],
                email: 'usuario2@ejemplo.com'
            }
        };
        
        this.saveGlobalUsers(defaultGlobalUsers);
        return defaultGlobalUsers;
    }

    saveGlobalUsers(users = this.globalExamUsers) {
        try {
            localStorage.setItem('globalExamUsers', JSON.stringify(users));
            console.log('💾 Usuarios globales guardados:', Object.keys(users).length);
        } catch (e) {
            console.error('Error saving global users:', e);
        }
    }

    // ========== MÉTODOS MEJORADOS PARA CREAR USUARIOS ==========

    async createNewUser(userData, isGlobal = false) {
        const { username, password, name, email, role = 'user' } = userData;
        
        if (!username || !password || !name) {
            throw new Error('Todos los campos son obligatorios');
        }
        
        if (username.length < 3) {
            throw new Error('El usuario debe tener al menos 3 caracteres');
        }
        
        if (password.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }
        
        // Verificar si el usuario ya existe
        if (this.getUser(username)) {
            throw new Error('El usuario ya existe');
        }
        
        const newUser = {
            password: password,
            role: role,
            name: name,
            email: email || `${username}@ejemplo.com`,
            isGlobal: isGlobal,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            activeSessions: []
        };
        
        if (isGlobal) {
            this.globalExamUsers[username] = newUser;
            this.saveGlobalUsers();
            
            // ✅ GUARDAR EN LA NUBE (JSONBin.io O Firebase)
            await this.saveUsersToCloud();
            
            console.log('🌐 Nuevo usuario GLOBAL creado:', username);
        } else {
            this.users[username] = newUser;
            this.saveUsers();
            console.log('💻 Nuevo usuario LOCAL creado:', username);
        }
        
        return newUser;
    }

    // ========== IDENTIFICACIÓN ÚNICA POR DISPOSITIVO ==========

    generateDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.platform,
            navigator.language,
            navigator.hardwareConcurrency || 'unknown',
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            !!navigator.cookieEnabled,
            !!navigator.javaEnabled()
        ];
        
        let fingerprint = components.join('|');
        let hash = 0;
        
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return 'device-' + Math.abs(hash).toString(36);
    }

    // ========== CONTROL DE SESIONES CONCURRENTES ==========

    checkConcurrentSessions(username) {
        const user = this.getUser(username);
        if (!user) return true;
        
        const activeSessions = user.activeSessions ? 
            user.activeSessions.filter(session => 
                session.active === true && 
                session.deviceFingerprint !== this.deviceFingerprint
            ) : [];
        
        return activeSessions.length < this.maxConcurrentSessions;
    }

    registerUserSession(username) {
        const user = this.getUser(username);
        if (!user) return;
        
        const sessionData = {
            deviceFingerprint: this.deviceFingerprint,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            active: true
        };
        
        if (!user.activeSessions) {
            user.activeSessions = [];
        }
        
        user.activeSessions.push(sessionData);
        
        if (user.activeSessions.length > 10) {
            user.activeSessions = user.activeSessions.slice(-10);
        }
        
        user.lastLogin = new Date().toISOString();
        this.saveUserData(username);
    }

    closeOtherSessions(username) {
        const user = this.getUser(username);
        if (!user || !user.activeSessions) return;
        
        user.activeSessions = user.activeSessions.map(session => ({
            ...session,
            active: session.deviceFingerprint === this.deviceFingerprint
        }));
        
        this.saveUserData(username);
    }

    updateUserActivity(username) {
        const user = this.getUser(username);
        if (!user || !user.activeSessions) return;
        
        const currentSession = user.activeSessions.find(
            session => session.deviceFingerprint === this.deviceFingerprint
        );
        
        if (currentSession) {
            currentSession.lastActivity = new Date().toISOString();
            this.saveUserData(username);
        }
    }

    // ========== MÉTODOS DE USUARIO UNIFICADOS ==========

    getUser(username) {
        if (this.globalExamUsers[username]) {
            return { ...this.globalExamUsers[username], source: 'global' };
        }
        if (this.users[username]) {
            return { ...this.users[username], source: 'local' };
        }
        if (this.adminCredentials[username]) {
            return { ...this.adminCredentials[username], source: 'admin' };
        }
        return null;
    }

    saveUserData(username) {
        const user = this.getUser(username);
        if (!user) return;
        
        switch (user.source) {
            case 'global':
                this.globalExamUsers[username] = user;
                this.saveGlobalUsers();
                break;
            case 'local':
                this.users[username] = user;
                this.saveUsers();
                break;
            case 'admin':
                this.adminCredentials[username] = user;
                this.saveAdminCredentials();
                break;
        }
    }

    // ========== MÉTODOS DE GUARDADO ==========

    saveUsers() {
        try {
            localStorage.setItem('examUsers', JSON.stringify(this.users));
        } catch (e) {
            console.error('Error saving users:', e);
        }
    }

    saveAdminCredentials() {
        try {
            localStorage.setItem('adminCredentials', JSON.stringify(this.adminCredentials));
        } catch (e) {
            console.error('Error saving admin credentials:', e);
        }
    }

    saveExamResults() {
        try {
            localStorage.setItem('examResults', JSON.stringify(this.examResults));
        } catch (e) {
            console.error('Error saving exam results:', e);
        }
    }

    saveSessions(sessions = this.sessions) {
        try {
            localStorage.setItem('examSessions', JSON.stringify(sessions));
            console.log('💾 Sesiones guardadas:', sessions.length);
        } catch (e) {
            console.error('Error saving sessions:', e);
        }
    }

    saveSecurityMode(mode) {
        try {
            this.securityMode = mode;
            localStorage.setItem('securityMode', mode);
        } catch (e) {
            console.error('Error saving security mode:', e);
        }
    }

    saveFailedAttempts() {
        try {
            localStorage.setItem('failedAttempts', JSON.stringify(this.failedAttempts));
        } catch (e) {
            console.error('Error saving failed attempts:', e);
        }
    }

    // ========== SISTEMA DE SESIONES ==========

    generateSessionId() {
        const deviceId = navigator.userAgent.substring(0, 20).replace(/\s+/g, '') + 
                        Math.random().toString(36).substr(2, 6);
        return 'session-' + deviceId + '-' + Date.now().toString(36);
    }

    getCurrentSessionId() {
        let sessionId = localStorage.getItem('currentSessionId');
        
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem('currentSessionId', sessionId);
            console.log('🆕 Nueva sesión creada:', sessionId);
        }
        
        return sessionId;
    }

    registerAccess(username = null) {
        const sessionId = this.getCurrentSessionId();
        const now = new Date().toISOString();
        
        console.log(`📝 Registrando acceso para sesión: ${sessionId}, Usuario: ${username}`);
        
        const existingSession = this.sessions.find(session => session.sessionId === sessionId);
        
        if (existingSession) {
            existingSession.lastAccess = now;
            existingSession.accessCount++;
            existingSession.username = username || existingSession.username;
            existingSession.active = true;
            existingSession.lastActivity = now;
            existingSession.userAgent = navigator.userAgent;
            console.log(`✅ Sesión existente actualizada: ${sessionId}`);
        } else {
            const newSession = {
                sessionId: sessionId,
                firstAccess: now,
                lastAccess: now,
                accessCount: 1,
                username: username,
                authorized: true,
                deviceInfo: this.getDeviceInfo(),
                userAgent: navigator.userAgent,
                active: true,
                lastActivity: now
            };
            this.sessions.push(newSession);
            console.log(`✅ Nueva sesión registrada: ${sessionId}`);
        }
        
        this.saveSessions();
        return sessionId;
    }

    getDeviceInfo() {
        return {
            platform: navigator.platform,
            language: navigator.language,
            deviceType: this.getDeviceType(),
            browser: this.getBrowserInfo()
        };
    }

    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad/.test(userAgent)) {
            return 'Móvil';
        } else if (/tablet/.test(userAgent)) {
            return 'Tablet';
        } else {
            return 'Escritorio';
        }
    }

    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Otro';
    }

    isSessionAuthorized(sessionId) {
        if (this.securityMode === 'registro') {
            return true;
        }
        
        const session = this.sessions.find(s => s.sessionId === sessionId);
        
        if (!session) {
            console.log(`🔍 Sesión ${sessionId} no encontrada, creando registro automáticamente...`);
            this.registerAccess();
            return true;
        }
        
        return session.authorized;
    }

    authorizeSession(sessionId) {
        const session = this.sessions.find(s => s.sessionId === sessionId);
        if (session) {
            session.authorized = true;
            this.saveSessions();
            console.log(`✅ Sesión autorizada: ${sessionId}`);
            return true;
        }
        return false;
    }

    blockSession(sessionId) {
        const session = this.sessions.find(s => s.sessionId === sessionId);
        if (session) {
            session.authorized = false;
            this.saveSessions();
            console.log(`🚫 Sesión bloqueada: ${sessionId}`);
            return true;
        }
        return false;
    }

    deleteSession(sessionId) {
        const initialLength = this.sessions.length;
        this.sessions = this.sessions.filter(s => s.sessionId !== sessionId);
        this.saveSessions();
        console.log(`🗑️ Sesión eliminada: ${sessionId}`);
    }

    cleanExpiredSessions() {
        const now = new Date();
        this.sessions.forEach(session => {
            if (session.lastActivity) {
                const lastActivity = new Date(session.lastActivity);
                const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
                if (minutesSinceActivity > 5) {
                    session.active = false;
                }
            }
        });
        this.saveSessions();
    }

    // ========== ACCESO GLOBAL ==========

    handleGlobalAccess(e) {
        if (e) e.preventDefault();
        
        console.log('🔐 Procesando acceso global...');
        
        let password = '';
        if (this.passwordGlobalInput && this.passwordGlobalInput.value) {
            password = this.passwordGlobalInput.value;
        } else {
            const passwordInput = this.accesoGlobalForm ? 
                this.accesoGlobalForm.querySelector('input[type="password"]') : null;
            if (passwordInput) {
                password = passwordInput.value;
            }
        }
        
        const sessionId = this.getCurrentSessionId();
        
        console.log(`Contraseña ingresada: "${password}"`);
        console.log(`Contraseña esperada: "${this.globalPassword}"`);
        
        if (password === this.globalPassword) {
            console.log('✅ Contraseña CORRECTA - Acceso concedido');
            
            this.registerAccess();
            
            if (this.failedAttempts[sessionId]) {
                delete this.failedAttempts[sessionId];
                this.saveFailedAttempts();
            }
            
            if (this.passwordGlobalInput) {
                this.passwordGlobalInput.value = '';
            }
            
            console.log('🎯 Redirigiendo a pantalla de login...');
            this.showScreen('login-screen');
            
        } else {
            console.log('❌ Contraseña INCORRECTA');
            alert('❌ Contraseña incorrecta. La contraseña global es: Examen2024!');
            
            if (this.passwordGlobalInput) {
                this.passwordGlobalInput.value = '';
            }
        }
    }

    // ========== LOGIN MEJORADO CON REGISTRO DE ACCESSLOG ==========

    handleLogin(e) {
        e.preventDefault();
        
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;
        const sessionId = this.getCurrentSessionId();
        
        console.log(`🔐 Intento de login: ${username}`);
        
        const user = this.getUser(username);
        if (!user) {
            alert('❌ Usuario no encontrado');
            this.loginForm.reset();
            return;
        }
        
        if (user.password !== password) {
            alert('❌ Contraseña incorrecta');
            this.loginForm.reset();
            return;
        }
        
        // ✅ NUEVO: Registrar el login del usuario en el sistema de IP (ANTES de cualquier otra verificación)
        if (this.ipSecurity && this.currentIP) {
            console.log(`📝 Registrando login de usuario en accessLogs: ${username} desde IP: ${this.currentIP}`);
            this.ipSecurity.logUserLogin(username, this.currentIP)
                .then(logId => {
                    console.log(`✅ Login registrado en accessLogs: ${logId}`);
                })
                .catch(error => {
                    console.error('Error registrando login:', error);
                });
        }
        
        if (!this.checkConcurrentSessions(username)) {
            const userData = this.getUser(username);
            const activeSession = userData.activeSessions ? 
                userData.activeSessions.find(s => s.active && s.deviceFingerprint !== this.deviceFingerprint) : null;
            
            let message = `⚠️ ${userData.name} ya tiene una sesión activa en otro dispositivo.\n\n`;
            
            if (activeSession) {
                message += `Dispositivo: ${activeSession.platform}\n`;
                message += `Última actividad: ${new Date(activeSession.lastActivity).toLocaleString()}\n\n`;
            }
            
            message += `¿Desea cerrar las otras sesiones e iniciar aquí?`;
            
            const confirmForce = confirm(message);
            
            if (!confirmForce) {
                return;
            }
            
            this.closeOtherSessions(username);
        }
        
        if (this.securityMode === 'bloqueo' && !this.isSessionAuthorized(sessionId)) {
            alert('🔒 Su dispositivo no está autorizado. Contacte al administrador.');
            return;
        }
        
        this.currentUser = { 
            username, 
            ...user,
            isGlobal: user.source === 'global',
            userType: user.source === 'global' ? '🌐 GLOBAL' : '💻 LOCAL'
        };
        
        this.registerAccess(username);
        this.registerUserSession(username);
        this.saveSession();
        
        if (user.role === 'admin') {
            this.showAdminPanel();
        } else {
            this.showQuiz();
        }
        
        this.loginForm.reset();
    }

    // ========== INTERFAZ MEJORADA ==========

    initializeElements() {
        console.log('🔧 Inicializando elementos...');
        
        this.accesoGlobalForm = document.getElementById('acceso-global-form');
        this.passwordGlobalInput = document.getElementById('password-global');
        this.modoSeguridadElement = document.getElementById('modo-seguridad-actual');
        
        this.loginForm = document.getElementById('login-form');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.goToAdminBtn = document.getElementById('go-to-admin');
        
        this.adminLogout = document.getElementById('admin-logout');
        this.adminUserElement = document.getElementById('admin-user');
        this.totalQuestionsElement = document.getElementById('total-questions');
        this.totalUsersElement = document.getElementById('total-users');
        this.totalExamsElement = document.getElementById('total-exams');
        this.totalIPsElement = document.getElementById('total-ips');
        this.currentModeElement = document.getElementById('current-mode');
        
        this.globalUsersElement = document.getElementById('global-users') || this.createStatsElement('global-users');
        this.localUsersElement = document.getElementById('local-users') || this.createStatsElement('local-users');
        this.activeSessionsElement = document.getElementById('active-sessions') || this.createStatsElement('active-sessions');
        
        this.setModeRegistroBtn = document.getElementById('set-mode-registro');
        this.setModeBloqueoBtn = document.getElementById('set-mode-bloqueo');
        
        this.manageQuestionsBtn = document.getElementById('manage-questions');
        this.viewResultsBtn = document.getElementById('view-results');
        this.manageIPsBtn = document.getElementById('manage-ips');
        this.manageUsersBtn = document.getElementById('manage-users');
        this.clearAllDataBtn = document.getElementById('clear-all-data');
        
        this.questionsManagement = document.getElementById('questions-management');
        this.ipsManagement = document.getElementById('ips-management');
        this.resultsManagement = document.getElementById('results-management');
        this.usersManagement = document.getElementById('users-management');
        
        this.questionsList = document.getElementById('questions-list');
        this.ipsList = document.getElementById('ips-list');
        this.resultsList = document.getElementById('results-list');
        this.usersList = document.getElementById('users-list');
        
        this.addQuestionBtn = document.getElementById('add-question');
        this.exportQuestionsBtn = document.getElementById('export-questions');
        this.refreshIPsBtn = document.getElementById('refresh-ips');
        this.clearIPsBtn = document.getElementById('clear-ips');
        this.addUserBtn = document.getElementById('add-user');
        
        this.userLogout = document.getElementById('user-logout');
        this.currentUserElement = document.getElementById('current-user');
        this.userTypeElement = document.getElementById('user-type');
        this.sessionTimerElement = document.getElementById('session-timer');
        
        this.speechPlayBtn = document.getElementById('speech-play');
        this.speechPauseBtn = document.getElementById('speech-pause');
        this.speechResumeBtn = document.getElementById('speech-resume');
        this.speechStopBtn = document.getElementById('speech-stop');
        
        this.progressText = document.getElementById('progress-text');
        this.progressFill = document.getElementById('progress-fill');
        this.pageTitle = document.getElementById('page-title');
        this.pageProgressText = document.getElementById('page-progress-text');
        this.questionsGrid = document.getElementById('questions-grid');
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');
        this.finalizarExamenBtn = document.getElementById('finalizar-examen');
        this.pageInfo = document.getElementById('page-info');
        
        this.resultsContainer = document.getElementById('results-container');
        this.resultsDetails = document.getElementById('results-details');
        this.scoreText = document.getElementById('score-text');
        this.percentageElement = document.getElementById('percentage');
        this.answeredCountElement = document.getElementById('answered-count');
        this.correctCountElement = document.getElementById('correct-count');
        this.effectivenessElement = document.getElementById('effectiveness');
        this.detailsList = document.getElementById('details-list');
        this.restartBtn = document.getElementById('restart-btn');
        this.backToMenuBtn = document.getElementById('back-to-menu');
        this.viewDetailsBtn = document.getElementById('view-details');
        this.backToResultsBtn = document.getElementById('back-to-results');
        
        this.questionModal = document.getElementById('question-modal');
        this.userModal = document.getElementById('user-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.questionForm = document.getElementById('question-form');
        this.modalSaveBtn = document.getElementById('modal-save');
        this.modalCancelBtn = document.getElementById('modal-cancel');
        this.userForm = document.getElementById('user-form');
        this.saveUserBtn = document.getElementById('save-user');
        
        this.modalPregunta = document.getElementById('modal-pregunta');
        this.modalEnunciado = document.getElementById('modal-enunciado');
        this.modalConector = document.getElementById('modal-conector');
        this.modalOpcionA = document.getElementById('modal-opcion-a');
        this.modalOpcionB = document.getElementById('modal-opcion-b');
        this.modalOpcionC = document.getElementById('modal-opcion-c');
        this.modalOpcionD = document.getElementById('modal-opcion-d');
        this.modalRespuesta = document.getElementById('modal-respuesta');
        this.newUsername = document.getElementById('new-username');
        this.newPassword = document.getElementById('new-password');
        this.newRole = document.getElementById('new-role');
        
        this.editingQuestionIndex = null;
        this.editingUser = null;

        this.createDynamicElements();
    }

    createStatsElement(id) {
        const statsContainer = document.querySelector('.admin-stats');
        if (statsContainer && !document.getElementById(id)) {
            const statElement = document.createElement('div');
            statElement.className = 'stat-item';
            statElement.id = id;
            statElement.innerHTML = `<h3>0</h3><p>${id.replace('-', ' ')}</p>`;
            statsContainer.appendChild(statElement);
            return statElement;
        }
        return null;
    }

    createDynamicElements() {
        if (!document.getElementById('user-type') && this.currentUserElement) {
            const userTypeElement = document.createElement('div');
            userTypeElement.id = 'user-type';
            userTypeElement.className = 'user-type-badge';
            userTypeElement.style.cssText = `
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 10px;
                display: inline-block;
                background-color: #6c757d;
                color: white;
            `;
            
            this.currentUserElement.parentNode.appendChild(userTypeElement);
        }

        this.improveUserModal();
    }

    // ========== SISTEMA DE REGISTRO MEJORADO ==========

    createRegistrationButton() {
        if (!document.getElementById('go-to-register') && this.loginForm) {
            const registerButton = document.createElement('button');
            registerButton.type = 'button';
            registerButton.id = 'go-to-register';
            registerButton.className = 'btn btn-outline-primary';
            registerButton.textContent = '📝 Crear Nueva Cuenta';
            registerButton.style.cssText = 'margin-top: 10px; width: 100%;';
            registerButton.addEventListener('click', () => this.showRegistrationScreen());
            
            this.loginForm.appendChild(registerButton);
        }
    }

    showRegistrationScreen() {
        this.createRegistrationModal();
        if (this.registrationModal) {
            this.registrationModal.style.display = 'block';
        }
    }

    createRegistrationModal() {
        if (document.getElementById('registration-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'registration-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; margin: 50px auto;">
                <div class="modal-header">
                    <h2>📝 Registro de Nuevo Usuario</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="registration-form">
                        <div class="form-group">
                            <label for="reg-username">Usuario:</label>
                            <input type="text" id="reg-username" class="form-control" 
                                   placeholder="Ingrese su usuario" required minlength="3">
                        </div>
                        <div class="form-group">
                            <label for="reg-password">Contraseña:</label>
                            <input type="password" id="reg-password" class="form-control" 
                                   placeholder="Ingrese su contraseña" required minlength="4">
                        </div>
                        <div class="form-group">
                            <label for="reg-confirm-password">Confirmar Contraseña:</label>
                            <input type="password" id="reg-confirm-password" class="form-control" 
                                   placeholder="Confirme su contraseña" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-name">Nombre Completo:</label>
                            <input type="text" id="reg-name" class="form-control" 
                                   placeholder="Ingrese su nombre completo" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-email">Email:</label>
                            <input type="email" id="reg-email" class="form-control" 
                                   placeholder="Ingrese su email" required>
                        </div>
                        <div class="form-group">
                            <label><strong>Tipo de Usuario:</strong></label>
                            <div class="radio-group">
                                <label style="display: block; margin: 10px 0; padding: 10px; border: 2px solid #28a745; border-radius: 5px; background: #f8fff9;">
                                    <input type="radio" name="reg-user-type" id="reg-global-user" value="global" checked>
                                    <strong>🌐 Usuario Global</strong><br>
                                    <small style="color: #666;">Disponible en todos los dispositivos</small>
                                </label>
                                <label style="display: block; margin: 10px 0; padding: 10px; border: 2px solid #6c757d; border-radius: 5px; background: #f8f9fa;">
                                    <input type="radio" name="reg-user-type" id="reg-local-user" value="local">
                                    <strong>💻 Usuario Local</strong><br>
                                    <small style="color: #666;">Solo disponible en este dispositivo</small>
                                </label>
                            </div>
                        </div>
                        <div class="form-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                            <button type="submit" class="btn btn-success" style="flex: 1;">📝 Registrarse</button>
                            <button type="button" id="cancel-registration" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.registrationModal = modal;
        this.setupRegistrationEvents();
    }

    setupRegistrationEvents() {
        const form = document.getElementById('registration-form');
        const cancelBtn = document.getElementById('cancel-registration');
        const closeBtn = this.registrationModal.querySelector('.close');

        if (form) {
            form.addEventListener('submit', (e) => this.handleRegistration(e));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeRegistrationModal());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeRegistrationModal());
        }

        this.registrationModal.addEventListener('click', (e) => {
            if (e.target === this.registrationModal) {
                this.closeRegistrationModal();
            }
        });
    }

    async handleRegistration(e) {
        e.preventDefault();
        console.log('📝 Procesando registro...');
        
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const userType = document.querySelector('input[name="reg-user-type"]:checked').value;

        console.log('Datos del registro:', { username, userType });

        if (password !== confirmPassword) {
            alert('❌ Las contraseñas no coinciden');
            return;
        }

        try {
            const userData = {
                username: username,
                password: password,
                name: name,
                email: email,
                role: 'user'
            };

            // ✅ USAR EL MÉTODO MEJORADO CON SINCRONIZACIÓN
            await this.createNewUser(userData, userType === 'global');

            alert('✅ ¡Registro exitoso! Ahora puede iniciar sesión');
            this.closeRegistrationModal();

        } catch (error) {
            console.error('❌ Error en el registro:', error);
            alert('❌ Error en el registro: ' + error.message);
        }
    }

    closeRegistrationModal() {
        if (this.registrationModal) {
            this.registrationModal.style.display = 'none';
            if (this.registrationForm) {
                this.registrationForm.reset();
            }
        }
    }

    // ========== MÉTODOS MEJORADOS PARA GUARDAR USUARIOS ==========

    async saveUser() {
        const username = this.newUsername.value.trim();
        const password = this.newPassword.value;
        const name = document.getElementById('new-name') ? document.getElementById('new-name').value : `Usuario ${username}`;
        const email = document.getElementById('new-email') ? document.getElementById('new-email').value : `${username}@ejemplo.com`;
        const role = this.newRole.value;
        
        let userType = 'local';
        if (this.globalUserRadio && this.globalUserRadio.checked) {
            userType = 'global';
        } else if (this.localUserRadio && this.localUserRadio.checked) {
            userType = 'local';
        }
        
        console.log('💾 Guardando usuario:', { username, userType, role });
        
        try {
            const userData = {
                username: username,
                password: password,
                name: name,
                email: email,
                role: role
            };
            
            if (this.editingUser) {
                this.editExistingUser(this.editingUser, userData, userType);
            } else {
                // ✅ USAR EL MÉTODO MEJORADO CON SINCRONIZACIÓN
                await this.createNewUser(userData, userType === 'global');
            }
            
            // ✅ SINCRONIZAR CON LA NUBE (JSONBin.io O Firebase)
            await this.saveUsersToCloud();
            
            this.closeModals();
            this.loadUsersList();
            this.updateAdminStats();
            
            alert(this.editingUser ? '✅ Usuario actualizado correctamente' : '✅ Usuario creado correctamente');
            
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    }

    editExistingUser(oldUsername, userData, newUserType) {
        const { username, password, name, email, role } = userData;
        
        const currentUser = this.getUser(oldUsername);
        if (!currentUser) {
            throw new Error('Usuario no encontrado');
        }
        
        this.deleteUser(oldUsername, currentUser.source, false);
        
        const updatedUser = {
            password: password,
            role: role,
            name: name,
            email: email,
            isGlobal: newUserType === 'global',
            createdAt: currentUser.createdAt || new Date().toISOString(),
            lastLogin: currentUser.lastLogin,
            activeSessions: currentUser.activeSessions || []
        };
        
        const finalUsername = username || oldUsername;
        
        if (newUserType === 'global') {
            this.globalExamUsers[finalUsername] = updatedUser;
            this.saveGlobalUsers();
        } else {
            this.users[finalUsername] = updatedUser;
            this.saveUsers();
        }
        
        console.log(`✏️ Usuario editado: ${oldUsername} -> ${finalUsername} (${newUserType})`);
    }

    improveUserModal() {
        if (!this.userForm) return;
        
        if (!document.getElementById('new-name')) {
            const nameGroup = document.createElement('div');
            nameGroup.className = 'form-group';
            nameGroup.innerHTML = `
                <label for="new-name"><strong>Nombre completo:</strong></label>
                <input type="text" id="new-name" class="form-control" placeholder="Ingrese el nombre completo" required>
            `;
            this.newUsername.parentNode.parentNode.insertBefore(nameGroup, this.newUsername.parentNode.nextSibling);
        }
        
        if (!document.getElementById('new-email')) {
            const emailGroup = document.createElement('div');
            emailGroup.className = 'form-group';
            emailGroup.innerHTML = `
                <label for="new-email"><strong>Email:</strong></label>
                <input type="email" id="new-email" class="form-control" placeholder="Ingrese el email" required>
            `;
            const nameGroup = document.getElementById('new-name').parentNode;
            nameGroup.parentNode.insertBefore(emailGroup, nameGroup.nextSibling);
        }
        
        if (!document.getElementById('user-type-radio')) {
            const userTypeDiv = document.createElement('div');
            userTypeDiv.id = 'user-type-radio';
            userTypeDiv.className = 'form-group';
            userTypeDiv.innerHTML = `
                <label><strong>Tipo de Usuario:</strong></label>
                <div class="radio-group">
                    <label style="display: block; margin: 10px 0; padding: 10px; border: 2px solid #28a745; border-radius: 5px; background: #f8fff9;">
                        <input type="radio" name="user-type" id="global-user" value="global" checked>
                        <strong>🌐 Usuario Global</strong><br>
                        <small style="color: #666;">Disponible en todos los dispositivos</small>
                    </label>
                    <label style="display: block; margin: 10px 0; padding: 10px; border: 2px solid #6c757d; border-radius: 5px; background: #f8f9fa;">
                        <input type="radio" name="user-type" id="local-user" value="local">
                        <strong>💻 Usuario Local</strong><br>
                        <small style="color: #666;">Solo disponible en este dispositivo</small>
                    </label>
                </div>
            `;
            
            const roleField = this.newRole;
            if (roleField && roleField.parentNode) {
                roleField.parentNode.parentNode.insertBefore(userTypeDiv, roleField.parentNode.nextSibling);
            }
        }
        
        this.globalUserRadio = document.getElementById('global-user');
        this.localUserRadio = document.getElementById('local-user');
    }

    setupEventListeners() {
        console.log('🔗 Configurando event listeners...');
        
        if (this.accesoGlobalForm) {
            this.accesoGlobalForm.addEventListener('submit', (e) => this.handleGlobalAccess(e));
            console.log('✅ Event listener de acceso global configurado');
        } else {
            this.setupFallbackAccess();
        }
        
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (this.goToAdminBtn) {
            this.goToAdminBtn.addEventListener('click', () => this.showScreen('login-screen'));
        }
        
        if (this.adminLogout) {
            this.adminLogout.addEventListener('click', () => this.logout());
        }
        
        if (this.setModeRegistroBtn && this.setModeBloqueoBtn) {
            this.setModeRegistroBtn.addEventListener('click', () => this.setSecurityMode('registro'));
            this.setModeBloqueoBtn.addEventListener('click', () => this.setSecurityMode('bloqueo'));
        }
        
        if (this.manageQuestionsBtn) this.manageQuestionsBtn.addEventListener('click', () => this.showManagementSection('questions'));
        if (this.viewResultsBtn) this.viewResultsBtn.addEventListener('click', () => this.showManagementSection('results'));
        if (this.manageIPsBtn) this.manageIPsBtn.addEventListener('click', () => this.showManagementSection('ips'));
        if (this.manageUsersBtn) this.manageUsersBtn.addEventListener('click', () => this.showManagementSection('users'));
        if (this.clearAllDataBtn) this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
        
        if (this.addQuestionBtn) this.addQuestionBtn.addEventListener('click', () => this.openQuestionModal());
        if (this.exportQuestionsBtn) this.exportQuestionsBtn.addEventListener('click', () => this.exportQuestions());
        if (this.refreshIPsBtn) this.refreshIPsBtn.addEventListener('click', () => this.loadSessionsList());
        if (this.clearIPsBtn) this.clearIPsBtn.addEventListener('click', () => this.clearAllSessions());
        if (this.addUserBtn) this.addUserBtn.addEventListener('click', () => this.openUserModal());
        
        if (this.userLogout) this.userLogout.addEventListener('click', () => this.logout());
        
        if (this.speechPlayBtn) this.speechPlayBtn.addEventListener('click', () => {
            this.speechEnabled = true;
            this.startSpeech();
        });
        if (this.speechPauseBtn) this.speechPauseBtn.addEventListener('click', () => this.pauseSpeech());
        if (this.speechResumeBtn) this.speechResumeBtn.addEventListener('click', () => this.resumeSpeech());
        if (this.speechStopBtn) this.speechStopBtn.addEventListener('click', () => {
            this.stopSpeech();
            this.speechEnabled = false;
            this.updateSpeechButtons(false, true, true);
        });
        
        if (this.prevPageBtn) this.prevPageBtn.addEventListener('click', () => this.previousPage());
        if (this.nextPageBtn) this.nextPageBtn.addEventListener('click', () => this.nextPage());
        if (this.finalizarExamenBtn) this.finalizarExamenBtn.addEventListener('click', () => this.finalizarExamen());
        
        if (this.restartBtn) this.restartBtn.addEventListener('click', () => this.restartQuiz());
        if (this.backToMenuBtn) this.backToMenuBtn.addEventListener('click', () => this.showScreen('quiz-screen'));
        if (this.viewDetailsBtn) this.viewDetailsBtn.addEventListener('click', () => this.showResultsDetails());
        if (this.backToResultsBtn) this.backToResultsBtn.addEventListener('click', () => this.showResultsSummary());
        
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });
        
        const closeUserModal = document.querySelector('.close-user-modal');
        if (closeUserModal) {
            closeUserModal.addEventListener('click', () => this.closeModals());
        }
        
        if (this.modalCancelBtn) this.modalCancelBtn.addEventListener('click', () => this.closeModals());
        if (this.modalSaveBtn) this.modalSaveBtn.addEventListener('click', () => this.saveQuestion());
        if (this.saveUserBtn) this.saveUserBtn.addEventListener('click', () => this.saveUser());
        
        window.addEventListener('click', (e) => {
            if (this.questionModal && e.target === this.questionModal) this.closeModals();
            if (this.userModal && e.target === this.userModal) this.closeModals();
        });
        
        setInterval(() => this.updateActivity(), 30000);
    }

    setupFallbackAccess() {
        console.log('🔄 Configurando sistema de acceso de emergencia...');
        
        const forms = document.querySelectorAll('form');
        forms.forEach((form, index) => {
            const passwordInput = form.querySelector('input[type="password"]');
            if (passwordInput) {
                console.log(`✅ Encontrado formulario con contraseña (índice ${index})`);
                
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const password = passwordInput.value;
                    
                    console.log(`🔐 Verificando contraseña: "${password}"`);
                    
                    if (password === this.globalPassword) {
                        console.log('✅ Contraseña correcta - Acceso concedido');
                        this.showScreen('login-screen');
                        passwordInput.value = '';
                    } else {
                        alert('❌ Contraseña incorrecta. La contraseña global es: Examen2024!');
                        passwordInput.value = '';
                    }
                });
            }
        });
        
        this.createEmergencyAccessButton();
    }

    createEmergencyAccessButton() {
        if (document.getElementById('emergency-access-btn')) return;
        
        const emergencyBtn = document.createElement('button');
        emergencyBtn.id = 'emergency-access-btn';
        emergencyBtn.innerHTML = '🚨 ACCESO DE EMERGENCIA 🚨';
        emergencyBtn.className = 'btn btn-danger';
        emergencyBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            padding: 10px 15px;
            font-size: 12px;
            font-weight: bold;
        `;
        
        emergencyBtn.addEventListener('click', () => {
            const password = prompt('🔐 Ingrese la contraseña global:');
            if (password === this.globalPassword) {
                this.showScreen('login-screen');
            } else {
                alert('❌ Contraseña incorrecta');
            }
        });
        
        document.body.appendChild(emergencyBtn);
    }

    // ========== NAVEGACIÓN Y UI ==========

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        console.log(`🖥️ Mostrando pantalla: ${screenId}`);
    }

    showAdminPanel() {
        this.showScreen('admin-panel');
        if (this.adminUserElement) {
            this.adminUserElement.textContent = this.currentUser.name;
        }
        this.updateAdminStats();
        this.updateSecurityDisplay();
    }

    showQuiz() {
        this.showScreen('quiz-screen');
        if (this.currentUserElement) {
            this.currentUserElement.textContent = this.currentUser.name;
        }
        
        if (this.userTypeElement) {
            this.userTypeElement.textContent = this.currentUser.userType;
            this.userTypeElement.style.backgroundColor = this.currentUser.isGlobal ? '#28a745' : '#6c757d';
        }
        
        this.startNewExam();
        this.startSessionTimer();
        this.updateSpeechButtons(false, true, true);
    }

    logout() {
        this.stopSpeech();
        this.speechEnabled = false;
        
        if (this.currentUser) {
            const sessionId = this.getCurrentSessionId();
            const session = this.sessions.find(s => s.sessionId === sessionId && s.username === this.currentUser.username);
            if (session) {
                session.active = false;
                this.saveSessions();
            }
            
            const user = this.getUser(this.currentUser.username);
            if (user && user.activeSessions) {
                user.activeSessions = user.activeSessions.map(session => 
                    session.deviceFingerprint === this.deviceFingerprint ? 
                    { ...session, active: false } : session
                );
                this.saveUserData(this.currentUser.username);
            }
        }
        
        localStorage.removeItem('currentSession');
        localStorage.removeItem('examProgress');
        
        this.currentUser = null;
        this.stopSessionTimer();
        this.showScreen('acceso-global-screen');
    }

    updateSecurityDisplay() {
        if (this.modoSeguridadElement) {
            this.modoSeguridadElement.textContent = this.securityMode === 'registro' ? 'Registro' : 'Bloqueo';
        }
        
        if (this.currentModeElement) {
            this.currentModeElement.textContent = this.securityMode === 'registro' ? 'Registro' : 'Bloqueo';
        }
        
        if (this.setModeRegistroBtn && this.setModeBloqueoBtn) {
            if (this.securityMode === 'registro') {
                this.setModeRegistroBtn.classList.add('btn-primary');
                this.setModeRegistroBtn.classList.remove('btn-secondary');
                this.setModeBloqueoBtn.classList.add('btn-secondary');
                this.setModeBloqueoBtn.classList.remove('btn-primary');
            } else {
                this.setModeRegistroBtn.classList.add('btn-secondary');
                this.setModeRegistroBtn.classList.remove('btn-primary');
                this.setModeBloqueoBtn.classList.add('btn-primary');
                this.setModeBloqueoBtn.classList.remove('btn-secondary');
            }
        }
    }

    setSecurityMode(mode) {
        this.saveSecurityMode(mode);
        this.updateSecurityDisplay();
        alert(`Modo de seguridad cambiado a: ${mode === 'registro' ? 'Registro' : 'Bloqueo'}`);
    }

    updateAdminStats() {
        if (this.totalQuestionsElement) {
            this.totalQuestionsElement.textContent = this.questions.length;
        }
        if (this.totalUsersElement) {
            const totalUsers = Object.keys(this.users).length + 
                              Object.keys(this.adminCredentials).length + 
                              Object.keys(this.globalExamUsers).length;
            this.totalUsersElement.textContent = totalUsers;
        }
        if (this.totalExamsElement) {
            this.totalExamsElement.textContent = this.examResults.length;
        }
        if (this.totalIPsElement) {
            this.totalIPsElement.textContent = this.sessions.length;
        }
        
        if (this.globalUsersElement) {
            const globalUsersCount = Object.keys(this.globalExamUsers).length;
            this.globalUsersElement.textContent = globalUsersCount;
            if (this.globalUsersElement.querySelector) {
                const h3 = this.globalUsersElement.querySelector('h3');
                if (h3) h3.textContent = globalUsersCount;
            }
        }
        if (this.localUsersElement) {
            const localUsersCount = Object.keys(this.users).length;
            this.localUsersElement.textContent = localUsersCount;
            if (this.localUsersElement.querySelector) {
                const h3 = this.localUsersElement.querySelector('h3');
                if (h3) h3.textContent = localUsersCount;
            }
        }
        if (this.activeSessionsElement) {
            const activeSessions = Object.values(this.globalExamUsers).reduce((total, user) => 
                total + (user.activeSessions ? user.activeSessions.filter(s => s.active).length : 0), 0
            );
            this.activeSessionsElement.textContent = activeSessions;
            if (this.activeSessionsElement.querySelector) {
                const h3 = this.activeSessionsElement.querySelector('h3');
                if (h3) h3.textContent = activeSessions;
            }
        }
    }

    showManagementSection(section) {
        document.querySelectorAll('.management-section').forEach(section => {
            section.classList.remove('active');
        });
        
        switch(section) {
            case 'questions':
                if (this.questionsManagement) {
                    this.questionsManagement.classList.add('active');
                    this.loadQuestionsList();
                }
                break;
            case 'results':
                if (this.resultsManagement) {
                    this.resultsManagement.classList.add('active');
                    this.loadResultsList();
                }
                break;
            case 'ips':
                if (this.ipsManagement) {
                    this.ipsManagement.classList.add('active');
                    this.loadSessionsList();
                }
                break;
            case 'users':
                if (this.usersManagement) {
                    this.usersManagement.classList.add('active');
                    this.loadUsersList();
                }
                break;
        }
    }

    // ========== SISTEMA DE EXAMEN ==========

    loadQuestions() {
        if (typeof preguntas !== 'undefined' && preguntas.length > 0) {
            this.questions = preguntas;
            console.log(`✅ ${this.questions.length} preguntas cargadas`);
        } else {
            console.error('❌ No se pudieron cargar las preguntas');
            this.questions = [];
        }
    }

    startNewExam() {
        this.currentPage = 1;
        this.userAnswers = new Array(this.questions.length).fill(null);
        if (this.resultsContainer) this.resultsContainer.style.display = 'none';
        if (this.resultsDetails) this.resultsDetails.style.display = 'none';
        if (this.questionsGrid) this.questionsGrid.style.display = 'grid';
        this.loadCurrentPage();
        this.updateProgress();
        this.updateNavigation();
        
        localStorage.removeItem('examProgress');
    }

    loadCurrentPage() {
        if (this.questions.length === 0) return;

        const startIndex = (this.currentPage - 1) * this.questionsPerPage;
        const endIndex = Math.min(startIndex + this.questionsPerPage, this.questions.length);
        
        if (this.questionsGrid) {
            this.questionsGrid.innerHTML = '';
        }
        
        if (this.pageTitle) {
            this.pageTitle.textContent = `Página ${this.currentPage} - Preguntas ${startIndex + 1} a ${endIndex}`;
        }
        if (this.pageInfo) {
            this.pageInfo.textContent = `Página ${this.currentPage} de ${this.totalPages}`;
        }
        
        for (let i = startIndex; i < endIndex; i++) {
            const question = this.questions[i];
            if (!question) continue;
            
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item-grid';
            questionElement.innerHTML = `
                <div class="question-number">Pregunta ${question.pregunta}</div>
                <div class="question-text">${question.enunciado}</div>
                <div class="conector">${question.conector}</div>
                <div class="options-grid">
                    ${question.opciones.map((opcion, optionIndex) => {
                        const optionKey = Object.keys(opcion)[0];
                        const optionText = opcion[optionKey];
                        const isSelected = this.userAnswers[i] === optionIndex;
                        return `
                            <button class="option-btn ${isSelected ? 'selected' : ''}" 
                                    data-question="${i}" 
                                    data-option="${optionIndex}">
                                <strong>${optionKey}:</strong> ${optionText}
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
            if (this.questionsGrid) {
                this.questionsGrid.appendChild(questionElement);
            }
        }
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionIndex = parseInt(e.target.closest('.option-btn').dataset.question);
                const optionIndex = parseInt(e.target.closest('.option-btn').dataset.option);
                this.selectOption(questionIndex, optionIndex);
            });
        });
    }

    selectOption(questionIndex, optionIndex) {
        document.querySelectorAll(`.option-btn[data-question="${questionIndex}"]`).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = document.querySelector(`.option-btn[data-question="${questionIndex}"][data-option="${optionIndex}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        this.userAnswers[questionIndex] = optionIndex;
        this.updateProgress();
        this.updateActivity();
        this.saveExamProgress();
    }

    updateProgress() {
        const totalQuestions = this.questions.length;
        const answered = this.userAnswers.filter(answer => answer !== null).length;
        const progressPercentage = (answered / totalQuestions) * 100;
        
        if (this.progressText) {
            this.progressText.textContent = `Página ${this.currentPage} de ${this.totalPages} - Progreso: ${progressPercentage.toFixed(1)}%`;
        }
        if (this.progressFill) {
            this.progressFill.style.width = `${progressPercentage}%`;
        }
        
        const startIndex = (this.currentPage - 1) * this.questionsPerPage;
        const endIndex = Math.min(startIndex + this.questionsPerPage, totalQuestions);
        const pageQuestions = endIndex - startIndex;
        const pageAnswered = this.userAnswers.slice(startIndex, endIndex).filter(answer => answer !== null).length;
        
        if (this.pageProgressText) {
            this.pageProgressText.textContent = `Respondidas: ${pageAnswered}/${pageQuestions}`;
        }
        
        this.updateNavigation();
    }

    updateNavigation() {
        const totalQuestions = this.questions.length;
        const answered = this.userAnswers.filter(answer => answer !== null).length;
        
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage === 1;
        }
        
        if (this.nextPageBtn && this.finalizarExamenBtn) {
            if (this.currentPage === this.totalPages) {
                this.nextPageBtn.style.display = 'none';
                this.finalizarExamenBtn.style.display = 'block';
            } else {
                this.nextPageBtn.style.display = 'block';
                this.finalizarExamenBtn.style.display = 'none';
            }
        }
        
        if (this.finalizarExamenBtn) {
            this.finalizarExamenBtn.disabled = answered === 0;
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadCurrentPage();
            this.updateProgress();
            this.saveExamProgress();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadCurrentPage();
            this.updateProgress();
            this.saveExamProgress();
        }
    }

    finalizarExamen() {
        if (confirm('¿Está seguro de que desea finalizar el examen? No podrá modificar sus respuestas después.')) {
            localStorage.removeItem('examProgress');
            this.calculateResults();
        }
    }

    calculateResults() {
        let score = 0;
        let answered = 0;
        const results = [];

        this.questions.forEach((question, index) => {
            const userAnswerIndex = this.userAnswers[index];
            let userAnswerText = "No respondida";
            let isCorrect = false;

            if (userAnswerIndex !== null) {
                answered++;
                const userOptionKey = Object.keys(question.opciones[userAnswerIndex])[0];
                userAnswerText = question.opciones[userAnswerIndex][userOptionKey];
                
                if (userAnswerText === question.respuesta) {
                    score++;
                    isCorrect = true;
                }
            }

            results.push({
                question: question.enunciado,
                conector: question.conector,
                userAnswer: userAnswerText,
                correctAnswer: question.respuesta,
                isCorrect: isCorrect,
                number: question.pregunta
            });
        });

        const percentage = ((score / this.questions.length) * 100).toFixed(1);
        const effectiveness = answered > 0 ? ((score / answered) * 100).toFixed(1) : 0;

        this.examResults.push({
            user: this.currentUser.username,
            score: score,
            total: this.questions.length,
            percentage: percentage,
            answered: answered,
            effectiveness: effectiveness,
            date: new Date().toISOString()
        });
        this.saveExamResults();

        this.showResults(score, answered, percentage, effectiveness, results);
    }

    showResults(score, answered, percentage, effectiveness, results) {
        if (this.scoreText) this.scoreText.textContent = `${score}/${this.questions.length} correctas`;
        if (this.percentageElement) this.percentageElement.textContent = `${percentage}%`;
        if (this.answeredCountElement) this.answeredCountElement.textContent = answered;
        if (this.correctCountElement) this.correctCountElement.textContent = score;
        if (this.effectivenessElement) this.effectivenessElement.textContent = `${effectiveness}%`;

        this.currentExamDetails = results;

        if (this.questionsGrid) this.questionsGrid.style.display = 'none';
        if (this.resultsContainer) this.resultsContainer.style.display = 'block';
    }

    showResultsDetails() {
        if (!this.currentExamDetails) return;

        if (this.detailsList) {
            this.detailsList.innerHTML = '';
            this.currentExamDetails.forEach((detail) => {
                const detailElement = document.createElement('div');
                detailElement.className = `detail-item ${detail.isCorrect ? 'correct' : 'incorrect'}`;
                detailElement.innerHTML = `
                    <h4>Pregunta ${detail.number}</h4>
                    <p><strong>Enunciado:</strong> ${detail.question}</p>
                    <p><strong>Conector:</strong> ${detail.conector}</p>
                    <p><strong>Tu respuesta:</strong> ${detail.userAnswer}</p>
                    <p><strong>Respuesta correcta:</strong> ${detail.correctAnswer}</p>
                    <p><strong>Resultado:</strong> ${detail.isCorrect ? '✅ Correcto' : '❌ Incorrecto'}</p>
                `;
                this.detailsList.appendChild(detailElement);
            });
        }

        if (this.resultsContainer) this.resultsContainer.style.display = 'none';
        if (this.resultsDetails) this.resultsDetails.style.display = 'block';
    }

    showResultsSummary() {
        if (this.resultsDetails) this.resultsDetails.style.display = 'none';
        if (this.resultsContainer) this.resultsContainer.style.display = 'block';
    }

    restartQuiz() {
        if (confirm('¿Está seguro de que desea comenzar un nuevo examen? Se perderán las respuestas actuales.')) {
            this.startNewExam();
        }
    }

    startSessionTimer() {
        let timeLeft = this.sessionDuration;
        
        this.sessionTimer = setInterval(() => {
            timeLeft--;
            
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;
            
            if (this.sessionTimerElement) {
                this.sessionTimerElement.textContent = 
                    `⏱️ Tiempo restante: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (timeLeft <= 0) {
                this.stopSessionTimer();
                alert('⏰ Su sesión ha expirado. Será redirigido al login.');
                this.logout();
            }
        }, 1000);
    }

    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    updateActivity() {
        if (this.currentUser) {
            const sessionId = this.getCurrentSessionId();
            const session = this.sessions.find(s => s.sessionId === sessionId && s.username === this.currentUser.username);
            if (session) {
                session.lastActivity = new Date().toISOString();
                session.active = true;
                this.saveSessions();
            }
            
            this.updateUserActivity(this.currentUser.username);
        }
    }

    // ========== PERSISTENCIA MEJORADA ==========

    restoreSession() {
        const savedSession = localStorage.getItem('currentSession');
        
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                this.currentUser = session.currentUser;
                
                if (this.currentUser) {
                    console.log(`✅ Sesión encontrada para: ${this.currentUser.username}`);
                    
                    // ✅ VERIFICACIÓN MEJORADA: Solo restaurar sesión si la IP está autorizada
                    if (this.ipVerified) {
                        if (this.currentUser.role === 'admin') {
                            console.log('🔑 Restaurando sesión de administrador');
                            this.showAdminPanel();
                        } else {
                            console.log('📝 Restaurando sesión de usuario');
                            this.showScreen('quiz-screen');
                            const savedProgress = localStorage.getItem('examProgress');
                            if (savedProgress) {
                                const progress = JSON.parse(savedProgress);
                                this.currentPage = progress.currentPage || 1;
                                this.userAnswers = progress.userAnswers || new Array(350).fill(null);
                                this.loadCurrentPage();
                                this.updateProgress();
                                
                                // ✅ ACTUALIZAR ACTIVIDAD DEL USUARIO
                                this.updateUserActivity(this.currentUser.username);
                            }
                            
                            // ✅ ACTUALIZAR INTERFAZ DE USUARIO
                            if (this.currentUserElement) {
                                this.currentUserElement.textContent = this.currentUser.name;
                            }
                            if (this.userTypeElement) {
                                this.userTypeElement.textContent = this.currentUser.userType;
                                this.userTypeElement.style.backgroundColor = this.currentUser.isGlobal ? '#28a745' : '#6c757d';
                            }
                            
                            // ✅ INICIAR TEMPORIZADOR DE SESIÓN
                            this.startSessionTimer();
                            this.updateSpeechButtons(false, true, true);
                        }
                        return true; // Sesión restaurada exitosamente
                    } else {
                        console.log('❌ IP no autorizada, no se puede restaurar sesión');
                        // Limpiar sesión si la IP no está autorizada
                        localStorage.removeItem('currentSession');
                        this.currentUser = null;
                        this.showScreen('acceso-global-screen');
                        return false;
                    }
                }
            } catch (e) {
                console.error('Error al restaurar sesión:', e);
                // Limpiar sesión corrupta
                localStorage.removeItem('currentSession');
                this.currentUser = null;
            }
        }
        
        // No hay sesión o no se pudo restaurar
        console.log('🔐 No hay sesión activa, mostrando pantalla de acceso global');
        this.showScreen('acceso-global-screen');
        return false;
    }

    saveSession() {
        if (this.currentUser) {
            const session = {
                currentUser: this.currentUser,
                timestamp: new Date().toISOString(),
                ip: this.currentIP // ✅ GUARDAR TAMBIÉN LA IP ACTUAL
            };
            localStorage.setItem('currentSession', JSON.stringify(session));
            console.log('💾 Sesión guardada para:', this.currentUser.username);
        }
    }

    saveExamProgress() {
        if (this.currentUser && this.currentUser.role === 'user') {
            const progress = {
                currentPage: this.currentPage,
                userAnswers: this.userAnswers,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('examProgress', JSON.stringify(progress));
        }
    }

    // ========== GESTIÓN DE SESIONES MEJORADA ==========

    async loadSessionsList() {
        if (!this.ipsList) return;
        
        this.ipsList.innerHTML = '<div class="loading">Cargando sesiones...</div>';
        
        console.log('📊 Cargando lista de sesiones...');
        
        try {
            // 1. Cargar accessLogs desde Firebase
            const accessLogsSnapshot = await firebase.database().ref('accessLogs').once('value');
            const accessLogs = accessLogsSnapshot.val();
            
            // 2. Cargar sesiones locales
            const localSessions = this.sessions;
            
            console.log('📝 AccessLogs desde Firebase:', accessLogs);
            console.log('💻 Sesiones locales:', localSessions);
            
            this.ipsList.innerHTML = '';
            
            // 3. Mostrar ACCESS LOGS (desde Firebase)
            const accessLogsSection = document.createElement('div');
            accessLogsSection.className = 'logs-section';
            accessLogsSection.innerHTML = '<h3>🌐 Historial de Accesos (Firebase)</h3>';
            
            if (accessLogs && Object.keys(accessLogs).length > 0) {
                const logsArray = Object.entries(accessLogs).map(([key, value]) => ({ key, ...value }));
                const sortedLogs = logsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                sortedLogs.forEach((log, index) => {
                    const logElement = document.createElement('div');
                    logElement.className = `log-item ${log.allowed ? 'allowed' : 'blocked'}`;
                    
                    const timestamp = new Date(log.timestamp).toLocaleString();
                    const status = log.allowed ? '✅ Permitido' : '❌ Denegado';
                    
                    logElement.innerHTML = `
                        <div class="log-header">
                            <strong>IP: ${log.ip}</strong>
                            <span class="log-status">${status}</span>
                        </div>
                        <div class="log-details">
                            <p><strong>Razón:</strong> ${log.reason}</p>
                            <p><strong>Fecha:</strong> ${timestamp}</p>
                            <p><strong>Dispositivo:</strong> ${log.platform || 'N/A'}</p>
                            <p><strong>Navegador:</strong> ${this.getBrowserFromUA(log.userAgent)}</p>
                            <div class="ip-block-actions">
                                ${log.allowed ? 
                                    `<button class="btn btn-warning block-ip-btn" data-ip="${log.ip}">🚫 Bloquear IP</button>` : 
                                    `<button class="btn btn-success unblock-ip-btn" data-ip="${log.ip}">✅ Permitir IP</button>`
                                }
                            </div>
                        </div>
                    `;
                    accessLogsSection.appendChild(logElement);
                });
            } else {
                accessLogsSection.innerHTML += '<p class="no-data">No hay registros de acceso</p>';
            }
            
            this.ipsList.appendChild(accessLogsSection);
            
            // 4. Mostrar SESIONES LOCALES
            const sessionsSection = document.createElement('div');
            sessionsSection.className = 'sessions-section';
            sessionsSection.innerHTML = '<h3>💻 Sesiones Activas (Local)</h3>';
            
            if (localSessions.length > 0) {
                const sortedSessions = [...localSessions].sort((a, b) => 
                    new Date(b.lastAccess) - new Date(a.firstAccess)
                );
                
                sortedSessions.forEach((session, index) => {
                    const sessionElement = document.createElement('div');
                    sessionElement.className = 'session-item';
                    
                    const lastAccess = new Date(session.lastAccess).toLocaleString();
                    const firstAccess = new Date(session.firstAccess).toLocaleString();
                    const status = session.active ? '🟢 Activo' : '🔴 Inactivo';
                    const authorized = session.authorized ? '✅ Autorizado' : '❌ No autorizado';
                    const deviceType = session.deviceInfo ? session.deviceInfo.deviceType : 'Desconocido';
                    const browser = session.deviceInfo ? session.deviceInfo.browser : 'Desconocido';
                    
                    sessionElement.innerHTML = `
                        <h4>${session.sessionId.substring(0, 20)}... ${session.username ? `(Usuario: ${session.username})` : ''}</h4>
                        <p><strong>Estado:</strong> ${status} | ${authorized}</p>
                        <p><strong>Dispositivo:</strong> ${deviceType} | ${browser}</p>
                        <p><strong>Primer acceso:</strong> ${firstAccess}</p>
                        <p><strong>Último acceso:</strong> ${lastAccess}</p>
                        <p><strong>Accesos totales:</strong> ${session.accessCount}</p>
                        <div class="ip-actions">
                            ${!session.authorized ? 
                                `<button class="btn btn-success authorize-session" data-session="${session.sessionId}">✅ Autorizar</button>` : 
                                `<button class="btn btn-warning block-session" data-session="${session.sessionId}">🚫 Bloquear</button>`
                            }
                            <button class="btn btn-danger delete-session" data-session="${session.sessionId}">🗑️ Eliminar</button>
                        </div>
                    `;
                    sessionsSection.appendChild(sessionElement);
                });
            } else {
                sessionsSection.innerHTML += '<p class="no-data">No hay sesiones locales registradas</p>';
            }
            
            this.ipsList.appendChild(sessionsSection);
            
            // 5. Agregar event listeners a los botones
            this.attachSessionEventListeners();
            
        } catch (error) {
            console.error('❌ Error cargando sesiones:', error);
            this.ipsList.innerHTML = '<p class="error">Error cargando sesiones: ' + error.message + '</p>';
        }
        
        this.updateAdminStats();
    }

    // ✅ MÉTODO AUXILIAR NUEVO - IDENTIFICAR NAVEGADOR
    getBrowserFromUA(userAgent) {
        if (!userAgent) return 'Desconocido';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Otro';
    }

    // ✅ MÉTODO AUXILIAR NUEVO - MANEJAR EVENTOS DE SESIONES
    attachSessionEventListeners() {
        // Event listeners para sesiones locales
        document.querySelectorAll('.authorize-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.dataset.session;
                if (this.authorizeSession(sessionId)) {
                    alert(`✅ Sesión autorizada correctamente`);
                    this.loadSessionsList();
                }
            });
        });
        
        document.querySelectorAll('.block-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.dataset.session;
                if (this.blockSession(sessionId)) {
                    alert(`🚫 Sesión bloqueada correctamente`);
                    this.loadSessionsList();
                }
            });
        });
        
        document.querySelectorAll('.delete-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.dataset.session;
                if (confirm(`¿Está seguro de que desea eliminar esta sesión?`)) {
                    this.deleteSession(sessionId);
                    alert(`🗑️ Sesión eliminada correctamente`);
                    this.loadSessionsList();
                }
            });
        });
        
        // ✅ NUEVOS EVENT LISTENERS PARA BLOQUEO DE IP
        document.querySelectorAll('.block-ip-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const ipAddress = e.target.dataset.ip;
                if (confirm(`¿Está seguro de que desea BLOQUEAR la IP ${ipAddress}?`)) {
                    const success = await this.blockIP(ipAddress, 'Bloqueada manualmente por administrador');
                    if (success) {
                        alert(`🚫 IP ${ipAddress} bloqueada correctamente`);
                        this.loadSessionsList();
                    } else {
                        alert('❌ Error al bloquear la IP');
                    }
                }
            });
        });
        
        document.querySelectorAll('.unblock-ip-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const ipAddress = e.target.dataset.ip;
                if (confirm(`¿Está seguro de que desea PERMITIR la IP ${ipAddress}?`)) {
                    const success = await this.unblockIP(ipAddress);
                    if (success) {
                        alert(`✅ IP ${ipAddress} permitida correctamente`);
                        this.loadSessionsList();
                    } else {
                        alert('❌ Error al permitir la IP');
                    }
                }
            });
        });
    }

    clearAllSessions() {
        if (confirm('¿Está seguro de que desea eliminar todas las sesiones registradas?')) {
            this.sessions = [];
            this.saveSessions();
            this.loadSessionsList();
            alert('✅ Todas las sesiones han sido eliminadas');
        }
    }

    // ========== GESTIÓN DE USUARIOS MEJORADA ==========

    loadUsersList() {
        if (!this.usersList) return;
        
        this.usersList.innerHTML = '';
        
        const allUsers = [
            ...Object.entries(this.globalExamUsers).map(([username, data]) => ({
                username,
                ...data,
                type: 'global'
            })),
            ...Object.entries(this.users).map(([username, data]) => ({
                username,
                ...data,
                type: 'local'
            })),
            ...Object.entries(this.adminCredentials).map(([username, data]) => ({
                username,
                ...data,
                type: 'admin'
            }))
        ];
        
        console.log(`📊 Cargando lista de usuarios: ${allUsers.length} usuarios`);
        
        if (allUsers.length === 0) {
            this.usersList.innerHTML = '<p class="no-data">No hay usuarios registrados</p>';
            return;
        }
        
        allUsers.forEach((user) => {
            const userElement = document.createElement('div');
            userElement.className = `user-item ${user.type}`;
            
            const typeBadge = user.type === 'global' ? '🌐 GLOBAL' : 
                             user.type === 'admin' ? '👑 ADMIN' : '💻 LOCAL';
            
            const roleBadge = user.role === 'admin' ? 'Administrador' : 'Usuario Normal';
            
            const activeSessions = user.activeSessions ? 
                user.activeSessions.filter(s => s.active).length : 0;
            
            const lastLogin = user.lastLogin ? 
                new Date(user.lastLogin).toLocaleString() : 'Nunca';
            
            userElement.innerHTML = `
                <div class="user-header">
                    <h4>${user.name} (${user.username})</h4>
                    <span class="user-type-badge ${user.type}">${typeBadge}</span>
                </div>
                <p><strong>Rol:</strong> ${roleBadge}</p>
                <p><strong>Tipo:</strong> ${typeBadge}</p>
                <p><strong>Sesiones activas:</strong> ${activeSessions}</p>
                <p><strong>Último login:</strong> ${lastLogin}</p>
                <p><strong>Contraseña:</strong> ••••••••</p>
                <div class="user-actions">
                    <button class="btn btn-primary edit-user" data-username="${user.username}" data-type="${user.type}">✏️ Editar</button>
                    ${user.username !== 'admin' ? 
                        `<button class="btn btn-warning logout-user" data-username="${user.username}" data-type="${user.type}">🚪 Cerrar Sesiones</button>
                         <button class="btn btn-danger delete-user" data-username="${user.username}" data-type="${user.type}">🗑️ Eliminar</button>` : 
                        '<button class="btn btn-secondary" disabled>No se puede eliminar admin</button>'
                    }
                </div>
                ${activeSessions > 0 ? `
                    <div class="active-sessions">
                        <strong>Sesiones activas:</strong>
                        ${user.activeSessions.filter(s => s.active).map(session => `
                            <div class="session-info">
                                📱 ${session.platform} - 
                                ${new Date(session.lastActivity).toLocaleString()}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
            this.usersList.appendChild(userElement);
        });
        
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username;
                const type = e.target.dataset.type;
                this.editUser(username, type);
            });
        });
        
        document.querySelectorAll('.logout-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username;
                const type = e.target.dataset.type;
                this.forceLogoutUser(username, type);
            });
        });
        
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username;
                const type = e.target.dataset.type;
                this.deleteUser(username, type);
            });
        });
    }

    openUserModal(username = null, type = null) {
        this.editingUser = username;
        this.editingUserType = type;
        
        this.improveUserModal();
        
        if (username) {
            const userData = this.getUser(username);
            
            this.newUsername.value = username;
            this.newPassword.value = userData.password;
            this.newRole.value = userData.role;
            
            if (document.getElementById('new-name')) {
                document.getElementById('new-name').value = userData.name || `Usuario ${username}`;
            }
            if (document.getElementById('new-email')) {
                document.getElementById('new-email').value = userData.email || `${username}@ejemplo.com`;
            }
            
            if (this.globalUserRadio && this.localUserRadio) {
                if (userData.source === 'global' || userData.isGlobal) {
                    this.globalUserRadio.checked = true;
                    this.localUserRadio.checked = false;
                } else {
                    this.globalUserRadio.checked = false;
                    this.localUserRadio.checked = true;
                }
            }
            
            this.newUsername.disabled = true;
        } else {
            this.userForm.reset();
            this.newUsername.disabled = false;
            
            if (this.globalUserRadio) {
                this.globalUserRadio.checked = true;
                this.localUserRadio.checked = false;
            }
        }
        
        if (this.userModal) this.userModal.style.display = 'block';
    }

    editUser(username, type) {
        this.openUserModal(username, type);
    }

    forceLogoutUser(username, type) {
        if (confirm(`¿Está seguro de que desea cerrar todas las sesiones de ${username}?`)) {
            const user = this.getUser(username);
            if (user && user.activeSessions) {
                user.activeSessions = user.activeSessions.map(session => ({
                    ...session,
                    active: false
                }));
                this.saveUserData(username);
                this.loadUsersList();
                alert('✅ Todas las sesiones han sido cerradas');
            }
        }
    }

    deleteUser(username, type, confirm = true) {
        if (confirm && !confirm(`¿Está seguro de que desea eliminar al usuario ${username}?`)) {
            return;
        }
        
        switch(type) {
            case 'global':
                delete this.globalExamUsers[username];
                this.saveGlobalUsers();
                // ✅ SINCRONIZAR CON LA NUBE (JSONBin.io O Firebase)
                this.saveUsersToCloud();
                break;
            case 'local':
                delete this.users[username];
                this.saveUsers();
                break;
            case 'admin':
                delete this.adminCredentials[username];
                this.saveAdminCredentials();
                break;
        }
        
        if (confirm) {
            this.loadUsersList();
            this.updateAdminStats();
            alert('✅ Usuario eliminado correctamente');
        }
    }

    // ========== MÉTODOS ADICIONALES ==========

    updateSpeechButtons(playing, paused, stopped) {
        if (this.speechPlayBtn) this.speechPlayBtn.disabled = playing || paused;
        if (this.speechPauseBtn) this.speechPauseBtn.disabled = !playing || paused;
        if (this.speechResumeBtn) this.speechResumeBtn.disabled = !paused;
        if (this.speechStopBtn) this.speechStopBtn.disabled = stopped;
    }

    startSpeech() {
        if (!this.speechEnabled) return;
        this.stopSpeech();
        this.readCurrentPageQuestions();
    }

    pauseSpeech() {
        if (this.speechSynth.speaking) {
            this.speechSynth.pause();
        }
    }

    resumeSpeech() {
        if (this.speechSynth.paused) {
            this.speechSynth.resume();
        }
    }

    stopSpeech() {
        if (this.speechSynth.speaking || this.speechSynth.paused) {
            this.speechSynth.cancel();
        }
    }

    readCurrentPageQuestions() {
        if (!this.speechEnabled) return;
        
        const startIndex = (this.currentPage - 1) * this.questionsPerPage;
        const endIndex = Math.min(startIndex + this.questionsPerPage, this.questions.length);
        
        let fullText = `Página ${this.currentPage}. `;
        
        for (let i = startIndex; i < endIndex; i++) {
            const question = this.questions[i];
            if (question) {
                fullText += `Pregunta ${question.pregunta}. ${question.enunciado}. ${question.conector}. `;
            }
        }
        
        this.currentUtterance = new SpeechSynthesisUtterance(fullText);
        this.currentUtterance.lang = 'es-ES';
        this.currentUtterance.rate = 0.9;
        this.currentUtterance.pitch = 1;
        
        this.currentUtterance.onend = () => {
            this.updateSpeechButtons(false, false, true);
        };
        
        this.speechSynth.speak(this.currentUtterance);
        this.updateSpeechButtons(true, false, false);
    }

    closeModals() {
        if (this.questionModal) this.questionModal.style.display = 'none';
        if (this.userModal) this.userModal.style.display = 'none';
        if (this.registrationModal) this.registrationModal.style.display = 'none';
        this.editingQuestionIndex = null;
        this.editingUser = null;
        this.editingUserType = null;
        if (this.questionForm) this.questionForm.reset();
        if (this.userForm) this.userForm.reset();
    }

    clearAllData() {
        if (confirm('¿Está seguro de que desea eliminar TODOS los datos del sistema? Esta acción no se puede deshacer.')) {
            localStorage.clear();
            location.reload();
        }
    }

    // ========== MÉTODOS DE GESTIÓN SIMPLIFICADOS ==========

    loadQuestionsList() {
        if (!this.questionsList) return;
        this.questionsList.innerHTML = '<p>Gestión de preguntas funcionando</p>';
    }

    loadResultsList() {
        if (!this.resultsList) return;
        this.resultsList.innerHTML = '<p>Gestión de resultados funcionando</p>';
    }

    openQuestionModal() {
        if (this.questionModal) this.questionModal.style.display = 'block';
    }

    exportQuestions() {
        alert('Exportando preguntas...');
    }

    // ========== ESTILOS CSS ADICIONALES ==========

    addGlobalStyles() {
        const styles = `
            .user-type-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
                color: white;
                margin-left: 8px;
            }
            
            .user-type-badge.global {
                background-color: #28a745;
            }
            
            .user-type-badge.local {
                background-color: #6c757d;
            }
            
            .user-type-badge.admin {
                background-color: #dc3545;
            }
            
            .user-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .active-sessions {
                margin-top: 10px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 5px;
                border-left: 4px solid #007bff;
            }
            
            .session-info {
                font-size: 12px;
                color: #666;
                margin: 5px 0;
                padding: 2px 0;
            }
            
            .radio-group label {
                display: block;
                margin: 8px 0;
                cursor: pointer;
            }
            
            .radio-group input[type="radio"] {
                margin-right: 8px;
            }
            
            .user-item {
                border-left: 4px solid #6c757d;
                padding-left: 15px;
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }
            
            .user-item.global {
                border-left-color: #28a745;
            }
            
            .user-item.admin {
                border-left-color: #dc3545;
            }
            
            .user-actions {
                margin-top: 10px;
            }
            
            .user-actions .btn {
                margin-right: 5px;
                margin-bottom: 5px;
            }

            #registration-modal .modal-content {
                max-width: 500px;
                margin: 50px auto;
            }

            #go-to-register {
                margin-top: 10px;
            }

            .cloud-sync-status {
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                margin-left: 10px;
            }
            
            .cloud-sync-online {
                background-color: #28a745;
                color: white;
            }
            
            .cloud-sync-offline {
                background-color: #dc3545;
                color: white;
            }

            /* Estilos para la pantalla de verificación de IP */
            .loading-spinner {
                text-align: center;
                margin: 20px 0;
            }
            
            .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 2s linear infinite;
                margin: 0 auto 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            #ip-status {
                font-weight: bold;
                margin-top: 10px;
            }

            /* Estilos para la nueva visualización de sesiones */
            .logs-section, .sessions-section {
                margin-bottom: 30px;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background-color: #f9f9f9;
            }
            
            .logs-section h3, .sessions-section h3 {
                color: #333;
                border-bottom: 2px solid #007bff;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            
            .log-item {
                background: white;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 5px;
                border-left: 4px solid #6c757d;
            }
            
            .log-item.allowed {
                border-left-color: #28a745;
            }
            
            .log-item.blocked {
                border-left-color: #dc3545;
            }
            
            .log-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .log-status {
                font-weight: bold;
                padding: 2px 8px;
                border-radius: 4px;
            }
            
            .log-details p {
                margin: 5px 0;
                font-size: 14px;
            }
            
            .ip-block-actions {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #eee;
            }
            
            .session-item {
                background: white;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 5px;
                border-left: 4px solid #007bff;
            }
            
            .loading {
                text-align: center;
                padding: 20px;
                color: #666;
            }
            
            .no-data {
                text-align: center;
                padding: 20px;
                color: #999;
                font-style: italic;
            }
            
            .error {
                color: #dc3545;
                text-align: center;
                padding: 20px;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// ✅ Esto SÍ va fuera de la clase - AL FINAL DEL ARCHIVO
window.ExamSystem = ExamSystem;

// Inicializar el sistema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM completamente cargado, iniciando sistema...');
    
    try {
        window.examSystem = new ExamSystem();
        
        console.log('💡 Comandos disponibles en consola:');
        console.log('   - examSystem.verifyIPAccess()');
        console.log('   - ipSecurity.getCurrentIP()');
        console.log('   - ipSecurity.isIPAllowed()');
        console.log('   - examSystem.blockIP("IP_A_BLOQUEAR")');
        console.log('   - examSystem.unblockIP("IP_A_PERMITIR")');
        console.log('   - examSystem.savePreferredCloudService("jsonbin")');
        console.log('   - examSystem.savePreferredCloudService("firebase")');
        
    } catch (error) {
        console.error('❌ Error crítico al inicializar el sistema:', error);
        alert('Error crítico al cargar el sistema. Recargue la página.');
    }
});