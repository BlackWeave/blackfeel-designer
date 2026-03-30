// --- Configuration ---
const API_BASE = '/api';

const CURATED_INSPIRATION = [
    {
        prompt: "Minimalist sleepy cat next to coffee, warm tones",
        url: "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=400"
    },
    {
        prompt: "Retro synthwave sunset grid, neon pink & blue",
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"
    },
    {
        prompt: "Botanical monstera with gold geometry",
        url: "https://images.unsplash.com/photo-1545241047-6083a36a4d00?w=400"
    },
    {
        prompt: "Vintage mountain poster twilight pastel",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400"
    }
];

// --- T-shirt image maps ---
const TSHIRT_FRONT_MAP = {
    '#1a1a1a': 'assets/black-tshirt.png',
    '#f5f5f5': 'assets/white-tshirt.png',
    '#1e3a8a': 'assets/blue-tshirt.png',
    '#7f1d1d': 'assets/red-tshirt.png'
};

const TSHIRT_BACK_MAP = {
    '#1a1a1a': 'assets/black-tshirt-back.png',
    '#f5f5f5': 'assets/white-tshirt-back.png',
    '#1e3a8a': 'assets/blue-tshirt-back.png',
    '#7f1d1d': 'assets/red-tshirt-back.png'
};

// Reverse map: src -> color (for color buttons)
const COLOR_FROM_FRONT_SRC = {
    'assets/black-tshirt.png': '#1a1a1a',
    'assets/white-tshirt.png': '#f5f5f5',
    'assets/blue-tshirt.png': '#1e3a8a',
    'assets/red-tshirt.png': '#7f1d1d'
};

// --- State Management ---
const state = {
    token: localStorage.getItem('luxe_token'),
    user: null,
    generationsLeft: 5,
    currentSide: 'front',       // 'front' | 'back'
    frontDesign: null,           // { id, url, prompt, x, y, scale }
    backDesign: null,            // { id, url, prompt, x, y, scale }
    currentTshirtColor: '#f5f5f5',
    history: []
};

