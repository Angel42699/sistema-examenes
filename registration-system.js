// registration-system.js - Sistema de registro optimizado para Firebase + JSONBin.io
class RegistrationSystem {
    constructor() {
        this.registrationForm = null;
        this.registrationModal = null;
        this.userManager = null;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando sistema de registro unificado...');
        await this.waitForUserManager();
        this.createRegistrationModal();
        this.setupEventListeners();
        console.log('✅ Sistema de registro listo');
    }

    async waitForUserManager() {
        // Esperar a que UserManager esté disponible
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        while (!window.userManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.userManager) {
            this.userManager = window.userManager;
            console.log('👥 UserManager conectado al sistema de registro');
        } else {
            console.warn('⚠️ UserManager no disponible, usando sistema alternativo');
        }
    }

    createRegistrationModal() {
        // Verificar si el modal ya existe en el HTML unificado
        if (document.getElementById('registration-modal')) {
            this.registrationModal = document.getElementById('registration-modal');
            this.registrationForm = document.getElementById('registration-form');
            console.log('✅ Modal de registro encontrado en HTML');
            return;
        }

        console.log('📝 Creando modal de registro dinámicamente...');
        
        // Crear el modal de registro si no existe
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
                                   placeholder="Ingrese su usuario" required minlength="3"
                                   pattern="[a-zA-Z0-9_]+" title="Solo letras, números y guiones bajos">
                            <small class="form-text text-muted">Solo letras, números y _ (mínimo 3 caracteres)</small>
                        </div>
                        <div class="form-group">
                            <label for="reg-password">Contraseña:</label>
                            <input type="password" id="reg-password" class="form-control" 
                                   placeholder="Ingrese su contraseña" required minlength="4">
                            <small class="form-text text-muted">Mínimo 4 caracteres</small>
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
                            <small class="form-text text-muted">Ej: usuario@ejemplo.com</small>
                        </div>
                        <div class="form-group">
                            <label><strong>🌐 Tipo de Usuario:</strong></label>
                            <div class="radio-group">
                                <label class="radio-option global-option">
                                    <input type="radio" name="reg-user-type" id="reg-global-user" value="global" checked>
                                    <div class="option-content">
                                        <strong>🌐 Usuario Global</strong>
                                        <small>Disponible en todos los dispositivos (sincronizado en la nube)</small>
                                    </div>
                                </label>
                                <label class="radio-option local-option">
                                    <input type="radio" name="reg-user-type" id="reg-local-user" value="local">
                                    <div class="option-content">
                                        <strong>💻 Usuario Local</strong>
                                        <small>Solo disponible en este dispositivo</small>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div class="registration-info">
                            <p>🔒 <strong>Seguridad:</strong> Sus datos están protegidos</p>
                            <p>📱 <strong>Acceso:</strong> Podrá iniciar sesión inmediatamente</p>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-success btn-lg">
                                📝 Crear Cuenta
                            </button>
                            <button type="button" id="cancel-registration" class="btn btn-secondary">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.registrationModal = modal;
        this.registrationForm = document.getElementById('registration-form');
        
        this.addRegistrationStyles();
        console.log('✅ Modal de registro creado dinámicamente');
    }

