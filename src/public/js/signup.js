const loginBtn = document.querySelector('#loginn');
const registerBtn = document.querySelector('#register');
const loginForm = document.querySelector('.Login-form');
const registerForm = document.querySelector('.register-form');

// Initially hide the register form
document.addEventListener('DOMContentLoaded', function() {
    registerForm.style.opacity = 0;
    
});

loginBtn.addEventListener('click', function() {
    loginBtn.style.backgroundColor = "#21264D";
    registerBtn.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    
    loginForm.style.left = "50%";
    registerForm.style.left = "-50%";
    registerForm.style.marginTop = "0";
    loginForm.style.opacity = 1;
    registerForm.style.opacity = 0;

});

registerBtn.addEventListener('click', function() {
    loginBtn.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    registerBtn.style.backgroundColor = "#21264D";
    
    loginForm.style.left = "100%";
    registerForm.style.left = "50%";
    registerForm.style.marginTop = "-400px";  // Apply margin-top here
    registerForm.style.opacity = 1;
    loginForm.style.opacity = 0;
});

const sendOtpBtn = document.querySelector('#send-otp-btn');
        const verifyOtpBtn = document.querySelector('#verify-otp-btn');
        const otpInput = document.querySelector('#otp');
        const emailInput = document.querySelector('#email');
        
        // Send OTP Function
        sendOtpBtn.addEventListener('click', function () {
            const email = emailInput.value;

            if (!email) {
                alert('Please enter an email');
                return;
            }

            fetch('http://localhost:3000/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            })
            .then(response => response.text())
            .then(data => {
                alert('OTP Sent to your email');
                otpInput.style.display = 'block';
                verifyOtpBtn.style.display = 'block';
            })
            .catch(error => console.error('Error:', error));
        });

        // Verify OTP Function
        verifyOtpBtn.addEventListener('click', function () {
            const otp = otpInput.value;

            fetch('http://localhost:3000/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp: otp })
            })
            .then(response => response.text())
            .then(data => {
                alert(data);
                if (data === 'OTP verified successfully') {
                    // You can redirect the user or proceed with signup
                }
            })
            .catch(error => console.error('Error:', error));
        });