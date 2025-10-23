// user-manager.js - Sistema unificado de gestión de usuarios (SOLO UserManager)
class UserManager {
    constructor() {
        this.users = {};
        this.globalUsers = {};
        this.adminUsers = {};
        this.syncEnabled = true;
        this.init();
    }

    async init() {
        await this.loadAllUsers();
        console.log('👥 UserManager inicializado');
    }

    async loadAllUsers() {
        try {
            // Cargar usuarios locales
            this.loadLocalUsers();
            
            // Cargar usuarios globales desde JSONBin.io
            await this.loadGlobalUsers();
            
            // Cargar usuarios administradores
            this.loadAdminUsers();
            
            console.log('✅ Usuarios cargados:', {
                locales: Object.keys(this.users).length,
                globales: Object.keys(this.globalUsers).length,
                administradores: Object.keys(this.adminUsers).length
            });
            
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
        }
    }

    loadLocalUsers() {
        try {
            const savedUsers = localStorage.getItem('examUsers');
            this.users = savedUsers ? JSON.parse(savedUsers) : {};
        } catch (error) {
            console.error('Error cargando usuarios locales:', error);
            this.users = {};
        }
    }

    async loadGlobalUsers() {
        try {
            if (window.cloudSync) {
                const cloudData = await window.cloudSync.loadUsersFromCloud();
                if (cloudData && cloudData.globalUsers) {
                    this.globalUsers = cloudData.globalUsers;
                }
            }
        } catch (error) {
            console.error('Error cargando usuarios globales:', error);
            this.loadGlobalUsersFromLocal();
        }
    }

    loadGlobalUsersFromLocal() {
        try {
            const savedGlobalUsers = localStorage.getItem('globalExamUsers');
            this.globalUsers = savedGlobalUsers ? JSON.parse(savedGlobalUsers) : {};
        } catch (error) {
            console.error('Error cargando usuarios globales locales:', error);
            this.globalUsers = {};
        }
    }

    loadAdminUsers() {
        try {
            const savedAdmin = localStorage.getItem('adminCredentials');
            this.adminUsers = savedAdmin ? JSON.parse(savedAdmin) : {
                'admin': { 
                    password: 'Admin1234!', 
                    role: 'admin', 
                    name: 'Administrador',
                    email: 'admin@sistema.com'
                }
            };
        } catch (error) {
            console.error('Error cargando usuarios admin:', error);
            this.adminUsers = {};
        }
    }

    // ========== GESTIÓN DE USUARIOS ==========

    async createUser(userData, isGlobal = false) {
        const { username, password, name, email, role = 'user' } = userData;
        
        // Validaciones
        if (!this.validateUserData(userData)) {
            throw new Error('Datos de usuario no válidos');
        }

        if (this.userExists(username)) {
            throw new Error('El usuario ya existe');
        }

        const newUser = {
            password: password,
            role: role,
            name: name,
            email: email,
            isGlobal: isGlobal,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            activeSessions: [],
            status: 'active'
        };

        if (isGlobal) {
            this.globalUsers[username] = newUser;
            await this.saveGlobalUsers();
            
            // Sincronizar con JSONBin.io
            if (this.syncEnabled && window.cloudSync) {
                await window.cloudSync.saveUsersToCloud({
                    globalUsers: this.globalUsers,
                    lastSync: new Date().toISOString(),
                    totalUsers: Object.keys(this.globalUsers).length
                });
            }
            
            console.log('🌐 Nuevo usuario GLOBAL creado:', username);
        } else {
            this.users[username] = newUser;
            this.saveLocalUsers();
            console.log('💻 Nuevo usuario LOCAL creado:', username);
        }

        return newUser;
    }

