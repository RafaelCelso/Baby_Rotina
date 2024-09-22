import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const currentUser = userDoc.data();
            
            // Adicionar a saudação personalizada
            const userGreeting = document.getElementById('userGreeting');
            userGreeting.innerHTML = `<h3>Olá, ${currentUser.name} 👋</h3>`;

            const feedingForm = document.getElementById('feedingForm');
            const feedingList = document.getElementById('feedingList');
            const newBabyForm = document.getElementById('newBabyForm');
            const saveBabyBtn = document.getElementById('saveBabyBtn');
            const babySelect = document.getElementById('babySelect');
            const dateSelect = document.getElementById('dateSelect');
            const totalFormula = document.getElementById('totalFormula');
            const selectedBabyName = document.getElementById('selectedBabyName');
            const countdownTimer = document.createElement('div');
            countdownTimer.classList.add('alert', 'alert-warning', 'mt-3');
            
            let countdownInterval;
            let selectedDate = new Date().toISOString().split('T')[0];

            function updateBabySelect() {
                babySelect.innerHTML = '<option value="">Escolha um bebê</option>';
                if (currentUser.babies && currentUser.babies.length > 0) {
                    currentUser.babies.forEach((baby, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = baby.name;
                        babySelect.appendChild(option);
                    });
                    
                    // Selecionar o bebê salvo no perfil do usuário
                    const selectedIndex = currentUser.selectedBabyIndex || 0;
                    babySelect.value = selectedIndex.toString();
                    displayFeedings(selectedIndex);
                    selectedBabyName.textContent = currentUser.babies[selectedIndex].name;
                } else {
                    feedingList.innerHTML = '<p>Nenhum bebê cadastrado. Por favor, adicione um bebê.</p>';
                    selectedBabyName.textContent = 'Nenhum bebê selecionado';
                }
            }

            // Chamar updateBabySelect() imediatamente após carregar os dados do usuário
            updateBabySelect();

            // Inicializar o calendário
            flatpickr(dateSelect, {
                dateFormat: "d/m/Y",
                defaultDate: "today",
                onChange: function(selectedDates, dateStr) {
                    selectedDate = selectedDates[0].toISOString().split('T')[0];
                    displayFeedings(babySelect.value);
                }
            });

            function formatTime(date) {
                return date.toTimeString().slice(0, 5);
            }

            function calculateDuration(startTime, endTime) {
                const start = new Date(`1970-01-01T${startTime}`);
                const end = new Date(`1970-01-01T${endTime}`);
                const diff = end - start;
                const hours = Math.floor(diff / 3600000); // 1 hora = 3600000 milissegundos
                const minutes = Math.floor((diff % 3600000) / 60000); // 1 minuto = 60000 milissegundos
                
                return { hours, minutes, totalMinutes: hours * 60 + minutes };
            }

            function formatDuration(duration) {
                if (duration.hours > 0) {
                    return `${duration.hours}h ${duration.minutes}min`;
                } else {
                    return `${duration.minutes}min`;
                }
            }

            function displayFeedings(babyIndex) {
                feedingList.innerHTML = '';
                totalFormula.innerHTML = '';
                if (babyIndex === '') return;

                const baby = currentUser.babies[babyIndex];
                if (!baby.feedings) baby.feedings = {};
                if (!baby.feedings[selectedDate]) baby.feedings[selectedDate] = [];

                const todayFeedings = baby.feedings[selectedDate];
                todayFeedings.sort((a, b) => new Date(`1970-01-01T${a.startTime}`) - new Date(`1970-01-01T${b.startTime}`));

                let totalFormulaAmount = 0;
                let totalDurationMinutes = 0;

                for (let i = 0; i < todayFeedings.length; i++) {
                    const feeding = todayFeedings[i];
                    const feedingEntry = document.createElement('div');
                    feedingEntry.classList.add('alert', 'alert-info', 'mt-2');
                    
                    const duration = calculateDuration(feeding.startTime, feeding.endTime);
                    totalDurationMinutes += duration.totalMinutes;

                    let feedingContent = `
                        Início: ${feeding.startTime} - Fim: ${feeding.endTime}<br>
                        Duração: ${formatDuration(duration)}<br>
                        Fórmula: ${feeding.formulaAmount || 0} ml
                        <div class="mt-2">
                            <button class="btn btn-sm btn-primary edit-feeding" data-index="${i}">Editar</button>
                            <button class="btn btn-sm btn-danger delete-feeding" data-index="${i}">Excluir</button>
                        </div>
                    `;

                    if (i > 0) {
                        const previousFeeding = todayFeedings[i - 1];
                        const currentFeedingTime = new Date(`1970-01-01T${feeding.startTime}`);
                        const previousFeedingTime = new Date(`1970-01-01T${previousFeeding.startTime}`);
                        const timeDiff = (currentFeedingTime - previousFeedingTime) / (1000 * 60 * 60); // Diferença em horas

                        if (timeDiff < 3) {
                            feedingContent += `
                                <div class="alert alert-danger mt-2 mb-0">
                                    Atenção: Esta mamada ocorreu ${timeDiff.toFixed(2)} horas após a anterior, menos que o intervalo recomendado de 3 horas.
                                </div>
                            `;
                        }
                    }

                    feedingEntry.innerHTML = feedingContent;
                    feedingList.appendChild(feedingEntry);

                    totalFormulaAmount += feeding.formulaAmount || 0;
                }

                const averageDurationMinutes = totalDurationMinutes / todayFeedings.length;
                const averageDuration = {
                    hours: Math.floor(averageDurationMinutes / 60),
                    minutes: Math.round(averageDurationMinutes % 60)
                };

                totalFormula.innerHTML = `
                    <strong>Resumo do dia:</strong><br>
                    Total de fórmula consumida: ${totalFormulaAmount} ml<br>
                    Tempo médio de mamada: ${formatDuration(averageDuration)}
                `;

                if (selectedDate === new Date().toISOString().split('T')[0]) {
                    feedingList.appendChild(countdownTimer);
                    startCountdown(todayFeedings[todayFeedings.length - 1]);
                }

                // Adicionar event listeners para os botões de editar e excluir
                document.querySelectorAll('.edit-feeding').forEach(button => {
                    button.addEventListener('click', editFeeding);
                });

                document.querySelectorAll('.delete-feeding').forEach(button => {
                    button.addEventListener('click', deleteFeeding);
                });
            }

            function updateCountdown(nextFeedingTime) {
                const now = new Date();
                const timeDiff = nextFeedingTime - now;

                if (timeDiff > 0) {
                    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                    countdownTimer.textContent = `Próxima mamada em ${hours}h ${minutes}m`;
                    countdownTimer.classList.remove('alert-danger');
                    countdownTimer.classList.add('alert-warning');
                } else {
                    const elapsedTime = Math.abs(timeDiff);
                    const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
                    const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
                    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    countdownTimer.innerHTML = `
                        Hora prevista da mamada: ${nextFeedingTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        <br>
                        Tempo ultrapassado: ${formattedTime}
                    `;
                    countdownTimer.classList.remove('alert-warning');
                    countdownTimer.classList.add('alert-danger');
                }
            }

            function startCountdown(lastFeeding) {
                clearInterval(countdownInterval);
                
                if (!lastFeeding) {
                    countdownTimer.textContent = 'Nenhuma mamada registrada hoje.';
                    return;
                }
                
                const lastFeedingTime = new Date(selectedDate + 'T' + lastFeeding.startTime);
                const nextFeedingTime = new Date(lastFeedingTime.getTime() + 3 * 60 * 60 * 1000);
                
                function updateTimer() {
                    updateCountdown(nextFeedingTime);
                }

                updateTimer(); // Atualiza imediatamente
                countdownInterval = setInterval(updateTimer, 1000); // Atualiza a cada segundo
            }

            function editFeeding(event) {
                const index = event.target.dataset.index;
                const babyIndex = babySelect.value;
                const baby = currentUser.babies[babyIndex];
                const feeding = baby.feedings[selectedDate][index];

                document.getElementById('startTime').value = feeding.startTime;
                document.getElementById('endTime').value = feeding.endTime;
                document.getElementById('formulaAmount').value = feeding.formulaAmount || '';

                // Atualizar o formulário para modo de edição
                const submitButton = feedingForm.querySelector('button[type="submit"]');
                submitButton.textContent = 'Atualizar Mamada';
                submitButton.dataset.editIndex = index;

                // Adicionar botão "Cancelar"
                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Cancelar';
                cancelButton.type = 'button';
                cancelButton.classList.add('btn', 'btn-secondary', 'ms-2');
                cancelButton.addEventListener('click', cancelEdit);
                submitButton.parentNode.insertBefore(cancelButton, submitButton.nextSibling);

                // Rolar até o formulário
                feedingForm.scrollIntoView({ behavior: 'smooth' });
            }

            function cancelEdit() {
                const submitButton = feedingForm.querySelector('button[type="submit"]');
                submitButton.textContent = 'Registrar Mamada';
                delete submitButton.dataset.editIndex;

                // Remover o botão "Cancelar"
                const cancelButton = feedingForm.querySelector('button[type="button"]');
                if (cancelButton) {
                    cancelButton.remove();
                }

                // Limpar o formulário
                feedingForm.reset();
            }

            function deleteFeeding(event) {
                const index = event.target.dataset.index;
                const babyIndex = babySelect.value;
                
                const deletedFeeding = currentUser.babies[babyIndex].feedings[selectedDate].splice(index, 1)[0];
                updateUserData();
                displayFeedings(babyIndex);
            }

            async function updateUserData() {
                await updateDoc(doc(db, "users", user.uid), currentUser);
            }

            babySelect.addEventListener('change', (e) => {
                displayFeedings(e.target.value);
                resetFeedingForm();
            });

            const playerContainer = document.createElement('div');
            playerContainer.classList.add('player-container', 'mt-5', 'mb-5', 'p-4', 'bg-light', 'rounded', 'shadow-lg', 'text-center');
            playerContainer.innerHTML = `
                <div class="timer-display mb-3">
                    <span id="timer" class="display-1 fw-bold text-primary">00:00:00</span>
                </div>
                <div class="btn-group" role="group" aria-label="Controles do cronômetro">
                    <button id="playBtn" class="btn btn-success btn-lg"><i class="fas fa-play"></i></button>
                    <button id="pauseBtn" class="btn btn-warning btn-lg" disabled><i class="fas fa-pause"></i></button>
                    <button id="stopBtn" class="btn btn-danger btn-lg" disabled><i class="fas fa-stop"></i></button>
                </div>
            `;
            feedingForm.parentNode.insertBefore(playerContainer, feedingForm);

            const playBtn = document.getElementById('playBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            const stopBtn = document.getElementById('stopBtn');
            const timerDisplay = document.getElementById('timer');

            let startTime;
            let elapsedTime = 0;
            let timerInterval;
            let isPaused = false;

            function updateTimerDisplay() {
                const currentTime = Date.now();
                const totalElapsedTime = isPaused ? elapsedTime : elapsedTime + (currentTime - startTime);
                const hours = Math.floor(totalElapsedTime / 3600000);
                const minutes = Math.floor((totalElapsedTime % 3600000) / 60000);
                const seconds = Math.floor((totalElapsedTime % 60000) / 1000);
                timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }

            playBtn.addEventListener('click', () => {
                if (!startTime) {
                    startTime = Date.now();
                } else if (isPaused) {
                    startTime = Date.now() - elapsedTime;
                }
                isPaused = false;
                timerInterval = setInterval(updateTimerDisplay, 1000);
                playBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
                document.getElementById('startTime').value = new Date().toTimeString().slice(0, 5);
            });

            pauseBtn.addEventListener('click', () => {
                clearInterval(timerInterval);
                elapsedTime = Date.now() - startTime;
                isPaused = true;
                playBtn.disabled = false;
                pauseBtn.disabled = true;
            });

            stopBtn.addEventListener('click', () => {
                clearInterval(timerInterval);
                const endTime = new Date().toTimeString().slice(0, 5);
                document.getElementById('endTime').value = endTime;
                elapsedTime = 0;
                startTime = null;
                isPaused = false;
                timerDisplay.textContent = '00:00:00';
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = true;
            });

            // Modificar o evento de submit do feedingForm
            feedingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const selectedBabyIndex = babySelect.value;
                if (selectedBabyIndex === '') {
                    alert('Por favor, selecione um bebê');
                    return;
                }

                const baby = currentUser.babies[selectedBabyIndex];
                const startTime = document.getElementById('startTime').value;
                const endTime = document.getElementById('endTime').value;
                const formulaAmount = parseInt(document.getElementById('formulaAmount').value) || 0;

                if (!startTime || !endTime) {
                    alert('Por favor, use o player para registrar os horários de início e fim da mamada');
                    return;
                }

                const newFeeding = {
                    startTime,
                    endTime,
                    formulaAmount
                };

                if (!baby.feedings) baby.feedings = {};
                if (!baby.feedings[selectedDate]) baby.feedings[selectedDate] = [];

                const submitButton = feedingForm.querySelector('button[type="submit"]');
                const editIndex = submitButton.dataset.editIndex;

                if (editIndex !== undefined) {
                    // Atualizar o registro existente
                    baby.feedings[selectedDate][editIndex] = newFeeding;
                } else {
                    // Adicionar novo registro
                    baby.feedings[selectedDate].push(newFeeding);
                }

                updateUserData();
                displayFeedings(selectedBabyIndex);
                resetFeedingForm();
                timerDisplay.textContent = '00:00:00';
            });

            // Verificar e limpar mamadas antigas à meia-noite
            function checkAndClearOldFeedings() {
                const now = new Date();
                if (now.getHours() === 0 && now.getMinutes() === 0) {
                    const today = now.toISOString().split('T')[0];
                    currentUser.babies.forEach(baby => {
                        if (baby.feedings[today]) {
                            delete baby.feedings[today];
                        }
                    });
                    updateUserData();
                    displayFeedings(babySelect.value);
                }
            }

            setInterval(checkAndClearOldFeedings, 60000); // Verificar a cada minuto

            // Adicionar botão de logout ao menu
            const navbarContainer = document.querySelector('.navbar > .container');
            const logoutLink = document.getElementById('logoutLink');
            const logoutLinkMobile = document.getElementById('logoutLinkMobile');
            const navbarCollapse = document.querySelector('.navbar-collapse');

            function moveLogoutButton() {
                if (window.innerWidth < 992) {
                    navbarCollapse.appendChild(logoutLinkMobile);
                } else {
                    navbarContainer.appendChild(logoutLink);
                }
            }

            // Chamar a função inicialmente e adicionar um listener para redimensionamento
            moveLogoutButton();
            window.addEventListener('resize', moveLogoutButton);

            function logout(e) {
                e.preventDefault();
                signOut(auth).then(() => {
                    console.log('Usuário deslogado com sucesso');
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error("Erro ao fazer logout:", error);
                });
            }

            // Adicionar funcionalidade de logout para ambos os links
            if (logoutLink) {
                logoutLink.addEventListener('click', logout);
            }
            if (logoutLinkMobile) {
                logoutLinkMobile.addEventListener('click', logout);
            }

            // Ajuste para telas menores
            if (window.innerWidth <= 768) {
                logoutLink.style.paddingBottom = '8px';
                logoutLink.style.marginBottom = '8px';
            }

            // Adicionar evento de escuta para o botão "Cancelar"
            document.addEventListener('click', (e) => {
                if (e.target && e.target.textContent === 'Cancelar' && e.target.type === 'button') {
                    cancelEdit();
                }
            });

            const newBabyModal = new bootstrap.Modal(document.getElementById('newBabyModal'));
            const babyListModal = new bootstrap.Modal(document.getElementById('babyListModal'));
            const editBabyModal = new bootstrap.Modal(document.getElementById('editBabyModal'));
            const editBabyConfirmationModal = new bootstrap.Modal(document.getElementById('editBabyConfirmationModal'));
            const deleteBabyConfirmationModal = new bootstrap.Modal(document.getElementById('deleteBabyConfirmationModal'));
            const deleteBabySuccessModal = new bootstrap.Modal(document.getElementById('deleteBabySuccessModal'));
            const babyListElement = document.getElementById('babyList');
            const editBabyForm = document.getElementById('editBabyForm');
            const saveEditBabyBtn = document.getElementById('saveEditBabyBtn');
            const editConfirmationOkBtn = document.getElementById('editConfirmationOkBtn');
            const confirmDeleteBabyBtn = document.getElementById('confirmDeleteBabyBtn');
            const babyNameToDeleteElement = document.getElementById('babyNameToDelete');

            let babyToDeleteIndex = -1;

            function updateBabyList() {
                babyListElement.innerHTML = '';
                if (currentUser.babies && currentUser.babies.length > 0) {
                    currentUser.babies.forEach((baby, index) => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        li.innerHTML = `
                            <span>${baby.name}</span>
                            <div>
                                <button class="btn btn-sm btn-primary edit-baby" data-index="${index}">Editar</button>
                                <button class="btn btn-sm btn-danger delete-baby" data-index="${index}">Excluir</button>
                            </div>
                        `;
                        babyListElement.appendChild(li);
                    });
                } else {
                    babyListElement.innerHTML = '<li class="list-group-item">Nenhum bebê cadastrado.</li>';
                }
            }

            // Atualizar a lista de bebês quando o modal for aberto
            document.getElementById('babyListModal').addEventListener('show.bs.modal', updateBabyList);

            babyListElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-baby')) {
                    const index = e.target.dataset.index;
                    const baby = currentUser.babies[index];
                    document.getElementById('editBabyIndex').value = index;
                    document.getElementById('editBabyName').value = baby.name;
                    document.getElementById('editBirthDate').value = baby.birthDate;
                    document.getElementById('editMotherName').value = baby.motherName;
                    babyListModal.hide();
                    editBabyModal.show();
                } else if (e.target.classList.contains('delete-baby')) {
                    babyToDeleteIndex = e.target.dataset.index;
                    const babyName = currentUser.babies[babyToDeleteIndex].name;
                    babyNameToDeleteElement.textContent = babyName;
                    babyListModal.hide();
                    deleteBabyConfirmationModal.show();
                }
            });

            confirmDeleteBabyBtn.addEventListener('click', async () => {
                if (babyToDeleteIndex !== -1) {
                    currentUser.babies.splice(babyToDeleteIndex, 1);
                    try {
                        await updateDoc(doc(db, "users", user.uid), {
                            babies: currentUser.babies
                        });
                        updateBabyList();
                        updateBabySelect();
                        deleteBabyConfirmationModal.hide();
                        deleteBabySuccessModal.show();
                    } catch (error) {
                        console.error("Erro ao excluir bebê:", error);
                        alert('Erro ao excluir bebê. Por favor, tente novamente.');
                    }
                }
            });

            // Adicionar evento para quando o modal de confirmação de exclusão for fechado
            document.getElementById('deleteBabyConfirmationModal').addEventListener('hidden.bs.modal', () => {
                if (!document.getElementById('deleteBabySuccessModal').classList.contains('show')) {
                    babyListModal.show();
                }
            });

            // Adicionar evento para quando o modal de sucesso de exclusão for fechado
            document.getElementById('deleteBabySuccessModal').addEventListener('hidden.bs.modal', () => {
                babyListModal.show();
            });

            // Adicionar botão de cancelar no modal de confirmação de exclusão
            const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            if (cancelDeleteBtn) {
                cancelDeleteBtn.addEventListener('click', () => {
                    deleteBabyConfirmationModal.hide();
                });
            }

            saveEditBabyBtn.addEventListener('click', async () => {
                const index = document.getElementById('editBabyIndex').value;
                const editedBaby = {
                    name: document.getElementById('editBabyName').value,
                    birthDate: document.getElementById('editBirthDate').value,
                    motherName: document.getElementById('editMotherName').value,
                    feedings: currentUser.babies[index].feedings
                };

                currentUser.babies[index] = editedBaby;

                try {
                    await updateDoc(doc(db, "users", user.uid), {
                        babies: currentUser.babies
                    });

                    updateBabyList();
                    updateBabySelect();
                    editBabyModal.hide();
                    editBabyConfirmationModal.show();
                } catch (error) {
                    console.error("Erro ao atualizar bebê:", error);
                    alert('Erro ao atualizar informações do bebê. Por favor, tente novamente.');
                }
            });

            editConfirmationOkBtn.addEventListener('click', () => {
                editBabyConfirmationModal.hide();
                babyListModal.show();
            });

            saveBabyBtn.addEventListener('click', async () => {
                const babyName = document.getElementById('babyName').value;
                const birthDate = document.getElementById('birthDate').value;
                const motherName = document.getElementById('motherName').value;

                if (babyName && birthDate && motherName) {
                    const newBaby = {
                        name: babyName,
                        birthDate: birthDate,
                        motherName: motherName,
                        feedings: {}
                    };

                    try {
                        // Adicionar o novo bebê ao array de bebês do usuário no Firestore
                        await updateDoc(doc(db, "users", user.uid), {
                            babies: arrayUnion(newBaby)
                        });

                        // Atualizar a lista de bebês na interface
                        currentUser.babies.push(newBaby);
                        updateBabySelect();
                        updateBabyList();

                        // Fechar o modal de cadastro e limpar o formulário
                        newBabyModal.hide();
                        newBabyForm.reset();

                        // Exibir o modal de confirmação
                        babyConfirmationModal.show();
                    } catch (error) {
                        console.error("Erro ao adicionar bebê:", error);
                        alert('Erro ao adicionar bebê. Por favor, tente novamente.');
                    }
                } else {
                    alert('Por favor, preencha todos os campos.');
                }
            });

            function resetFeedingForm() {
                feedingForm.reset();
                const submitButton = feedingForm.querySelector('button[type="submit"]');
                submitButton.textContent = 'Registrar Mamada';
                delete submitButton.dataset.editIndex;

                // Remover o botão "Cancelar" se existir
                const cancelButton = feedingForm.querySelector('button[type="button"]');
                if (cancelButton) {
                    cancelButton.remove();
                }
            }

            // Registro do Service Worker para PWA
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then((reg) => console.log('Service worker registrado', reg))
                    .catch((err) => console.log('Erro ao registrar service worker', err));
            }
        } else {
            window.location.href = 'login.html';
        }
    });
});