// --- DOM Elements ---
const DOM = {
    // Auth
    authModal: document.getElementById('auth-modal'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginBtn: document.getElementById('login-btn'),
    registerName: document.getElementById('register-name'),
    registerEmail: document.getElementById('register-email'),
    registerPassword: document.getElementById('register-password'),
    registerBtn: document.getElementById('register-btn'),
    showRegisterBtn: document.getElementById('show-register-btn'),
    showLoginBtn: document.getElementById('show-login-btn'),
    authError: document.getElementById('auth-error'),
    logoutBtn: document.getElementById('logout-btn'),
    myOrdersBtn: document.getElementById('my-orders-btn'),

    // Main UI
    tshirtImg: document.getElementById('tshirt-base-img'),
    colorBtns: document.querySelectorAll('.color-btn'),
    promptInput: document.getElementById('prompt-input'),
    generateBtn: document.getElementById('generate-btn'),
    btnLoader: document.getElementById('btn-loader'),
    rateLimitDisplay: document.getElementById('rate-limit-display'),
    designWrapper: document.getElementById('generated-image-container'),
    generatedImage: document.getElementById('generated-image'),
    resizeHandle: document.getElementById('resize-handle'),
    removeDesignBtn: document.getElementById('remove-design-btn'),
    buyNowBtn: document.getElementById('buy-now-btn'),

    // Side Toggle
    toggleFront: document.getElementById('toggle-front'),
    toggleBack: document.getElementById('toggle-back'),

    // Archives Modal
    archivesBtn: document.getElementById('archives-btn'),
    archivesModal: document.getElementById('archives-modal'),
    closeArchivesBtn: document.getElementById('close-archives-btn'),
    archivesGrid: document.getElementById('archives-grid'),
    emptyArchives: document.getElementById('empty-archives'),

    // Orders Modal
    ordersModal: document.getElementById('orders-modal'),
    closeOrdersBtn: document.getElementById('close-orders-btn'),
    ordersList: document.getElementById('orders-list'),
    emptyOrders: document.getElementById('empty-orders'),
    shopNowBtn: document.getElementById('shop-now-btn'),

    // Inspiration Gallery
    inspirationBtn: document.getElementById('inspiration-btn'),
    inspirationModal: document.getElementById('inspiration-modal'),
    closeInspirationBtn: document.getElementById('close-inspiration-btn'),
    inspirationPrevBtn: document.getElementById('inspiration-prev-btn'),
    inspirationNextBtn: document.getElementById('inspiration-next-btn'),
    inspirationMainImage: document.getElementById('inspiration-main-image'),
    inspirationQuote: document.getElementById('inspiration-quote'),
    usePromptBtn: document.getElementById('use-prompt-btn'),
    inspirationPagination: document.getElementById('inspiration-pagination')
};

// --- Helper: get current design for active side ---
function getCurrentDesign() {
    return state.currentSide === 'front' ? state.frontDesign : state.backDesign;
}

function setCurrentDesign(design) {
    if (state.currentSide === 'front') {
        state.frontDesign = design;
    } else {
        state.backDesign = design;
    }
}

function hasAnyDesign() {
    return state.frontDesign !== null || state.backDesign !== null;
}

// --- Get t-shirt image src for current side and color ---
function getTshirtSrc(color, side) {
    const map = side === 'back' ? TSHIRT_BACK_MAP : TSHIRT_FRONT_MAP;
    return map[color] || (side === 'back' ? 'assets/white-tshirt-back.png' : 'assets/white-tshirt.png');
}

// --- Initialization ---
async function init() {
    // Ensure BUY NOW button is hidden initially
    if (DOM.buyNowBtn) {
        DOM.buyNowBtn.classList.add('hidden');
    }

    setupEventListeners();
    initInteractJS();

    if (state.token) {
        await checkAuth();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Auth buttons
    DOM.loginBtn.addEventListener('click', handleLogin);
    DOM.registerBtn.addEventListener('click', handleRegister);

    DOM.showRegisterBtn.addEventListener('click', () => {
        DOM.loginForm.classList.add('hidden');
        DOM.registerForm.classList.remove('hidden');
        DOM.authError.classList.add('hidden');
        const regError = document.getElementById('auth-error-register');
        if (regError) regError.classList.add('hidden');
    });

    DOM.showLoginBtn.addEventListener('click', () => {
        DOM.registerForm.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
        DOM.authError.classList.add('hidden');
        const regError = document.getElementById('auth-error-register');
        if (regError) regError.classList.add('hidden');
    });

    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.myOrdersBtn.addEventListener('click', handleMyOrders);

    // Archives Modal
    DOM.archivesBtn.addEventListener('click', () => {
        DOM.archivesModal.classList.remove('hidden');
        renderHistory();
    });

    DOM.closeArchivesBtn.addEventListener('click', () => {
        DOM.archivesModal.classList.add('hidden');
    });

    // Orders Modal
    DOM.closeOrdersBtn.addEventListener('click', () => {
        DOM.ordersModal.classList.add('hidden');
    });

    if (DOM.shopNowBtn) {
        DOM.shopNowBtn.addEventListener('click', () => {
            DOM.ordersModal.classList.add('hidden');
        });
    }

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === DOM.archivesModal) {
            DOM.archivesModal.classList.add('hidden');
        }
        if (e.target === DOM.ordersModal) {
            DOM.ordersModal.classList.add('hidden');
        }
        if (DOM.inspirationModal && e.target === DOM.inspirationModal) {
            DOM.inspirationModal.classList.add('hidden');
        }
        // Also close when clicking on the backdrop inside the inspiration modal
        if (DOM.inspirationModal && !DOM.inspirationModal.classList.contains('hidden')) {
            const backdrop = DOM.inspirationModal.querySelector('.modal-backdrop');
            if (e.target === backdrop) {
                DOM.inspirationModal.classList.add('hidden');
            }
        }
    });

    // Inspiration Gallery
    if (DOM.inspirationBtn) {
        DOM.inspirationBtn.addEventListener('click', () => {
            if (DOM.inspirationModal) {
                DOM.inspirationModal.classList.remove('hidden');
                renderInspiration();
            }
        });
    }

    if (DOM.closeInspirationBtn) {
        DOM.closeInspirationBtn.addEventListener('click', () => {
            if (DOM.inspirationModal) DOM.inspirationModal.classList.add('hidden');
        });
    }

    // Navigation buttons for carousel
    if (DOM.inspirationPrevBtn) {
        DOM.inspirationPrevBtn.addEventListener('click', () => {
            navigateInspiration(-1);
        });
    }

    if (DOM.inspirationNextBtn) {
        DOM.inspirationNextBtn.addEventListener('click', () => {
            navigateInspiration(1);
        });
    }

    // Use prompt button
    if (DOM.usePromptBtn) {
        DOM.usePromptBtn.addEventListener('click', () => {
            if (DOM.currentInspirationItem) {
                DOM.promptInput.value = DOM.currentInspirationItem.prompt;
                DOM.inspirationModal.classList.add('hidden');
                DOM.promptInput.focus();
            }
        });
    }

    // Keyboard navigation for inspiration modal
    document.addEventListener('keydown', (e) => {
        if (DOM.inspirationModal && !DOM.inspirationModal.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                DOM.inspirationModal.classList.add('hidden');
            } else if (e.key === 'ArrowLeft') {
                navigateInspiration(-1);
            } else if (e.key === 'ArrowRight') {
                navigateInspiration(1);
            }
        }
    });

    // Color buttons
    DOM.colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newFrontSrc = e.target.dataset.src;
            const newColor = COLOR_FROM_FRONT_SRC[newFrontSrc] || '#f5f5f5';
            state.currentTshirtColor = newColor;

            // Update displayed image for current side
            const newSrc = getTshirtSrc(newColor, state.currentSide);
            DOM.tshirtImg.style.opacity = 0.5;
            setTimeout(() => {
                DOM.tshirtImg.src = newSrc;
                DOM.tshirtImg.style.opacity = 1;
            }, 150);

            // Manage active state for CSS rings
            DOM.colorBtns.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
        });
    });

    // Front/Back toggle
    if (DOM.toggleFront) {
        DOM.toggleFront.addEventListener('click', () => switchSide('front'));
    }
    if (DOM.toggleBack) {
        DOM.toggleBack.addEventListener('click', () => switchSide('back'));
    }

    // Generate button
    DOM.generateBtn.addEventListener('click', generateDesign);

    // Remove design button
    if (DOM.removeDesignBtn) {
        DOM.removeDesignBtn.addEventListener('click', removeDesign);
    }

    // Buy Now button
    if (DOM.buyNowBtn) {
        DOM.buyNowBtn.addEventListener('click', handleBuyNow);
    }
}