    addRegistrationStyles() {
        if (document.getElementById('registration-styles')) return;

        const styles = `
            .radio-option {
                display: block;
                margin: 10px 0;
                padding: 15px;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .radio-option:hover {
                border-color: #6c757d;
                background-color: #f8f9fa;
            }
            
            .radio-option input[type="radio"]:checked + .option-content {
                font-weight: bold;
            }
            
            .global-option input[type="radio"]:checked ~ .option-content {
                color: #28a745;
            }
            
            .local-option input[type="radio"]:checked ~ .option-content {
                color: #6c757d;
            }
            
            .option-content {
                margin-left: 10px;
            }
            
            .option-content strong {
                display: block;
                margin-bottom: 5px;
            }
            
            .option-content small {
                color: #666;
                font-weight: normal;
            }
            
            .registration-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #007bff;
            }
            
            .registration-info p {
                margin: 5px 0;
                font-size: 14px;
            }
            
            .form-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            
            .form-actions .btn {
                flex: 1;
            }
            
            #registration-modal .modal-content {
                animation: modalSlideIn 0.3s ease-out;
            }
            
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'registration-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        console.log('🔗 Configurando event listeners de registro...');
        
        if (this.registrationForm) {
            this.registrationForm.addEventListener('submit', (e) => this.handleRegistration(e));
        }

        // Validación en tiempo real
        this.setupRealTimeValidation();

        const cancelButton = document.getElementById('cancel-registration');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.closeRegistrationModal());
        }

        const closeButtons = this.registrationModal?.querySelectorAll('.close');
        if (closeButtons) {
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => this.closeRegistrationModal());
            });
        }

        this.registrationModal?.addEventListener('click', (e) => {
            if (e.target === this.registrationModal) {
                this.closeRegistrationModal();
            }
        });

        this.addRegisterButtonToLogin();
    }

    setupRealTimeValidation() {
        const usernameInput = document.getElementById('reg-username');
        const passwordInput = document.getElementById('reg-password');
        const confirmPasswordInput = document.getElementById('reg-confirm-password');
        const emailInput = document.getElementById('reg-email');

        if (usernameInput) {
            usernameInput.addEventListener('input', (e) => {
                this.validateUsername(e.target.value);
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', (e) => {
                this.validatePasswordMatch();
            });
        }

        if (emailInput) {
            emailInput.addEventListener('input', (e) => {
                this.validateEmail(e.target.value);
            });
        }
    }

    validateUsername(username) {
        const regex = /^[a-zA-Z0-9_]+$/;
        const isValid = regex.test(username) && username.length >= 3;
        
        if (username && !isValid) {
            this.showFieldError('reg-username', 'Solo letras, números y _ (mínimo 3 caracteres)');
        } else {
            this.clearFieldError('reg-username');
        }
        
        return isValid;
    }

    validatePasswordMatch() {
        const password = document.getElementById('reg-password')?.value;
        const confirmPassword = document.getElementById('reg-confirm-password')?.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.showFieldError('reg-confirm-password', 'Las contraseñas no coinciden');
            return false;
        } else {
            this.clearFieldError('reg-confirm-password');
            return true;
        }
    }

    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = regex.test(email);
        
        if (email && !isValid) {
            this.showFieldError('reg-email', 'Formato de email inválido');
        } else {
            this.clearFieldError('reg-email');
        }
        
        return isValid;
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Remover error anterior
        this.clearFieldError(fieldId);

        field.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        errorDiv.id = `${fieldId}-error`;
        
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.getElementById(`${fieldId}-error`);
        
        if (field) {
            field.classList.remove('is-invalid');
        }
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    addRegisterButtonToLogin() {
        const loginForm = document.getElementById('login-form');
        if (loginForm && !document.getElementById('go-to-register')) {
            const registerButton = document.createElement('button');
            registerButton.type = 'button';
            registerButton.id = 'go-to-register';
            registerButton.className = 'btn btn-outline-primary';
            registerButton.innerHTML = '📝 <strong>Crear Nueva Cuenta</strong>';
            registerButton.style.cssText = `
                margin-top: 15px; 
                width: 100%; 
                padding: 12px;
                font-size: 16px;
                border: 2px dashed #007bff;
            `;
            registerButton.addEventListener('click', () => this.showRegistrationModal());
            
            loginForm.appendChild(registerButton);
            console.log('✅ Botón de registro agregado al login');
        }
    }

    showRegistrationModal() {
        console.log('📝 Mostrando modal de registro...');
        if (this.registrationModal) {
            this.registrationModal.style.display = 'block';
            
            // Resetear formulario
            if (this.registrationForm) {
                this.registrationForm.reset();
                const globalRadio = document.getElementById('reg-global-user');
                if (globalRadio) globalRadio.checked = true;
                
                // Enfocar primer campo
                const firstInput = this.registrationForm.querySelector('input');
                if (firstInput) firstInput.focus();
            }
        }
    }

    closeRegistrationModal() {
        console.log('❌ Cerrando modal de registro...');
        if (this.registrationModal) {
            this.registrationModal.style.display = 'none';
            // Limpiar errores de validación
            this.clearAllFieldErrors();
        }
    }

    clearAllFieldErrors() {
        const fields = ['reg-username', 'reg-password', 'reg-confirm-password', 'reg-email', 'reg-name'];
        fields.forEach(fieldId => this.clearFieldError(fieldId));
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

        console.log('Datos del registro:', { username, userType, name, email });

        // Validaciones
        if (!this.validateUsername(username)) {
            alert('❌ El usuario debe contener solo letras, números y guiones bajos (mínimo 3 caracteres)');
            return;
        }

        if (password !== confirmPassword) {
            alert('❌ Las contraseñas no coinciden');
            return;
        }

        if (!this.validateEmail(email)) {
            alert('❌ Por favor ingrese un email válido');
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

            let success = false;

            // Usar UserManager preferentemente
            if (this.userManager) {
                console.log('👤 Usando UserManager para crear usuario...');
                await this.userManager.createUser(userData, userType === 'global');
                success = true;
            } 
            // Fallback a ExamSystem
            else if (window.examSystem && window.examSystem.createNewUser) {
                console.log('👤 Usando ExamSystem para crear usuario...');
                await window.examSystem.createNewUser(userData, userType === 'global');
                success = true;
            } 
            // Fallback a usersManager global
            else if (window.usersManager) {
                console.log('👤 Usando usersManager global para crear usuario...');
                window.usersManager.createUser(userData);
                success = true;
            } 
            else {
                throw new Error('Sistema de usuarios no disponible');
            }

            if (success) {
                this.showSuccessMessage();
                this.closeRegistrationModal();

                // Redirigir al login después de un momento
                setTimeout(() => {
                    if (window.examSystem) {
                        window.examSystem.showScreen('login-screen');
                    }
                }, 2000);
            }

        } catch (error) {
            console.error('❌ Error en el registro:', error);
            this.showErrorMessage(error.message);
        }
    }

    showSuccessMessage() {
        // Crear mensaje de éxito temporal
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        successDiv.innerHTML = `
            <h4>✅ ¡Registro Exitoso!</h4>
            <p>Ahora puede iniciar sesión con sus credenciales.</p>
            <p><small>Redirigiendo al login...</small></p>
        `;

        document.body.appendChild(successDiv);

        // Remover después de 3 segundos
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    showErrorMessage(message) {
        alert(`❌ Error en el registro: ${message}`);
    }

    // Métodos públicos
    show() {
        this.addRegisterButtonToLogin();
    }

    hide() {
        const registerButton = document.getElementById('go-to-register');
        if (registerButton) {
            registerButton.style.display = 'none';
        }
    }

    isActive() {
        return !!this.registrationModal && !!this.registrationForm;
    }
}

// Inicialización mejorada
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM cargado, inicializando sistema de registro unificado...');
    
    try {
        window.registrationSystem = new RegistrationSystem();
        
        // Verificar estado después de la inicialización
        setTimeout(() => {
            if (window.registrationSystem.isActive()) {
                console.log('🎉 Sistema de registro completamente inicializado');
            } else {
                console.warn('⚠️ Sistema de registro tuvo problemas al inicializar');
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error crítico inicializando sistema de registro:', error);
    }
});

// Funciones globales
window.showRegistration = function() {
    if (window.registrationSystem) {
        window.registrationSystem.showRegistrationModal();
    }
};

window.isRegistrationSystemActive = function() {
    return window.registrationSystem ? window.registrationSystem.isActive() : false;
};

// Compatibilidad con sistemas existentes
window.RegistrationSystem = RegistrationSystem;