    validateUserData(userData) {
        const { username, password, name, email } = userData;
        
        if (!username || username.length < 3) {
            throw new Error('El usuario debe tener al menos 3 caracteres');
        }
        
        if (!password || password.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }
        
        if (!name || name.trim().length === 0) {
            throw new Error('El nombre es obligatorio');
        }
        
        if (!email || !this.isValidEmail(email)) {
            throw new Error('El email no es válido');
        }
        
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    userExists(username) {
        return this.getUser(username) !== null;
    }

    getUser(username) {
        // Buscar en todos los tipos de usuarios
        if (this.globalUsers[username]) {
            return { ...this.globalUsers[username], source: 'global' };
        }
        if (this.users[username]) {
            return { ...this.users[username], source: 'local' };
        }
        if (this.adminUsers[username]) {
            return { ...this.adminUsers[username], source: 'admin' };
        }
        return null;
    }

    async updateUser(oldUsername, userData) {
        const user = this.getUser(oldUsername);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const { username, password, name, email, role, userType } = userData;
        
        // Eliminar usuario antiguo
        this.deleteUser(oldUsername, user.source, false);
        
        // Crear usuario actualizado
        const updatedUser = {
            password: password || user.password,
            role: role || user.role,
            name: name || user.name,
            email: email || user.email,
            isGlobal: userType === 'global' || user.isGlobal,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            activeSessions: user.activeSessions || [],
            status: user.status || 'active'
        };

        const finalUsername = username || oldUsername;

        if (updatedUser.isGlobal) {
            this.globalUsers[finalUsername] = updatedUser;
            await this.saveGlobalUsers();
            
            // Sincronizar con JSONBin.io
            if (this.syncEnabled && window.cloudSync) {
                await window.cloudSync.saveUsersToCloud({
                    globalUsers: this.globalUsers,
                    lastSync: new Date().toISOString(),
                    totalUsers: Object.keys(this.globalUsers).length
                });
            }
        } else {
            this.users[finalUsername] = updatedUser;
            this.saveLocalUsers();
        }

        console.log('✏️ Usuario actualizado:', finalUsername);
        return updatedUser;
    }

    deleteUser(username, userType, confirm = true) {
        if (confirm && !confirm(`¿Está seguro de que desea eliminar al usuario ${username}?`)) {
            return false;
        }

        let deleted = false;
        
        switch(userType) {
            case 'global':
                if (this.globalUsers[username]) {
                    delete this.globalUsers[username];
                    this.saveGlobalUsers();
                    
                    // Sincronizar con JSONBin.io
                    if (this.syncEnabled && window.cloudSync) {
                        window.cloudSync.saveUsersToCloud({
                            globalUsers: this.globalUsers,
                            lastSync: new Date().toISOString(),
                            totalUsers: Object.keys(this.globalUsers).length
                        });
                    }
                    
                    deleted = true;
                }
                break;
                
            case 'local':
                if (this.users[username]) {
                    delete this.users[username];
                    this.saveLocalUsers();
                    deleted = true;
                }
                break;
                
            case 'admin':
                if (username !== 'admin' && this.adminUsers[username]) {
                    delete this.adminUsers[username];
                    this.saveAdminUsers();
                    deleted = true;
                }
                break;
        }

        if (deleted) {
            console.log('🗑️ Usuario eliminado:', username);
        }
        
        return deleted;
    }

    // ========== SESIONES DE USUARIO ==========

    registerUserSession(username, sessionData) {
        const user = this.getUser(username);
        if (!user) return;

        if (!user.activeSessions) {
            user.activeSessions = [];
        }

        user.activeSessions.push({
            ...sessionData,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            active: true
        });

        // Limitar a 10 sesiones máximo
        if (user.activeSessions.length > 10) {
            user.activeSessions = user.activeSessions.slice(-10);
        }

        user.lastLogin = new Date().toISOString();
        this.saveUserData(username);
    }

    updateUserActivity(username) {
        const user = this.getUser(username);
        if (!user || !user.activeSessions) return;

        const currentSession = user.activeSessions.find(
            session => session.deviceFingerprint === this.getDeviceFingerprint()
        );

        if (currentSession) {
            currentSession.lastActivity = new Date().toISOString();
            this.saveUserData(username);
        }
    }

    closeUserSessions(username) {
        const user = this.getUser(username);
        if (!user || !user.activeSessions) return;

        user.activeSessions = user.activeSessions.map(session => ({
            ...session,
            active: false
        }));

        this.saveUserData(username);
        console.log('🚪 Todas las sesiones cerradas para:', username);
    }

    getDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.platform,
            navigator.language,
            screen.width + 'x' + screen.height
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

    // ========== PERSISTENCIA ==========

    saveUserData(username) {
        const user = this.getUser(username);
        if (!user) return;

        switch (user.source) {
            case 'global':
                this.globalUsers[username] = user;
                this.saveGlobalUsers();
                break;
            case 'local':
                this.users[username] = user;
                this.saveLocalUsers();
                break;
            case 'admin':
                this.adminUsers[username] = user;
                this.saveAdminUsers();
                break;
        }
    }

    saveLocalUsers() {
        try {
            localStorage.setItem('examUsers', JSON.stringify(this.users));
        } catch (error) {
            console.error('Error guardando usuarios locales:', error);
        }
    }

    saveGlobalUsers() {
        try {
            localStorage.setItem('globalExamUsers', JSON.stringify(this.globalUsers));
        } catch (error) {
            console.error('Error guardando usuarios globales:', error);
        }
    }

    saveAdminUsers() {
        try {
            localStorage.setItem('adminCredentials', JSON.stringify(this.adminUsers));
        } catch (error) {
            console.error('Error guardando usuarios admin:', error);
        }
    }

    // ========== ESTADÍSTICAS E INFORMES ==========

    getUserStats() {
        const allUsers = this.getAllUsers();
        
        return {
            total: allUsers.length,
            global: Object.keys(this.globalUsers).length,
            local: Object.keys(this.users).length,
            admin: Object.keys(this.adminUsers).length,
            activeSessions: this.getActiveSessionsCount(),
            recentlyActive: this.getRecentlyActiveUsers(7) // últimos 7 días
        };
    }

    getAllUsers() {
        return [
            ...Object.entries(this.globalUsers).map(([username, data]) => ({
                username,
                ...data,
                type: 'global'
            })),
            ...Object.entries(this.users).map(([username, data]) => ({
                username,
                ...data,
                type: 'local'
            })),
            ...Object.entries(this.adminUsers).map(([username, data]) => ({
                username,
                ...data,
                type: 'admin'
            }))
        ];
    }

    getActiveSessionsCount() {
        let count = 0;
        const allUsers = this.getAllUsers();
        
        allUsers.forEach(user => {
            if (user.activeSessions) {
                count += user.activeSessions.filter(session => session.active).length;
            }
        });
        
        return count;
    }

    getRecentlyActiveUsers(days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const allUsers = this.getAllUsers();
        return allUsers.filter(user => {
            if (!user.lastLogin) return false;
            return new Date(user.lastLogin) >= cutoffDate;
        });
    }

    // ========== EXPORTACIÓN E IMPORTACIÓN ==========

    exportUsers() {
        const exportData = {
            globalUsers: this.globalUsers,
            localUsers: this.users,
            adminUsers: this.adminUsers,
            exportDate: new Date().toISOString(),
            totalUsers: this.getAllUsers().length
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `usuarios-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('📤 Usuarios exportados');
    }

    async importUsers(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // Validar estructura
                    if (!importData.globalUsers || !importData.localUsers || !importData.adminUsers) {
                        throw new Error('Formato de archivo inválido');
                    }

                    // Fusionar usuarios (los existentes tienen prioridad)
                    this.globalUsers = { ...importData.globalUsers, ...this.globalUsers };
                    this.users = { ...importData.localUsers, ...this.users };
                    this.adminUsers = { ...importData.adminUsers, ...this.adminUsers };

                    // Guardar todos
                    this.saveLocalUsers();
                    this.saveGlobalUsers();
                    this.saveAdminUsers();

                    console.log('📥 Usuarios importados exitosamente');
                    resolve(true);
                    
                } catch (error) {
                    reject(new Error('Error importando usuarios: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsText(file);
        });
    }
}

// ========== INICIALIZACIÓN SIMPLIFICADA ==========
// SOLO UserManager - RegistrationSystem está en su propio archivo

document.addEventListener('DOMContentLoaded', async () => {
    window.userManager = new UserManager();
    console.log('👥 UserManager inicializado');
});

// Hacer disponible globalmente
window.UserManager = UserManager;