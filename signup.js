document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const babyName = document.getElementById('babyName').value;
        const birthDate = document.getElementById('birthDate').value;
        const motherName = document.getElementById('motherName').value;
        const userType = document.getElementById('userType').value;
        
        try {
            const response = await fetch('http://localhost:3000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    userType,
                    babyName,
                    birthDate,
                    motherName
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('Conta criada com sucesso!');
                window.location.href = 'login.html';
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao criar a conta. Por favor, tente novamente.');
        }
    });
});
