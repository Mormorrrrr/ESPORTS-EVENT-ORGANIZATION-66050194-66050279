const tabRegister = document.getElementById('tab-register');
const tabLogin = document.getElementById('tab-login');
const formTitle = document.querySelector('.text-wrapper');
const formSubtitle = document.querySelector('.header .p');
const submitBtnText = document.querySelector('.text-wrapper-7');
const form = document.getElementById('auth-form');

const usernameInput = document.getElementById('input-0');
const emailInput = document.getElementById('input-1');
const emailContainer = emailInput ? emailInput.closest('.container-5') || { style: {} } : { style: {} };
const passInput = document.getElementById('input-2');
const confirmPassInput = document.getElementById('input-3');
const confirmPassContainer = document.getElementById('confirm-pass-container') || { style: {} };
const termsContainer = document.querySelector('.container-12') || { style: {} };

const footerLinksText = document.querySelector('.text-wrapper-8');
const footerLinksAction = document.querySelector('.text-wrapper-9');

let isLoginMode = false;

function setLoginMode() {
    isLoginMode = true;

    tabLogin.firstElementChild.className = 'background-shadow';
    tabLogin.firstElementChild.firstElementChild.className = 'text-wrapper-2';

    tabRegister.firstElementChild.className = 'div-wrapper';
    tabRegister.firstElementChild.firstElementChild.className = 'text-wrapper-3';

    emailContainer.style.display = 'none';
    confirmPassContainer.style.display = 'none';
    termsContainer.style.display = 'none';

    formTitle.textContent = "Welcome Back";
    formSubtitle.textContent = "Log in to continue your journey.";
    submitBtnText.textContent = "Log In";
    footerLinksText.textContent = "Don't have an account? ";
    footerLinksAction.textContent = "Register";
}

function setRegisterMode() {
    isLoginMode = false;

    tabRegister.firstElementChild.className = 'background-shadow';
    tabRegister.firstElementChild.firstElementChild.className = 'text-wrapper-2';

    tabLogin.firstElementChild.className = 'div-wrapper';
    tabLogin.firstElementChild.firstElementChild.className = 'text-wrapper-3';

    emailContainer.style.display = '';
    confirmPassContainer.style.display = '';
    termsContainer.style.display = '';

    formTitle.textContent = "Join KMITL ESPORT";
    formSubtitle.textContent = "Create your account to start your competitive journey.";
    submitBtnText.textContent = "Create Account";
    footerLinksText.textContent = "Already have an account? ";
    footerLinksAction.textContent = "Log In";
}

tabLogin.addEventListener('click', setLoginMode);
tabRegister.addEventListener('click', setRegisterMode);
footerLinksAction.addEventListener('click', () => {
    if (isLoginMode) setRegisterMode();
    else setLoginMode();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submission prevented');

    const username = usernameInput.value;
    const password = passInput.value;

    if (isLoginMode) {
        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = data.redirectUrl;
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (err) {
            alert('Could not connect to server: ' + err.message);
        }
    } else {
        const email = emailInput.value;
        const confirmData = confirmPassInput.value;
        const terms = document.getElementById('terms').checked;

        if (!email.endsWith('@kmitl.ac.th') && !email.endsWith('@gmail.com')) {
            alert('Please use your KMITL email (@kmitl.ac.th) or Gmail (@gmail.com)');
            return;
        }
        if (password !== confirmData) {
            alert('Passwords do not match!');
            return;
        }
        if (!terms) {
            alert('Please accept terms of service');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setLoginMode();
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (err) {
            alert('Could not connect to server: ' + err.message);
        }
    }
});
