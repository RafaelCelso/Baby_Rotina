import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
            console.log("Tentando criar usuário...");
            // Criar usuário no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Usuário criado com sucesso:", user.uid);

            console.log("Tentando criar documento no Firestore...");
            // Criar documento do usuário no Firestore
            await setDoc(doc(db, "users", user.uid), {
                name,
                email,
                userType,
                babies: [{
                    name: babyName,
                    birthDate,
                    motherName,
                    feedings: {}
                }]
            });
            console.log("Documento criado com sucesso no Firestore");

            // Redirecionar para a página inicial
            window.location.href = 'inicio.html';
        } catch (error) {
            console.error("Erro detalhado ao criar conta:", error);
            alert("Erro ao criar conta: " + error.message);
        }
    });
});
