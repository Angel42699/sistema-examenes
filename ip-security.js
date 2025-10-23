// ip-security.js - Versión MEJORADA con control de accesslogs por usuario
class IPSecurity {
    constructor() {
        this.allowedIPs = [];
        this.blockedIPs = [];
        this.currentIP = null;
        this.init();
    }

    async init() {
        await this.loadIPRules();
        console.log('🛡️ Sistema de seguridad de IP inicializado');
    }

    // ✅ NUEVO MÉTODO: Verificar accesslog existente para usuario
    async checkExistingAccessLog(username, ip) {
        try {
            const accessLogsRef = firebase.database().ref('accessLogs');
            const snapshot = await accessLogsRef
                .orderByChild('username')
                .equalTo(username)
                .once('value');
            
            if (snapshot.exists()) {
                const logs = snapshot.val();
                // Buscar si ya existe un log para este usuario con la misma IP
                for (const logId in logs) {
                    const log = logs[logId];
                    if (log.ip === ip && log.username === username) {
                        return logId; // Retorna el ID del log existente
                    }
                }
            }
            return null; // No existe log para este usuario con esta IP
        } catch (error) {
            console.error('Error verificando accesslogs existentes:', error);
            return null;
        }
    }

    // ✅ NUEVO MÉTODO: Actualizar accesslog existente
    async updateExistingAccessLog(logId, reason = 'Reconexión desde misma IP') {
        try {
            const updates = {
                timestamp: new Date().toISOString(),
                reason: reason,
                reconnections: firebase.database.ServerValue.increment(1),
                lastActivity: new Date().toISOString()
            };
            
            await firebase.database().ref(`accessLogs/${logId}`).update(updates);
            console.log(`✅ AccessLog actualizado: ${logId}`);
            return true;
        } catch (error) {
            console.error('Error actualizando accesslog:', error);
            return false;
        }
    }

    // ✅ MÉTODO MODIFICADO: logAccess ahora con control de usuario
    async logAccess(ip, allowed, reason, username = null) {
        try {
            // Si hay usuario, verificar si ya existe un accesslog para esta combinación usuario-IP
            if (username && ip) {
                const existingLogId = await this.checkExistingAccessLog(username, ip);
                
                if (existingLogId) {
                    // ✅ ACTUALIZAR LOG EXISTENTE (mismo usuario, misma IP)
                    await this.updateExistingAccessLog(existingLogId, reason);
                    console.log('📝 AccessLog existente actualizado:', { username, ip, reason });
                    return existingLogId;
                }
            }

            // ✅ CREAR NUEVO LOG (nuevo usuario o nueva IP)
            const logData = {
                ip: ip,
                timestamp: new Date().toISOString(),
                allowed: allowed,
                reason: reason,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                url: window.location.href,
                username: username, // ✅ NUEVO: Registrar qué usuario inició sesión
                deviceInfo: this.getDeviceInfo(),
                firstConnection: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                reconnections: 1
            };

            // Guardar en Firebase
            const logRef = firebase.database().ref('accessLogs').push();
            await logRef.set(logData);

            // También guardar localmente
            this.saveAccessLogLocal(logData);
            
            console.log('📝 NUEVO AccessLog creado:', { 
                username, 
                ip, 
                allowed, 
                reason,
                type: username ? 'Con usuario' : 'Sin usuario'
            });
            
            return logRef.key;
            
        } catch (error) {
            console.error('❌ Error registrando acceso:', error);
            return null;
        }
    }