// --- Inspiration Gallery Function ---
let currentInspirationIndex = 0;

function renderInspiration() {
    if (!DOM.inspirationMainImage || !DOM.inspirationQuote || !DOM.inspirationPagination) return;

    // Reset index to first item when opening modal
    currentInspirationIndex = 0;
    DOM.currentInspirationItem = CURATED_INSPIRATION[0];

    updateInspirationDisplay();
}

function updateInspirationDisplay() {
    const item = CURATED_INSPIRATION[currentInspirationIndex];
    DOM.currentInspirationItem = item;

    // Update main image
    DOM.inspirationMainImage.src = item.url;
    DOM.inspirationMainImage.alt = item.prompt;

    // Update quote
    DOM.inspirationQuote.textContent = `"${item.prompt}"`;

    // Update pagination dots
    renderPagination();

    // Update navigation buttons state
    updateNavigationButtons();
}

function renderPagination() {
    if (!DOM.inspirationPagination) return;

    DOM.inspirationPagination.innerHTML = '';

    CURATED_INSPIRATION.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = `inspiration-pagination-dot${index === currentInspirationIndex ? ' active' : ''}`;
        dot.addEventListener('click', () => {
            currentInspirationIndex = index;
            updateInspirationDisplay();
        });
        DOM.inspirationPagination.appendChild(dot);
    });
}

function updateNavigationButtons() {
    // Disable prev button if at first item
    if (DOM.inspirationPrevBtn) {
        DOM.inspirationPrevBtn.style.opacity = currentInspirationIndex === 0 ? '0.5' : '1';
        DOM.inspirationPrevBtn.style.cursor = currentInspirationIndex === 0 ? 'not-allowed' : 'pointer';
    }

    // Disable next button if at last item
    if (DOM.inspirationNextBtn) {
        const isLast = currentInspirationIndex === CURATED_INSPIRATION.length - 1;
        DOM.inspirationNextBtn.style.opacity = isLast ? '0.5' : '1';
        DOM.inspirationNextBtn.style.cursor = isLast ? 'not-allowed' : 'pointer';
    }
}

function navigateInspiration(direction) {
    const newIndex = currentInspirationIndex + direction;

    // Check bounds
    if (newIndex < 0 || newIndex >= CURATED_INSPIRATION.length) return;

    currentInspirationIndex = newIndex;
    updateInspirationDisplay();
}

// --- Side Toggle Logic ---
function switchSide(side) {
    if (state.currentSide === side) return;

    // Save current design's position before switching
    const currentDesign = getCurrentDesign();
    if (currentDesign) {
        // Position is already saved in the design object via applyTransform
    }

    state.currentSide = side;

    // Update toggle button active states
    DOM.toggleFront.classList.toggle('is-active', side === 'front');
    DOM.toggleBack.classList.toggle('is-active', side === 'back');

    // Swap t-shirt base image
    const newSrc = getTshirtSrc(state.currentTshirtColor, side);
    DOM.tshirtImg.style.opacity = 0.5;
    setTimeout(() => {
        DOM.tshirtImg.src = newSrc;
        DOM.tshirtImg.style.opacity = 1;
    }, 150);

    // Swap design overlay
    const newDesign = getCurrentDesign();
    if (newDesign) {
        loadDesignToCanvas(newDesign);
    } else {
        // Hide design overlay for this side
        DOM.generatedImage.onerror = null;
        DOM.generatedImage.src = '';
        DOM.designWrapper.classList.add('hidden');
        DOM.designWrapper.style.transform = 'translate(-50%, -50%)';
    }

    updateUI();
}

// --- Authentication Functions ---
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (response.ok) {
            state.user = await response.json();
            state.generationsLeft = 5 - state.user.generationsUsed;
            showApp();
            loadHistory();
        } else {
            localStorage.removeItem('luxe_token');
            state.token = null;
            showAuthModal();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthModal();
    }
}

