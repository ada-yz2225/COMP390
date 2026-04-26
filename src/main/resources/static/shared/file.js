document.addEventListener('DOMContentLoaded', () =>{
    loadFileData();

    document.getElementById('new-button').addEventListener('click', showNewModal);

    document.getElementById('search-button').addEventListener('click', loadFileData);

    document.getElementById('modify-selected').addEventListener('click', handleEditFile);

    document.getElementById('delete-selected').addEventListener('click', handleDelete);
});

async function loadFileData(){
    const getFileDTO = {
        filename: document.getElementById('filename')?.value|| null,
        creator: document.getElementById('creator')?.value|| null,
        createTimeStart: document.getElementById('create-time-start')?.value
            ? formatDate(document.getElementById('create-time-start').value)
            : null,
        createTimeEnd: document.getElementById('create-time-end')?.value
            ? formatDate(document.getElementById('create-time-end').value)
            : null,
        permission: document.getElementById('permission')?.value|| null
    };
    try {
        const response = await fetchWithAuth('/file/getFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(getFileDTO)
        });
        const result = await response.json();

        if(result.code === 1){
            renderUserTable(result.data);
        } else {
            alert(result.message || 'Query failed, please contact admin.');
        }
    } catch (error){
        console.error('Query error:', error);
        alert('Network error, please try again later.');
    }
}

function renderUserTable(files) {
    const tableBody = document.getElementById('file-table').querySelector('tbody');
    tableBody.innerHTML = '';
    files.forEach(file => {
        const row = `
            <tr>
                <td><input type="checkbox" data-id="${file.id}"></td>
                <td>${file.id}</td>
                <td>${file.filename}</td>
                <td>${file.creator}</td>
                <td>${file.privacyBudget}</td>
                <td>${formatDate(file.createTime)}</td>
                <td>${file.permission}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function showNewModal() {
    const newModal = document.getElementById('new-modal');
    newModal.style.display = 'block';

    document.getElementById('new-confirm').onclick = async () => {
        const fileInput = document.getElementById('file-upload');
        const privacyBudget = document.getElementById('new-privacyBudget').value;
        const permission = document.getElementById('new-permission').value;

        if (!fileInput.files[0] || !privacyBudget || !permission) {
            alert('All fields are required!');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('privacyBudget', privacyBudget);
        formData.append('permission', permission);

        try {
            const response = await fetchWithAuthMultipart('/file/uploadFile', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.code === 1) {
                alert('File uploaded success');
                newModal.style.display = 'none';
                loadFileData();
            } else {
                alert(result.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Network error, please try again later.');
        }
    };

    document.getElementById('new-cancel').onclick = () => {
        document.getElementById('new-modal').style.display = 'none';
    };
}

function getSelectedFiles() {
    return Array.from(document.querySelectorAll('tbody input[type="checkbox"]:checked'))
        .map(input => input.dataset.id);
}

async function handleEditFile() {
    const selected = getSelectedFiles();
    if(selected.length !== 1){
        alert('Change one file per time.');
        return;
    }
    const fileId = selected[0];
    showEditModal(fileId);
}

function resetEditModal() {
    document.getElementById('edit-filename').value = '';
    document.getElementById('edit-privacyBudget').value = '';
    document.getElementById('edit-permission').value = 'NO';
}

async function showEditModal(id){
    resetEditModal();
    document.getElementById('edit-modal').style.display = 'block';

    try {

        const response = await fetchWithAuth(`/file/getFile/${id}`, {
            method: 'GET'
        });
        const result = await response.json();

        if (result.code === 1) {
            const fileData = result.data;


            document.getElementById('edit-filename').value = fileData.filename;
            document.getElementById('edit-privacyBudget').value = fileData.privacyBudget;
            document.getElementById('edit-permission').value = fileData.permission;
        } else {
            alert(result.message || 'Failed to fetch file details.');
        }
    } catch (error) {
        console.error('Failed to fetch file details:', error);
        alert('Network error, please try again later.');
    }

    document.getElementById('edit-confirm').onclick = async () => {
        const filename = document.getElementById('edit-filename').value.trim();
        const permission = document.getElementById('edit-permission').value;
        const privacyBudget = document.getElementById('edit-privacyBudget').value;
        if(!filename || !permission || !privacyBudget){
            alert("File name and permission cannot be empty!");
            return;
        }
        try {
            const response = await fetchWithAuth('/file/editFile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, filename, permission, privacyBudget})
            });
            const result = await response.json();
            if(result.code === 1){
                alert('Edit success');
                document.getElementById('edit-modal').style.display = 'none';
                loadFileData();
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
    const selected = getSelectedFiles();
    if(selected.length === 0){
        alert('Please select a user to delete');
        return;
    }
    deleteFiles(selected);
}

async function deleteFiles(id){
    try{
        const response = await fetchWithAuth('/file/deleteFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(id)
        });
        const result = await response.json();
        if(result.code === 1){
            alert('Deleted');
            loadFileData();
        } else {
            alert(result.message || 'Deletion failed');
        }
    } catch (error) {
        console.error('Deletion failed:', error);
        alert('Network error, please try again later.');
    }
}
