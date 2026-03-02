// Cấu hình Firebase (thay bằng thông số của bạn)
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "...",
    databaseURL: "https://...firebaseio.com",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
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
        if (user) {
            currentUser = user;
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
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            document.getElementById('login-error').innerText = error.message;
        });
};

// Hàm đăng xuất
window.logout = () => {
    auth.signOut();
};

// Hiển thị panel điều khiển
function showControlPanel() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('control-container').style.display = 'block';
}

// Hiển thị panel đăng nhập
function showLoginPanel() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('control-container').style.display = 'none';
}

// Tải dữ liệu LED từ database và lắng nghe thay đổi
function loadLEDsData() {
    const ledsRef = database.ref('leds');
    ledsRef.on('value', snapshot => {
        if (snapshot.exists()) {
            ledStates = snapshot.val();
            renderLEDs();
        } else {
            // Nếu chưa có dữ liệu, tạo mặc định
            ledsRef.set(ledStates);
        }
    });
}

// Render giao diện 3 LED
function renderLEDs() {
    const panel = document.getElementById('leds-panel');
    panel.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        const ledId = `led${i}`;
        const state = ledStates[ledId] || { mode: 'off', pwmValue: 128, blinkInterval: 500 };
        
        // Xác định trạng thái hiển thị
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

        // Tạo card
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

    // Gắn sự kiện cho các nút
    document.querySelectorAll('.led-btn[data-led]').forEach(btn => {
        btn.addEventListener('click', handleButtonClick);
    });
}

// Xử lý khi nhấn nút
function handleButtonClick(event) {
    const btn = event.currentTarget;
    const ledId = btn.dataset.led;
    const mode = btn.dataset.mode; // 'toggle', 'pwm', 'blink'
    const currentState = ledStates[ledId];

    let newMode;
    if (mode === 'toggle') {
        // Nếu đang on -> off, nếu đang off -> on, nếu đang khác -> on
        if (currentState.mode === 'on') {
            newMode = 'off';
        } else {
            newMode = 'on';
        }
    } else {
        // pwm hoặc blink: nếu đang ở chế độ đó thì tắt, nếu không thì bật chế độ đó
        if (currentState.mode === mode) {
            newMode = 'off';
        } else {
            newMode = mode;
        }
    }

    // Cập nhật lên database
    const updates = {};
    updates[`leds/${ledId}/mode`] = newMode;
    database.ref().update(updates);
}