function showAuthModal() {
    if (DOM.authModal) DOM.authModal.classList.remove('hidden');
}

function hideAuthModal() {
    if (DOM.authModal) DOM.authModal.classList.add('hidden');
}

function showApp() {
    hideAuthModal();
    if (DOM.logoutBtn) DOM.logoutBtn.classList.remove('hidden');
    updateUI();
}

async function handleLogin() {
    const email = DOM.loginEmail.value;
    const password = DOM.loginPassword.value;

    if (!email || !password) {
        showAuthError('Please fill all fields');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem('luxe_token', state.token);
            state.generationsLeft = 5 - state.user.generationsUsed;
            showApp();
            loadHistory();
        } else {
            showAuthError(data.error || (data.errors ? data.errors[0].msg : 'Login failed'));
        }
    } catch (error) {
        showAuthError('Connection error');
    }
}

async function handleRegister() {
    const name = DOM.registerName.value;
    const email = DOM.registerEmail.value;
    const password = DOM.registerPassword.value;

    if (!name || !email || !password) {
        showAuthError('Please fill all fields', true);
        return;
    }

    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters', true);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem('luxe_token', state.token);
            state.generationsLeft = 5 - state.user.generationsUsed;
            showApp();
            loadHistory();
        } else {
            let errorMsg = data.error || 'Registration failed';
            if (data.errors && data.errors.length > 0) {
                errorMsg = data.errors[0].msg || errorMsg;
            }
            showAuthError(errorMsg, true);
        }
    } catch (error) {
        showAuthError('Connection error', true);
    }
}

function handleLogout() {
    localStorage.removeItem('luxe_token');
    state.token = null;
    state.user = null;
    state.frontDesign = null;
    state.backDesign = null;
    state.history = [];
    window.location.reload();
}

async function handleMyOrders() {
    if (!state.token) {
        showAuthModal();
        return;
    }

    DOM.ordersModal.classList.remove('hidden');
    DOM.ordersList.innerHTML = '<div class="p-12 text-center text-gray-500 text-sm">Loading orders...</div>';

    try {
        const response = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (response.ok) {
            const orders = await response.json();
            renderOrders(orders);
        } else {
            const data = await response.json();
            DOM.ordersList.innerHTML = `<div class="p-12 text-center text-red-500 text-sm">${data.error || 'Failed to load orders'}</div>`;
        }
    } catch (error) {
        console.error('Failed to load orders:', error);
        DOM.ordersList.innerHTML = '<div class="p-12 text-center text-red-500 text-sm">Connection error</div>';
    }
}

function renderOrders(orders) {
    if (orders.length === 0) {
        DOM.emptyOrders.classList.remove('hidden');
        DOM.ordersList.classList.add('hidden');
        return;
    }

    DOM.emptyOrders.classList.add('hidden');
    DOM.ordersList.classList.remove('hidden');
    DOM.ordersList.innerHTML = '';

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const statusColors = {
            'draft': 'background: rgba(107, 114, 128, 0.2); color: #9ca3af;',
            'payment_pending': 'background: rgba(234, 179, 8, 0.2); color: #eab308;',
            'paid': 'background: rgba(34, 197, 94, 0.2); color: #22c55e;',
            'production': 'background: rgba(59, 130, 246, 0.2); color: #3b82f6;',
            'shipped': 'background: rgba(99, 102, 241, 0.2); color: #6366f1;',
            'delivered': 'background: rgba(22, 163, 74, 0.2); color: #4ade80;'
        };

        const statusLabel = order.status.replace('_', ' ').toUpperCase();

        // Use combined mockup if available, else fall back to front finalized/processed
        let displayImageUrl = order.combined_mockup_url || order.front_finalized_image_url || order.front_processed_image_url;
        if (displayImageUrl && !displayImageUrl.startsWith('http')) {
            displayImageUrl = displayImageUrl.startsWith('/') ? displayImageUrl : `/${displayImageUrl}`;
        }

        // Build prompt text from front and/or back designs
        const promptParts = [];
        if (order.front_prompt) promptParts.push(`Front: ${order.front_prompt}`);
        if (order.back_prompt) promptParts.push(`Back: ${order.back_prompt}`);
        const displayPrompt = promptParts.join(' | ') || 'Custom Tee';

        const orderCard = document.createElement('div');
        orderCard.style.cssText = 'background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; display: flex; flex-direction: row; min-height: 120px; margin-bottom: 12px;';

        orderCard.innerHTML = `
            <div style="width: 120px; background: #e5e7eb; display: flex; align-items: center; justify-content: center; padding: 8px; flex-shrink: 0;">
                ${displayImageUrl ?
                `<img src="${displayImageUrl}"
                          style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));"
                          alt="Order Design"
                          onerror="this.src='assets/black-tshirt.png'; this.style.opacity='0.5';">` :
                `<div style="width: 100%; height: 100%; background: #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280;">NO IMAGE</div>`
            }
            </div>
            <div style="flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">${date}</div>
                        <h4 style="color: #111827; font-size: 14px; font-weight: 500; margin: 0;">Order #${order.id.slice(0, 8).toUpperCase()}</h4>
                        <div style="font-size: 11px; color: #6b7280; margin-top: 4px; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px;">"${displayPrompt}"</div>
                    </div>
                    <span style="font-size: 10px; padding: 4px 8px; border-radius: 4px; ${statusColors[order.status] || 'background: rgba(107, 114, 128, 0.2); color: #9ca3af;'} font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; flex-shrink: 0;">
                        ${statusLabel}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="font-size: 12px; color: #4b5563;">
                        <span style="text-transform: uppercase; font-weight: bold; color: #111827;">${order.tshirt_size}</span> • ${order.tshirt_quantity} Unit${order.tshirt_quantity > 1 ? 's' : ''}
                    </div>
                    <div style="color: #111827; font-weight: 600; letter-spacing: 0.05em; font-size: 14px;">
                        ₹${(order.amount_in_paise / 100).toFixed(2)}
                    </div>
                </div>
            </div>
        `;

        DOM.ordersList.appendChild(orderCard);
    });
}

