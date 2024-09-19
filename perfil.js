document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const profileForm = document.getElementById('profileForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const userTypeInput = document.getElementById('userType');

    // Preencher o formulário com os dados atuais do usuário
    nameInput.value = currentUser.name;
    emailInput.value = currentUser.email;
    userTypeInput.value = currentUser.userType;

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Atualizar os dados do usuário
        currentUser.name = nameInput.value;
        currentUser.email = emailInput.value;
        currentUser.userType = userTypeInput.value;

        if (passwordInput.value) {
            currentUser.password = passwordInput.value;
        }

        // Atualizar o usuário no localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Atualizar o usuário na lista de usuários
        const users = JSON.parse(localStorage.getItem('users'));
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));

        // Mostrar o modal de confirmação
        const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        confirmationModal.show();
    });

    // Adicionar evento de clique ao botão OK do modal
    document.getElementById('okButton').addEventListener('click', () => {
        // Redirecionar para a página anterior
        window.history.back();
    });
});
