document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

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
            
            // Pré-selecionar o primeiro bebê
            babySelect.value = "0";
            displayFeedings(0);
        } else {
            feedingList.innerHTML = '<p>Nenhum bebê cadastrado. Por favor, adicione um bebê.</p>';
        }
    }

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

    function startCountdown(lastFeeding) {
        clearInterval(countdownInterval);
        
        if (!lastFeeding) {
            countdownTimer.textContent = 'Nenhuma mamada registrada hoje.';
            return;
        }
        
        function updateCountdown() {
            const now = new Date();
            const lastFeedingTime = new Date(now.toDateString() + ' ' + lastFeeding.startTime);
            const nextFeedingTime = new Date(lastFeedingTime.getTime() + 3 * 60 * 60 * 1000);
            const timeDiff = nextFeedingTime - now;

            if (timeDiff <= 0) {
                clearInterval(countdownInterval);
                countdownTimer.textContent = 'Hora da próxima mamada!';
                return;
            }

            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

            countdownTimer.innerHTML = `
                Próxima mamada prevista para: <strong>${formatTime(nextFeedingTime)}</strong><br>
                Tempo restante: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
            `;
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
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

    function updateUserData() {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        const users = JSON.parse(localStorage.getItem('users'));
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Chamar updateBabySelect() imediatamente após o login
    updateBabySelect();

    babySelect.addEventListener('change', (e) => {
        displayFeedings(e.target.value);
        resetFeedingForm();
    });

    newBabyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const babyName = document.getElementById('newBabyName').value;
        const birthDate = document.getElementById('newBabyBirthDate').value;
        const motherName = document.getElementById('newBabyMotherName').value;

        const newBaby = {
            name: babyName,
            birthDate,
            motherName,
            feedings: {}
        };

        currentUser.babies.push(newBaby);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Atualizar a lista de usuários no localStorage
        const users = JSON.parse(localStorage.getItem('users'));
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));

        updateBabySelect();
        
        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newBabyModal'));
        modal.hide();
        
        newBabyForm.reset();
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
        startTime = Date.now();
        if (isPaused) {
            startTime -= elapsedTime;
            isPaused = false;
        }
        timerInterval = setInterval(updateTimerDisplay, 1000);
        playBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        document.getElementById('startTime').value = new Date().toTimeString().slice(0, 5);
    });

    pauseBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        elapsedTime += Date.now() - startTime;
        isPaused = true;
        playBtn.disabled = false;
        pauseBtn.disabled = true;
    });

    stopBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        const endTime = new Date().toTimeString().slice(0, 5);
        document.getElementById('endTime').value = endTime;
        elapsedTime = 0;
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
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            displayFeedings(babySelect.value);
        }
    }

    setInterval(checkAndClearOldFeedings, 60000); // Verificar a cada minuto

    // Adicionar botão de logout
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Sair';
    logoutBtn.classList.add('btn', 'btn-danger', 'mt-3', 'mb-4', 'btn-logout');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    document.querySelector('.container').appendChild(logoutBtn);

    // Ajuste para telas menores
    if (window.innerWidth <= 768) {
        logoutBtn.style.paddingBottom = '40px';
        logoutBtn.style.marginBottom = '40px';
    }

    // Adicionar evento de escuta para o botão "Cancelar"
    document.addEventListener('click', (e) => {
        if (e.target && e.target.textContent === 'Cancelar' && e.target.type === 'button') {
            cancelEdit();
        }
    });

    // Adicionar evento de clique ao botão Salvar do modal de novo bebê
    document.getElementById('saveBabyBtn').addEventListener('click', function() {
        const babyName = document.getElementById('babyName').value;
        const birthDate = document.getElementById('birthDate').value;
        const motherName = document.getElementById('motherName').value;
        const fatherName = document.getElementById('fatherName').value;

        if (babyName && birthDate && motherName && fatherName) {
            const newBaby = {
                name: babyName,
                birthDate: birthDate,
                mother: motherName,
                father: fatherName,
                feedings: {}
            };

            saveBaby(newBaby);

            // Fechar o modal
            const modalElement = document.getElementById('newBabyModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            modalInstance.hide();

            // Adicionar um evento para quando o modal terminar de fechar
            modalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
                // Remover o backdrop manualmente
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }

                // Restaurar o scroll
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';

                // Remover este event listener para evitar múltiplas chamadas
                modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
            });

            // Limpar o formulário
            newBabyForm.reset();
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

    // Adicionar função para salvar novo bebê
    function saveBaby(newBaby) {
        if (!currentUser.babies) {
            currentUser.babies = [];
        }
        currentUser.babies.push(newBaby);
        updateUserData();
        updateBabySelect();
    }

    const babyListModal = new bootstrap.Modal(document.getElementById('babyListModal'));
    const editBabyModal = new bootstrap.Modal(document.getElementById('editBabyModal'));

    // Função para atualizar a lista de bebês no modal
    function updateBabyList() {
        const babyListContainer = document.getElementById('babyListContainer');
        babyListContainer.innerHTML = '';

        if (currentUser.babies && currentUser.babies.length > 0) {
            currentUser.babies.forEach((baby, index) => {
                const babyItem = document.createElement('div');
                babyItem.classList.add('baby-item', 'mb-2', 'p-2', 'border', 'rounded');
                babyItem.innerHTML = `
                    <strong>${baby.name}</strong>
                    <div class="float-end">
                        <button class="btn btn-sm btn-primary edit-baby" data-index="${index}">Editar</button>
                        <button class="btn btn-sm btn-danger delete-baby" data-index="${index}">Excluir</button>
                        <button class="btn btn-sm btn-success select-baby" data-index="${index}">Selecionar</button>
                    </div>
                `;
                babyListContainer.appendChild(babyItem);
            });

            // Adicionar event listeners para os botões
            document.querySelectorAll('.edit-baby').forEach(btn => {
                btn.addEventListener('click', editBaby);
            });
            document.querySelectorAll('.delete-baby').forEach(btn => {
                btn.addEventListener('click', deleteBaby);
            });
            document.querySelectorAll('.select-baby').forEach(btn => {
                btn.addEventListener('click', selectBaby);
            });
        } else {
            babyListContainer.innerHTML = '<p>Nenhum bebê cadastrado.</p>';
        }
    }

    // Função para editar um bebê
    function editBaby(event) {
        const index = event.target.dataset.index;
        const baby = currentUser.babies[index];

        document.getElementById('editBabyIndex').value = index;
        document.getElementById('editBabyName').value = baby.name;
        document.getElementById('editBirthDate').value = baby.birthDate;
        document.getElementById('editMotherName').value = baby.mother;
        document.getElementById('editFatherName').value = baby.father;

        babyListModal.hide();
        editBabyModal.show();
    }

    // Função para salvar as edições do bebê
    document.getElementById('saveEditBabyBtn').addEventListener('click', () => {
        const index = document.getElementById('editBabyIndex').value;
        const editedBaby = {
            name: document.getElementById('editBabyName').value,
            birthDate: document.getElementById('editBirthDate').value,
            mother: document.getElementById('editMotherName').value,
            father: document.getElementById('editFatherName').value,
            feedings: currentUser.babies[index].feedings
        };

        currentUser.babies[index] = editedBaby;
        updateUserData();
        updateBabySelect();
        updateBabyList();
        editBabyModal.hide();
        babyListModal.show();
    });

    // Função para excluir um bebê
    function deleteBaby(event) {
        const index = event.target.dataset.index;
        const deletedBaby = currentUser.babies.splice(index, 1)[0];
        updateUserData();
        updateBabySelect();
        updateBabyList();
        
        // Verifica se o bebê excluído era o selecionado
        if (babySelect.value === index.toString()) {
            babySelect.value = '';
            selectedBabyName.textContent = 'Nenhum bebê selecionado';
            displayFeedings(); // Limpa a lista de mamadas
        } else if (parseInt(babySelect.value) > index) {
            // Ajusta o índice selecionado se um bebê anterior foi removido
            babySelect.value = (parseInt(babySelect.value) - 1).toString();
        }
        
        if (currentUser.babies.length === 0) {
            babySelect.value = '';
            selectedBabyName.textContent = 'Nenhum bebê selecionado';
            displayFeedings();
        }
        
        // Fechar o modal da lista de bebês
        const babyListModal = bootstrap.Modal.getInstance(document.getElementById('babyListModal'));
        if (babyListModal) {
            babyListModal.hide();
        }
    }

    // Função para selecionar um bebê
    function selectBaby(event) {
        const index = event.target.dataset.index;
        babySelect.value = index;
        const baby = currentUser.babies[index];
        selectedBabyName.textContent = `Bebê selecionado: ${baby.name}`;
        displayFeedings(index);

        // Fechar o modal
        const modalElement = document.getElementById('babyListModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();

        // Adicionar um evento para quando o modal terminar de fechar
        modalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
            // Remover o backdrop manualmente
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }

            // Restaurar o scroll
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            // Remover este event listener para evitar múltiplas chamadas
            modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
        });
    }

    // Atualizar a lista de bebês quando o modal for aberto
    document.getElementById('babyListModal').addEventListener('show.bs.modal', updateBabyList);

    // Verificar se há um bebê selecionado ao carregar a página
    if (currentUser.babies && currentUser.babies.length > 0) {
        selectBaby({ target: { dataset: { index: '0' } } });
    } else {
        selectedBabyName.textContent = 'Nenhum bebê selecionado';
    }
});

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service worker registrado', reg))
        .catch((err) => console.log('Erro ao registrar service worker', err));
}