    // ✅ NUEVO MÉTODO: Obtener información del dispositivo
    getDeviceInfo() {
        return {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            deviceType: this.getDeviceType(),
            browser: this.getBrowserInfo(),
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    // ✅ NUEVO MÉTODO: Determinar tipo de dispositivo
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

    // ✅ NUEVO MÉTODO: Identificar navegador
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Otro';
    }

    // ✅ MÉTODO MODIFICADO: isIPAllowed ahora puede recibir username
    async isIPAllowed(ip = null, username = null) {
        try {
            const currentIP = ip || await this.getCurrentIP();
            
            if (!currentIP || currentIP === '127.0.0.1') {
                console.warn('⚠️ IP no válida o local, permitiendo acceso');
                await this.logAccess(currentIP || 'unknown', true, 'IP local o desconocida', username);
                return true;
            }

            console.log(`🔍 Verificando IP: ${currentIP}${username ? ` para usuario: ${username}` : ''}`);

            // 1. Verificar si está bloqueada explícitamente
            if (this.blockedIPs.includes(currentIP)) {
                console.log(`🚫 IP bloqueada: ${currentIP}`);
                await this.logAccess(currentIP, false, 'IP bloqueada explícitamente', username);
                return false;
            }

            // 2. Si hay IPs permitidas específicas, verificar membresía
            if (this.allowedIPs.length > 0 && !this.allowedIPs.includes(currentIP)) {
                console.log(`❌ IP no permitida: ${currentIP}`);
                await this.logAccess(currentIP, false, 'IP no está en lista de permitidas', username);
                return false;
            }

            // 3. Acceso permitido
            console.log(`✅ IP autorizada: ${currentIP}`);
            await this.logAccess(currentIP, true, 'Acceso permitido', username);
            return true;

        } catch (error) {
            console.error('❌ Error en verificación de IP:', error);
            // En caso de error, permitir acceso (modo seguro)
            await this.logAccess('error', true, 'Error en verificación - Acceso permitido', username);
            return true;
        }
    }

    // ✅ NUEVO MÉTODO: Obtener accesslogs por usuario
    async getUserAccessLogs(username) {
        try {
            const accessLogsRef = firebase.database().ref('accessLogs');
            const snapshot = await accessLogsRef
                .orderByChild('username')
                .equalTo(username)
                .once('value');
            
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return {};
        } catch (error) {
            console.error('Error obteniendo accesslogs del usuario:', error);
            return {};
        }
    }

    // ✅ NUEVO MÉTODO: Verificar si usuario se conecta desde nueva IP
    async isNewIPForUser(username, ip) {
        try {
            const userLogs = await this.getUserAccessLogs(username);
            const logEntries = Object.values(userLogs);
            
            // Verificar si el usuario ya se conectó desde esta IP
            const existingLog = logEntries.find(log => log.ip === ip);
            
            if (existingLog) {
                console.log(`📱 Usuario ${username} reconectando desde IP conocida: ${ip}`);
                return false; // No es nueva IP
            } else {
                console.log(`🆕 Usuario ${username} conectándose desde NUEVA IP: ${ip}`);
                return true; // Es nueva IP
            }
        } catch (error) {
            console.error('Error verificando IPs del usuario:', error);
            return true; // Por seguridad, asumir que es nueva
        }
    }

    // ✅ NUEVO MÉTODO: Log de login de usuario (para usar en app.js)
    async logUserLogin(username, ip) {
        try {
            const isNewIP = await this.isNewIPForUser(username, ip);
            
            if (isNewIP) {
                // ✅ NUEVA IP - Crear nuevo accesslog
                return await this.logAccess(ip, true, `Login desde nueva IP/dispositivo`, username);
            } else {
                // ✅ MISMA IP - Actualizar accesslog existente
                const existingLogId = await this.checkExistingAccessLog(username, ip);
                if (existingLogId) {
                    await this.updateExistingAccessLog(existingLogId, `Nuevo login desde IP conocida`);
                    return existingLogId;
                } else {
                    // Fallback: crear nuevo log si no se encuentra el existente
                    return await this.logAccess(ip, true, `Login de usuario`, username);
                }
            }
        } catch (error) {
            console.error('Error en logUserLogin:', error);
            return await this.logAccess(ip, true, `Login de usuario (con error)`, username);
        }
    }

    // Los demás métodos permanecen igual...
    async loadIPRules() {
        try {
            console.log('📡 Cargando reglas de IP desde Firebase...');
            const snapshot = await firebase.database().ref('ipRules').once('value');
            const rules = snapshot.val();
            
            if (rules) {
                this.allowedIPs = rules.allowedIPs || [];
                this.blockedIPs = rules.blockedIPs || [];
                console.log('✅ Reglas de IP cargadas:', { 
                    allowed: this.allowedIPs.length, 
                    blocked: this.blockedIPs.length 
                });
            } else {
                console.log('⚠️ No hay reglas de IP configuradas, creando estructura inicial...');
                await this.saveIPRules();
            }
        } catch (error) {
            console.error('❌ Error cargando reglas de IP:', error);
            this.loadLocalIPRules();
        }
    }

    loadLocalIPRules() {
        try {
            const saved = localStorage.getItem('ipSecurityRules');
            if (saved) {
                const rules = JSON.parse(saved);
                this.allowedIPs = rules.allowedIPs || [];
                this.blockedIPs = rules.blockedIPs || [];
                console.log('📱 Reglas de IP cargadas desde almacenamiento local');
            }
        } catch (error) {
            console.error('Error cargando reglas locales:', error);
        }
    }

    saveLocalIPRules() {
        try {
            const rules = {
                allowedIPs: this.allowedIPs,
                blockedIPs: this.blockedIPs,
                lastUpdate: new Date().toISOString()
            };
            localStorage.setItem('ipSecurityRules', JSON.stringify(rules));
        } catch (error) {
            console.error('Error guardando reglas locales:', error);
        }
    }

    async getCurrentIP() {
        try {
            console.log('🌐 Obteniendo IP actual...');
            
            const services = [
                'https://api.ipify.org?format=json',
                'https://api64.ipify.org?format=json',
                'https://ipinfo.io/json'
            ];
            
            let ip = null;
            for (const service of services) {
                try {
                    const response = await fetch(service, { timeout: 5000 });
                    if (response.ok) {
                        const data = await response.json();
                        ip = data.ip || data.ip_address;
                        if (ip) break;
                    }
                } catch (e) {
                    console.log(`⚠️ Servicio ${service} falló, intentando siguiente...`);
                }
            }
            
            if (!ip) {
                throw new Error('No se pudo obtener la IP de ningún servicio');
            }
            
            this.currentIP = ip;
            console.log('📡 IP detectada:', this.currentIP);
            return this.currentIP;
            
        } catch (error) {
            console.error('❌ Error obteniendo IP:', error);
            this.currentIP = '127.0.0.1';
            return this.currentIP;
        }
    }

    async allowIP(ip, reason = 'Agregada manualmente por administrador') {
        if (!this.isValidIP(ip)) {
            throw new Error('Dirección IP no válida');
        }

        this.blockedIPs = this.blockedIPs.filter(blockedIP => blockedIP !== ip);
        
        if (!this.allowedIPs.includes(ip)) {
            this.allowedIPs.push(ip);
        }

        await this.saveIPRules();
        await this.logAccess(ip, true, reason);
        
        console.log('✅ IP permitida:', ip);
        return true;
    }

    async blockIP(ip, reason = 'Bloqueada manualmente por administrador') {
        if (!this.isValidIP(ip)) {
            throw new Error('Dirección IP no válida');
        }

        this.allowedIPs = this.allowedIPs.filter(allowedIP => allowedIP !== ip);
        
        if (!this.blockedIPs.includes(ip)) {
            this.blockedIPs.push(ip);
        }

        await this.saveIPRules();
        await this.logAccess(ip, false, reason);
        
        console.log('🚫 IP bloqueada:', ip);
        return true;
    }

    async removeAllowedIP(ip) {
        this.allowedIPs = this.allowedIPs.filter(allowedIP => allowedIP !== ip);
        await this.saveIPRules();
        console.log('🗑️ IP removida de permitidas:', ip);
        return true;
    }

    async removeBlockedIP(ip) {
        this.blockedIPs = this.blockedIPs.filter(blockedIP => blockedIP !== ip);
        await this.saveIPRules();
        console.log('🗑️ IP removida de bloqueadas:', ip);
        return true;
    }

    async saveIPRules() {
        try {
            const rulesData = {
                allowedIPs: this.allowedIPs,
                blockedIPs: this.blockedIPs,
                lastUpdate: new Date().toISOString(),
                totalAllowed: this.allowedIPs.length,
                totalBlocked: this.blockedIPs.length
            };

            await firebase.database().ref('ipRules').set(rulesData);
            this.saveLocalIPRules();
            
            console.log('💾 Reglas de IP guardadas en Firebase y localmente');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando reglas de IP:', error);
            this.saveLocalIPRules();
            return false;
        }
    }

    saveAccessLogLocal(logData) {
        try {
            let logs = JSON.parse(localStorage.getItem('ipAccessLogs') || '[]');
            logs.unshift(logData);
            if (logs.length > 100) {
                logs = logs.slice(0, 100);
            }
            localStorage.setItem('ipAccessLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Error guardando log local:', error);
        }
    }

    isValidIP(ip) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip)) return false;
        
        const parts = ip.split('.');
        return parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    }

    getAllowedIPs() {
        return [...this.allowedIPs];
    }

    getBlockedIPs() {
        return [...this.blockedIPs];
    }

    getCurrentIPValue() {
        return this.currentIP;
    }

    getIPStatus(ip) {
        if (this.blockedIPs.includes(ip)) {
            return 'blocked';
        } else if (this.allowedIPs.includes(ip)) {
            return 'allowed';
        } else if (this.allowedIPs.length === 0) {
            return 'allowed';
        } else {
            return 'not_allowed';
        }
    }

    getStats() {
        return {
            totalAllowed: this.allowedIPs.length,
            totalBlocked: this.blockedIPs.length,
            currentIP: this.currentIP,
            currentStatus: this.getIPStatus(this.currentIP)
        };
    }

    async cleanupOldLogs(days = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const snapshot = await firebase.database().ref('accessLogs').once('value');
            const logs = snapshot.val();
            
            if (logs) {
                const updates = {};
                Object.keys(logs).forEach(key => {
                    const logDate = new Date(logs[key].timestamp);
                    if (logDate < cutoffDate) {
                        updates[key] = null;
                    }
                });
                
                await firebase.database().ref('accessLogs').update(updates);
                console.log(`🧹 Limpieza de logs antiguos completada (${Object.keys(updates).length} eliminados)`);
            }
        } catch (error) {
            console.error('Error en limpieza de logs:', error);
        }
    }
}

// Hacer disponible globalmente
window.IPSecurity = IPSecurity;
console.log('🛡️ IPSecurity MEJORADO cargado y listo');