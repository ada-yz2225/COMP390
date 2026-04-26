document.addEventListener('DOMContentLoaded', () => {

    loadAlgorithmData();

    document.getElementById('search-button').addEventListener('click', loadAlgorithmData);

    document.getElementById('modify-selected').addEventListener('click', handleEditAlgorithm);

    document.getElementById('delete-selected').addEventListener('click', handleDelete);

    document.getElementById('add-algorithm').addEventListener('click', showNewNodal);
});

async function loadAlgorithmData() {
    const getAlgorithmDTO = {
        name: document.getElementById('algorithm-name')?.value|| null,
        creator: document.getElementById('creator')?.value|| null,
        createTimeStart: document.getElementById('create-time-start')?.value
            ? formatDate(document.getElementById('create-time-start').value)
            : null,
        createTimeEnd: document.getElementById('create-time-end')?.value
            ? formatDate(document.getElementById('create-time-end').value)
            : null,
        status: document.getElementById('status')?.value|| null
    };
    try{
        const response = await fetchWithAuth('/algorithm/getAlgorithms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(getAlgorithmDTO)
        });
        const result = await response.json();

        if(result.code === 1){
            renderAlgorithmTable(result.data);
        } else {
            alert(result.message || 'Query failed, please contact admin.');
        }
    } catch (error){
        console.error('Query error:', error);
        alert('Network error, please try again later.');
    }
}

function renderAlgorithmTable(algorithms){
    const tableBody = document.getElementById('algorithm-table').querySelector('tbody');
    tableBody.innerHTML = '';
    algorithms.forEach(algorithm => {
        const row = `
            <tr>
                <td><input type="checkbox" data-id="${algorithm.id}"></td>
                <td>${algorithm.id}</td>
                <td>${algorithm.name}</td>
                <td>${algorithm.description}</td>
                <td>${algorithm.creator}</td>
                <td>${formatDate(algorithm.createTime)}</td>
                <td>${algorithm.status}</td>
            </tr>
        `
        tableBody.innerHTML += row;
    })
}

function showNewNodal() {
    const newModal = document.getElementById('add-modal');
    newModal.style.display = 'block';

    // 绑定确认和取消按钮事件
    document.getElementById('add-confirm').onclick = handleAddAlgorithm;
    document.getElementById('add-cancel').onclick = () => {
        newModal.style.display = 'none';
    };
}

async function handleAddAlgorithm() {
    const name = document.getElementById('add-algorithm-name').value.trim();
    const description = document.getElementById('add-description').value;
    const className = document.getElementById('add-class-name').value.trim();
    const functionName = document.getElementById('add-function-name').value.trim();
    const status = document.getElementById('add-status').value.trim();

    if(!name || !description || !functionName || !status){
        alert("All fields are required!");
        return;
    }

    document.getElementById('add-modal').style.display = 'none';
    try {
        const response = await fetchWithAuth('/algorithm/addAlgorithm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description, className, functionName, status })
        });
        const result = await response.json()
        if (result.code === 1) {
            alert('Create successfully');
            loadAlgorithmData();
        } else {
            alert(result.message || 'Create failed');
        }
    } catch (error) {
        console.error('Create failed:', error);
        alert('Network error, please try again later.');
    }
}

function getSelectedAlgorithms() {
    return Array.from(document.querySelectorAll('tbody input[type="checkbox"]:checked'))
        .map(input => input.dataset.id);
}

async function handleEditAlgorithm() {
    const selected = getSelectedAlgorithms();
    if(selected.length !== 1){
        alert('Change one file per time.');
        return;
    }
    const algorithmId = selected[0];
    showEditModal(algorithmId);
}

function resetEditModal(){
    document.getElementById('edit-algorithm-name').value = '';
    document.getElementById('edit-description').value = '';
    document.getElementById('edit-function-name').value = '';
    document.getElementById('edit-class-name').value = '';
    document.getElementById('edit-status').value = 'INACTIVE';
}

async function showEditModal(id){
    resetEditModal();
    document.getElementById('edit-modal').style.display = 'block';

    try{
        const response = await fetchWithAuth(`/algorithm/getAlgorithm/${id}`,{
            method: 'GET'
        });
        const result = await response.json();

        if(result.code === 1){
            const algorithmData = result.data;
            document.getElementById('edit-algorithm-name').value = algorithmData.name;
            document.getElementById('edit-description').value = algorithmData.description;
            document.getElementById('edit-class-name').value = algorithmData.className;
            document.getElementById('edit-function-name').value = algorithmData.functionName;
            document.getElementById('edit-status').value = algorithmData.status;
            document.getElementById('edit-class-name').value = algorithmData.className;
        } else {
            alert(result.message || 'Failed to fetch file details.');
        }
    } catch (error) {
        console.error('Failed to fetch file details:', error);
        alert('Network error, please try again later.');
    }

    document.getElementById('edit-confirm').onclick = async () => {
        const name = document.getElementById('edit-algorithm-name').value.trim();
        const description = document.getElementById('edit-description').value;
        const className = document.getElementById('edit-class-name').value.trim();
        const functionName = document.getElementById('edit-function-name').value.trim();
        const status = document.getElementById('edit-status').value.trim();

        if(!name || !description || !functionName || !status){
            alert("File name, epsilon, and permission cannot be empty!");
            return;
        }
        try {
            const response = await fetchWithAuth('/algorithm/editAlgorithm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, name, description, className, functionName, status })
            });
            const result = await response.json();
            if(result.code === 1){
                alert('Edit successfully');
                document.getElementById('edit-modal').style.display = 'none';
                loadAlgorithmData();
            } else {
                alert(result.message || 'Edit failed');
            }
        } catch (error){
            console.error('Edit failed:', error);
            alert('Network error, please try again later.');
        }
    }

    document.getElementById('edit-cancel').onclick = () => {
        document.getElementById('edit-modal').style.display = 'none';
    };
}

function handleDelete() {
    const selected = getSelectedAlgorithms();
    if(selected.length === 0){
        alert('Please select a user to delete');
        return;
    }
    deleteAlgorithms(selected);
}

async function deleteAlgorithms(id) {
    try{
        const response = await fetchWithAuth('/algorithm/deleteAlgorithms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(id)
        });
        const result = await response.json();
        if(result.code === 1){
            alert('Deleted');
            loadAlgorithmData();
        } else {
            alert(result.message || 'Deletion failed');
        }
    } catch (error) {
        console.error('Deletion failed:', error);
        alert('Network error, please try again later.');
    }
}