function showAuthError(message, isRegister = false) {
    const errorEl = isRegister ? document.getElementById('auth-error-register') : DOM.authError;
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function updateUI() {
    if (state.user) {
        if (DOM.rateLimitDisplay) {
            DOM.rateLimitDisplay.textContent = `Number of Designs left: ${state.generationsLeft}`;
        }

        if (state.generationsLeft <= 0) {
            DOM.generateBtn.disabled = true;
            DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Limit Reached';
        }

        // Show BUY NOW button if there's any design (front or back)
        if (DOM.buyNowBtn) {
            if (hasAnyDesign()) {
                DOM.buyNowBtn.classList.remove('hidden');
                DOM.buyNowBtn.disabled = false;
            } else {
                DOM.buyNowBtn.classList.add('hidden');
                DOM.buyNowBtn.disabled = true;
            }
        }
    }
}

// --- Professional Drag & Resize Engine (Interact.js) ---
function initInteractJS() {
    interact('#generated-image-container')
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                move: dragMoveListener,
            }
        });

    if (DOM.resizeHandle) {
        DOM.resizeHandle.addEventListener('mousedown', initResize);
        DOM.resizeHandle.addEventListener('touchstart', initResize, { passive: false });
    }
}

let startY = 0;
let startScale = 1;

function initResize(e) {
    e.preventDefault();
    e.stopPropagation();
    startY = e.clientY || (e.touches && e.touches[0].clientY);
    const currentDesign = getCurrentDesign();
    startScale = (currentDesign && currentDesign.scale) || 1;

    window.addEventListener('mousemove', resizeMoveListener);
    window.addEventListener('touchmove', resizeMoveListener, { passive: false });
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('touchend', stopResize);
}

function resizeMoveListener(e) {
    e.preventDefault();
    const currentDesign = getCurrentDesign();
    if (!currentDesign) return;

    const currentY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaY = startY - currentY;
    let newScale = startScale + (deltaY * 0.01);

    newScale = Math.max(0.3, Math.min(newScale, 2.5));

    applyTransform(currentDesign.x, currentDesign.y, newScale);
}

function stopResize() {
    window.removeEventListener('mousemove', resizeMoveListener);
    window.removeEventListener('touchmove', resizeMoveListener);
    window.removeEventListener('mouseup', stopResize);
    window.removeEventListener('touchend', stopResize);
}

function dragMoveListener(event) {
    const currentDesign = getCurrentDesign();
    if (!currentDesign) return;

    const scale = currentDesign.scale || 1;
    currentDesign.x += (event.dx / scale);
    currentDesign.y += (event.dy / scale);

    applyTransform(currentDesign.x, currentDesign.y, scale);
}

function applyTransform(x, y, scale) {
    const currentDesign = getCurrentDesign();
    if (currentDesign) {
        currentDesign.x = x;
        currentDesign.y = y;
        currentDesign.scale = scale;
    }
    DOM.designWrapper.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}


