import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Buscar informações adicionais do usuário no Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // Armazenar informações do usuário no localStorage
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    name: userData.name,
                    userType: userData.userType
                }));
                window.location.href = 'inicio.html';
            } else {
                console.error("Documento do usuário não encontrado");
                alert('Erro ao recuperar informações do usuário');
            }
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            alert('E-mail ou senha incorretos');
        }
    });
});
