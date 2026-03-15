const tabRegister = document.getElementById('tab-register');
const tabLogin = document.getElementById('tab-login');
const formTitle = document.querySelector('.text-wrapper');
const formSubtitle = document.querySelector('.header .p');
const submitBtnText = document.querySelector('.text-wrapper-7');
const form = document.getElementById('auth-form');

const usernameInput = document.getElementById('input-0');
const emailInput = document.getElementById('input-1');
const emailContainer = emailInput.closest('.container-5');
const passInput = document.getElementById('input-2');
const confirmPassInput = document.getElementById('input-3');
const confirmPassContainer = confirmPassInput.closest('.container-9');
const termsContainer = document.querySelector('.container-12');

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
    if(isLoginMode) setRegisterMode();
    else setLoginMode();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submission prevented');
    
    const username = usernameInput.value;
    const password = passInput.value;
    
    if(isLoginMode) {
        try {
            const res = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
                if(res.ok) {
                    alert(data.message);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = data.redirectUrl; // Use redirectUrl from backend
                } else {
                    alert('ล้มเหลว: ' + data.error);
                }
            } catch (err) {
                alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + err.message);
            }
        } else {
            const email = emailInput.value;
            const confirmData = confirmPassInput.value;
            const terms = document.getElementById('terms').checked;
            
            if(password !== confirmData) {
                alert('รหัสผ่านไม่ตรงกัน!');
                return;
            }
            if(!terms) {
                alert('กรุณายอมรับเงื่อนไขการใช้บริการ');
                return;
            }
            
            try {
                const res = await fetch('http://localhost:3000/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }) // Removed role
                });
            const data = await res.json();
            if(res.ok) {
                alert(data.message);
                setLoginMode();
            } else {
                alert('ล้มเหลว: ' + data.error);
            }
        } catch (err) {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + err.message);
        }
    }
});
