document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const babyName = document.getElementById('babyName').value;
        const birthDate = document.getElementById('birthDate').value;
        const motherName = document.getElementById('motherName').value;
        const userType = document.getElementById('userType').value;
        
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        if (users.some(u => u.email === email)) {
            alert('Este e-mail já está cadastrado');
            return;
        }
        
        const newUser = { 
            name, 
            email, 
            password, 
            userType,
            babies: [{
                name: babyName,
                birthDate,
                motherName,
                feedings: {}
            }]
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        window.location.href = 'inicio.html'; // Alterado de 'index.html' para 'inicio.html'
    });
});
