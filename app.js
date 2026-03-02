// Cấu hình Firebase (dùng thông tin bạn cung cấp)
const firebaseConfig = {
    apiKey: "AIzaSyCXr1b9JdD0qfYT0w1SOj9c-RSg9ImbWN0",
    authDomain: "led-effect.firebaseapp.com",
    databaseURL: "https://led-effect-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "led-effect",
    storageBucket: "led-effect.firebasestorage.app",
    messagingSenderId: "387848661922",
    appId: "1:387848661922:web:28e7ac83a7c6e36fc6e0fb"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Biến toàn cục
let currentUser = null;
let ledStates = {
    led1: { mode: 'off', pwmValue: 128, blinkInterval: 500 },
    led2: { mode: 'off', pwmValue: 128, blinkInterval: 500 },
    led3: { mode: 'off', pwmValue: 128, blinkInterval: 500 }
};

// Theo dõi kết nối Firebase Realtime Database
const connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snap) => {
    const statusElem = document.getElementById('connection-status');
    if (snap.val() === true) {
        statusElem.textContent = 'Online';
        statusElem.classList.add('online');
        statusElem.classList.remove('offline');
    } else {
        statusElem.textContent = 'Offline';
        statusElem.classList.add('offline');
        statusElem.classList.remove('online');
    }
});

// Đợi DOM load xong
document.addEventListener('DOMContentLoaded', () => {
    // Theo dõi trạng thái đăng nhập
    auth.onAuthStateChanged(user => {
        console.log('Auth state changed:', user);
        if (user) {
            currentUser = user;
            console.log('Logged in as:', user.email, 'UID:', user.uid);
            showControlPanel();
            loadLEDsData();
        } else {
            showLoginPanel();
        }
    });
});

// Hàm đăng nhập
window.login = () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log('Attempting login with:', email);
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Login success:', userCredential.user);
        })
        .catch(error => {
            console.error('Login error:', error);
            document.getElementById('login-error').innerText = error.message;
        });
};

// Hàm đăng xuất
window.logout = () => {
    auth.signOut().then(() => {
        console.log('Logged out');
    });
};

function showControlPanel() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('control-container').style.display = 'block';
}

function showLoginPanel() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('control-container').style.display = 'none';
}

function loadLEDsData() {
    const ledsRef = database.ref('leds');
    ledsRef.on('value', snapshot => {
        if (snapshot.exists()) {
            ledStates = snapshot.val();
            renderLEDs();
        } else {
            ledsRef.set(ledStates);
        }
    }, (error) => {
        console.error('Database read error:', error);
    });
}

function renderLEDs() {
    const panel = document.getElementById('leds-panel');
    panel.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        const ledId = `led${i}`;
        const state = ledStates[ledId] || { mode: 'off', pwmValue: 128, blinkInterval: 500 };
        
        let statusText = '';
        let statusClass = '';
        switch (state.mode) {
            case 'on':
                statusText = 'Đang sáng';
                statusClass = 'on';
                break;
            case 'off':
                statusText = 'Đang tắt';
                statusClass = 'off';
                break;
            case 'pwm':
                statusText = `PWM (${state.pwmValue})`;
                statusClass = 'pwm';
                break;
            case 'blink':
                statusText = `Nhấp nháy (${state.blinkInterval}ms)`;
                statusClass = 'blink';
                break;
            default:
                statusText = 'Không xác định';
                statusClass = 'off';
        }

        const card = document.createElement('div');
        card.className = 'led-card';
        card.innerHTML = `
            <div class="led-header">
                <span class="led-title">Đèn ${i}</span>
                <span class="led-gpio">GPIO ${i === 1 ? 13 : i === 2 ? 12 : 14}</span>
            </div>
            <div class="led-status">
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="button-group">
                <button class="led-btn btn-toggle" data-led="${ledId}" data-mode="toggle" ${state.mode !== 'off' && state.mode !== 'on' ? 'disabled' : ''}>
                    ${state.mode === 'on' ? 'Tắt' : 'Bật'}
                </button>
                <button class="led-btn btn-pwm" data-led="${ledId}" data-mode="pwm" ${state.mode === 'pwm' ? '' : 'disabled'}>
                    PWM
                </button>
                <button class="led-btn btn-blink" data-led="${ledId}" data-mode="blink" ${state.mode === 'blink' ? '' : 'disabled'}>
                    Nhấp nháy
                </button>
            </div>
        `;
        panel.appendChild(card);
    }

    document.querySelectorAll('.led-btn[data-led]').forEach(btn => {
        btn.addEventListener('click', handleButtonClick);
    });
}

function handleButtonClick(event) {
    const btn = event.currentTarget;
    const ledId = btn.dataset.led;
    const mode = btn.dataset.mode;
    const currentState = ledStates[ledId];

    let newMode;
    if (mode === 'toggle') {
        newMode = (currentState.mode === 'on') ? 'off' : 'on';
    } else {
        newMode = (currentState.mode === mode) ? 'off' : mode;
    }

    const updates = {};
    updates[`leds/${ledId}/mode`] = newMode;
    database.ref().update(updates).catch(error => {
        console.error('Update error:', error);
    });
}