// --- Design Generation ---
async function generateDesign() {
    const prompt = DOM.promptInput.value.trim();
    if (!prompt) {
        alert('Please describe your design vision');
        return;
    }

    setLoadingState(true);

    try {
        const response = await fetch(`${API_BASE}/designs/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                prompt: prompt,
                tshirtColor: state.currentTshirtColor
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Generation failed');
        }

        const imageUrl = data.imageUrl;

        console.log(`🎨 Generated ${state.currentSide} design received:`, imageUrl);

        // Preload image with timeout
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            const timeout = setTimeout(() => {
                console.error('Image load timeout:', imageUrl);
                reject(new Error('Image load timed out. Check your internet connection.'));
            }, 15000);

            img.onload = () => {
                clearTimeout(timeout);
                console.log('✅ Image loaded successfully');
                resolve(imageUrl);
            };

            img.onerror = (e) => {
                clearTimeout(timeout);
                console.error('❌ Image load failed:', imageUrl);
                reject(new Error('Failed to load generated image. The server may be unreachable.'));
            };

            console.log('🔄 Loading image from:', imageUrl);
            img.src = imageUrl;
        });

        handleNewDesign(imageUrl, prompt, data);

    } catch (error) {
        console.error('Generation failed:', error);

        if (error.message === 'Failed to load generated image') {
            alert('Design was generated but the image could not be loaded. Please check your internet connection and try again.');
        } else {
            alert(error.message || 'Failed to generate design');
        }
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    DOM.generateBtn.disabled = isLoading;
    if (isLoading) {
        DOM.btnLoader.classList.remove('hidden');
        DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Generating...';
    } else {
        DOM.btnLoader.classList.add('hidden');
        DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Generate';
    }
}

// --- History & Canvas Logic ---
function handleNewDesign(url, promptText, data) {
    const newDesign = {
        id: data.designId,
        url: url,
        prompt: promptText,
        scale: 1,
        x: 0,
        y: 0
    };

    state.history.unshift(newDesign);
    if (state.history.length > 5) state.history.pop();

    if (data && data.generationsLeft !== undefined) {
        state.generationsLeft = data.generationsLeft;
        if (DOM.rateLimitDisplay) {
            DOM.rateLimitDisplay.textContent = `Number of Designs left: ${state.generationsLeft}`;
        }

        if (state.generationsLeft <= 0) {
            DOM.generateBtn.disabled = true;
            DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Limit Reached';
        }
    }

    renderHistory();
    // Load the new design onto the current side
    loadDesignToCanvas(newDesign);
}

function loadDesignToCanvas(design) {
    // Set the design on the current side
    setCurrentDesign(design);

    DOM.generatedImage.src = design.url;
    DOM.generatedImage.onerror = () => {
        console.error('Failed to load design on canvas:', design.url);
        alert('Failed to display design. Please try regenerating.');
    };
    DOM.designWrapper.classList.remove('hidden');

    // Apply position constraints
    applyTransform(design.x, design.y, design.scale);

    // Show BUY NOW button
    if (DOM.buyNowBtn) {
        DOM.buyNowBtn.classList.remove('hidden');
    }
}

function removeDesign() {
    // Clear only the current side's design
    setCurrentDesign(null);

    // Remove the onerror handler
    DOM.generatedImage.onerror = null;
    DOM.generatedImage.src = '';
    DOM.designWrapper.classList.add('hidden');
    DOM.designWrapper.style.transform = 'translate(-50%, -50%)';

    // Update BUY NOW visibility based on whether any design remains
    updateUI();
}

function restoreFromHistory(id) {
    const design = state.history.find(d => d.id === id);
    if (design) {
        const normalizedDesign = {
            ...design,
            url: design.url || design.processed_image_url,
            // Reset position and scale for a fresh start
            x: 0,
            y: 0,
            scale: 1
        };
        // Loads onto the currently active side
        loadDesignToCanvas(normalizedDesign);
        DOM.archivesModal.classList.add('hidden');
    }
}

function renderHistory() {
    if (DOM.archivesGrid) DOM.archivesGrid.innerHTML = '';

    if (state.history.length === 0) {
        if (DOM.emptyArchives) DOM.emptyArchives.classList.remove('hidden');
        if (DOM.archivesGrid) DOM.archivesGrid.classList.add('hidden');
        return;
    } else {
        if (DOM.emptyArchives) DOM.emptyArchives.classList.add('hidden');
        if (DOM.archivesGrid) DOM.archivesGrid.classList.remove('hidden');
    }

    state.history.forEach(item => {
        const img = document.createElement('img');
        img.src = item.url || item.processed_image_url;
        img.alt = 'Design Archive';
        img.onclick = () => restoreFromHistory(item.id);

        DOM.archivesGrid.appendChild(img);
    });
}

async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/designs/history`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (response.ok) {
            const data = await response.json();
            state.history = data.designs || [];
            if (data.generationsUsed !== undefined) {
                state.generationsLeft = 5 - data.generationsUsed;
                if (DOM.rateLimitDisplay) {
                    DOM.rateLimitDisplay.textContent = `Number of Designs left: ${state.generationsLeft}`;
                }
            }

            renderHistory();
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// --- BUY NOW / Checkout Logic ---

// Bake a single side's composite (t-shirt + design)
async function bakeSideComposite(side) {
    const design = side === 'front' ? state.frontDesign : state.backDesign;
    if (!design) return null;

    try {
        const canvas = document.createElement('canvas');
        const CANVAS_WIDTH = 2000;
        const CANVAS_HEIGHT = 2400;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const ctx = canvas.getContext('2d');

        // Load t-shirt image for this side
        const tshirtSrc = getTshirtSrc(state.currentTshirtColor, side);
        const tshirtImg = new Image();
        tshirtImg.src = tshirtSrc;

        const designImg = new Image();
        designImg.crossOrigin = "anonymous";
        designImg.src = design.url;

        await Promise.all([
            new Promise(res => tshirtImg.onload = res),
            new Promise(res => designImg.onload = res)
        ]);

        // Draw t-shirt
        ctx.drawImage(tshirtImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Map design position from UI to canvas
        // Use the t-shirt image natural dimensions for accurate scaling
        const uiTshirtWidth = DOM.tshirtImg.clientWidth;
        const uiTshirtHeight = DOM.tshirtImg.clientHeight;

        // Calculate scale factors from UI to canvas
        const scaleX = CANVAS_WIDTH / uiTshirtWidth;
        const scaleY = CANVAS_HEIGHT / uiTshirtHeight;

        // Get design image natural dimensions
        const designNaturalWidth = designImg.naturalWidth || 512;
        const designNaturalHeight = designImg.naturalHeight || 512;

        // Calculate the displayed design size (scaled)
        const safeScale = design.scale || 1;

        // Base design size relative to t-shirt (approximately 40% of t-shirt width at scale 1)
        const baseDesignWidth = uiTshirtWidth * 0.4;
        const aspectRatio = designNaturalWidth / designNaturalHeight;
        const baseDesignHeight = baseDesignWidth / aspectRatio;

        // Apply user's scale
        const finalWidth = baseDesignWidth * safeScale * scaleX;
        const finalHeight = baseDesignHeight * safeScale * scaleY;

        // Apply position offset
        const offsetX = design.x || 0;
        const offsetY = design.y || 0;

        // Center position + offset
        const finalX = (CANVAS_WIDTH / 2) + (offsetX * scaleX);
        const finalY = (CANVAS_HEIGHT / 2) + (offsetY * scaleY);

        ctx.drawImage(
            designImg,
            finalX - (finalWidth / 2),
            finalY - (finalHeight / 2),
            finalWidth,
            finalHeight
        );

        return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
        console.error(`Baking ${side} failed:`, error);
        return null;
    }
}

// Create a combined mockup with front and back side by side
async function createCombinedMockup() {
    const frontImage = await bakeSideComposite('front');
    const backImage = await bakeSideComposite('back');

    // If neither side has a design, return null
    if (!frontImage && !backImage) return null;

    // Create side-by-side composite (always show both sides for clarity)
    try {
        const canvas = document.createElement('canvas');
        const SIDE_WIDTH = 1000;
        const SIDE_HEIGHT = 1200;
        canvas.width = SIDE_WIDTH * 2 + 40; // 40px gap
        canvas.height = SIDE_HEIGHT;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#f5f5f2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // If only one side has a design, use it for both sides (or show blank for the other)
        const displayFront = frontImage || backImage;
        const displayBack = backImage || frontImage;

        // Load and draw front composite (or the only available side)
        if (displayFront) {
            const frontImg = new Image();
            frontImg.src = displayFront;
            await new Promise(res => frontImg.onload = res);
            ctx.drawImage(frontImg, 0, 0, SIDE_WIDTH, SIDE_HEIGHT);
        }

        // Load and draw back composite (or the only available side)
        if (displayBack) {
            const backImg = new Image();
            backImg.src = displayBack;
            await new Promise(res => backImg.onload = res);
            ctx.drawImage(backImg, SIDE_WIDTH + 40, 0, SIDE_WIDTH, SIDE_HEIGHT);
        }

        // Labels
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FRONT', SIDE_WIDTH / 2, SIDE_HEIGHT - 20);
        ctx.fillText('BACK', SIDE_WIDTH + 40 + SIDE_WIDTH / 2, SIDE_HEIGHT - 20);

        return canvas.toDataURL('image/jpeg', 0.90);
    } catch (error) {
        console.error('Combined mockup creation failed:', error);
        return frontImage || backImage;
    }
}

async function finalizeDesignOnServer(designId, finalImageBase64) {
    try {
        const response = await fetch(`${API_BASE}/designs/${designId}/finalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ finalImage: finalImageBase64 })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to finalize design');
        }

        return data.finalizedImageUrl;
    } catch (error) {
        console.error('Finalize error:', error);
        throw error;
    }
}

async function handleBuyNow() {
    if (!hasAnyDesign()) {
        alert('Please generate or select a design first');
        return;
    }

    if (!state.token) {
        showAuthModal();
        return;
    }

    showSizeModal();
}

function showSizeModal() {
    const modal = document.createElement('div');
    modal.id = 'size-modal';
    modal.className = 'modal-root';

    // Show which sides have designs
    const sideInfo = [];
    if (state.frontDesign) sideInfo.push('Front');
    if (state.backDesign) sideInfo.push('Back');
    const sidesText = sideInfo.join(' + ') + ' design' + (sideInfo.length > 1 ? 's' : '');

    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-panel" style="max-width: 380px;">
            <h3 class="serif modal-title" style="margin-bottom: 8px;">Select Size</h3>
            <p class="modal-subcopy" style="margin-bottom: 24px;">Choose your T-shirt size · <strong>${sidesText}</strong></p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
                <button class="size-btn btn-secondary" data-size="S" style="margin-top:0;">S</button>
                <button class="size-btn btn-secondary" data-size="M" style="margin-top:0;">M</button>
                <button class="size-btn btn-secondary" data-size="L" style="margin-top:0;">L</button>
                <button class="size-btn btn-secondary" data-size="XL" style="margin-top:0;">XL</button>
                <button class="size-btn btn-secondary" data-size="XXL" style="margin-top:0; grid-column: span 2;">XXL</button>
            </div>
            <div style="display: flex; gap: 12px;">
                <button id="cancel-size-btn" class="btn-secondary" style="margin-top:0; flex: 1;">Cancel</button>
                <button id="proceed-buy-btn" class="btn-primary" style="flex: 1;">Proceed</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let selectedSize = null;

    modal.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.size-btn').forEach(b => {
                b.style.borderColor = '#d1d5db';
                b.style.backgroundColor = '#ffffff';
                b.style.color = '#111827';
            });
            btn.style.borderColor = '#111827';
            btn.style.backgroundColor = '#111827';
            btn.style.color = '#ffffff';
            selectedSize = btn.dataset.size;
        });
    });

    document.getElementById('cancel-size-btn').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('proceed-buy-btn').addEventListener('click', async () => {
        if (!selectedSize) {
            alert('Please select a size');
            return;
        }

        const proceedBtn = document.getElementById('proceed-buy-btn');
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Finalizing...';

        try {
            // Finalize front design if it exists
            if (state.frontDesign) {
                const frontBaked = await bakeSideComposite('front');
                if (frontBaked) {
                    await finalizeDesignOnServer(state.frontDesign.id, frontBaked);
                    state.frontDesign.is_finalized = true;
                }
            }

            // Finalize back design if it exists
            if (state.backDesign) {
                const backBaked = await bakeSideComposite('back');
                if (backBaked) {
                    await finalizeDesignOnServer(state.backDesign.id, backBaked);
                    state.backDesign.is_finalized = true;
                }
            }

            // Create combined mockup
            proceedBtn.textContent = 'Creating mockup...';
            const combinedMockupBase64 = await createCombinedMockup();

            // Upload combined mockup to R2
            let combinedMockupUrl = null;
            if (combinedMockupBase64) {
                const uploadResponse = await fetch(`${API_BASE}/designs/upload-mockup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ mockupImage: combinedMockupBase64 })
                });
                const uploadData = await uploadResponse.json();
                if (uploadResponse.ok) {
                    combinedMockupUrl = uploadData.mockupUrl;
                }
            }

            modal.remove();
            initiateCheckout(selectedSize, combinedMockupUrl);
        } catch (error) {
            alert('Failed to finalize design: ' + error.message);
            proceedBtn.disabled = false;
            proceedBtn.textContent = 'Proceed';
        }
    });
}

