document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao fazer login. Por favor, tente novamente.');
        }
    });
});