async function initiateCheckout(tshirtSize, combinedMockupUrl) {
    try {
        const orderResponse = await fetch(`${API_BASE}/orders/buy-now`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                designIdFront: state.frontDesign ? state.frontDesign.id : null,
                designIdBack: state.backDesign ? state.backDesign.id : null,
                tshirtSize: tshirtSize,
                quantity: 1,
                combinedMockupUrl: combinedMockupUrl
            })
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
            throw new Error(orderData.error || 'Failed to create order');
        }

        const paymentResponse = await fetch(`${API_BASE}/orders/initiate-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                orderId: orderData.orderId
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            throw new Error(paymentData.error || 'Failed to initiate payment');
        }

        const options = {
            key: paymentData.key,
            amount: paymentData.amount,
            currency: paymentData.currency,
            name: 'March Studio',
            description: 'Custom Designed T-Shirt',
            order_id: paymentData.razorpayOrderId,
            handler: function (response) {
                verifyPayment(response, orderData.orderId);
            },
            prefill: {
                name: state.user?.name || '',
                email: state.user?.email || '',
                contact: state.user?.phone || ''
            },
            theme: {
                color: '#111827'
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            alert('Payment failed: ' + response.error.description);
        });
        rzp.open();

    } catch (error) {
        console.error('Checkout error:', error);
        alert(error.message || 'Failed to proceed with checkout');
    }
}

async function verifyPayment(paymentResponse, orderId) {
    try {
        const response = await fetch(`${API_BASE}/payments/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Payment successful! Your order has been placed.');
        } else {
            throw new Error(data.error || 'Payment verification failed');
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        alert(error.message || 'Payment verification failed');
    }
}

// Start the app
init();