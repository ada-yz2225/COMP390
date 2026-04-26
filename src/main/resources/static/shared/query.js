let selectedFileId = null;
let selectedAlgorithmId = null;
let columnNames = [];

const conditionalToggle = document.getElementById('toggle-conditional-query');
const parallelToggle = document.getElementById('toggle-parallel-query');

if (conditionalToggle) {
    conditionalToggle.style.display = 'block';
}
if (parallelToggle) {
    parallelToggle.style.display = 'block';
}

document.getElementById('file-search-button')?.addEventListener('click', async () => {
    const filename = document.getElementById('file-name').value.trim();

    try {
        const response = await fetchWithAuth('/file/getFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename })
        });

        const result = await response.json();

        if (result.code === 1) {
            renderFileOutput(result.data);
        } else {
            document.getElementById('output').innerText = `Error: ${result.message}`;
        }
    } catch (error) {
        document.getElementById('output').innerText = 'Network error. Please try again later.';
    }
});

document.getElementById('algorithm-search-button')?.addEventListener('click', async () => {
    const name = document.getElementById('algorithm-name').value.trim();

    try {
        const response = await fetchWithAuth('/algorithm/getAlgorithms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        const result = await response.json();

        if (result.code === 1) {
            renderAlgorithmOutput(result.data);
        } else {
            document.getElementById('output').innerText = `Error: ${result.message}`;
        }
    } catch (error) {
        document.getElementById('output').innerText = 'Network error. Please try again later.';
    }
});

function removeModal(){

    document.querySelectorAll('#column-filters input').forEach(input => {
        input.value = null;
    });
    document.querySelectorAll('#column-subsets input').forEach(input => {
        input.value = null;
    });

    document.querySelectorAll('#column-filters select').forEach(select => {
        select.selectedIndex = 0;
    });

    const epsilon = document.getElementById('epsilon');
    const parallelEpsilon = document.getElementById('parallel-epsilon');
    if (epsilon) {
        epsilon.value = null;
    }
    if (parallelEpsilon) {
        parallelEpsilon.value = null;
    }
}

async function fetchColumnFilters() {
    if (!selectedFileId) return;
    try {
        const response = await fetchWithAuth(`/query/getFileColumns/${selectedFileId}`);
        const result = await response.json();
        if (result.code === 1) {
            columnNames = result.data;

        }
    } catch (error) {
        alert('Failed to load columns.');
    }
}

async function fetchPrivacyBudget(){
    if (!selectedFileId) return;
    try {
        const response = await fetchWithAuth(`/query/getBudget/${selectedFileId}`);

        const result = await response.json();
        if(result.code === 1){
            document.getElementById('privacy-budget-value').innerText = result.data.toFixed(2);
            document.getElementById('privacy-budget-box').style.display = 'block';
        } else {
            document.getElementById('privacy-budget-value').innerText = 'Error';
            document.getElementById('privacy-budget-box').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('privacy-budget-value').innerText = 'Failed';
        document.getElementById('privacy-budget-box').style.display = 'block';
    }
}

document.getElementById('toggle-conditional-query')?.addEventListener('click', () => {
    const section = document.getElementById('conditional-query-section');

    if (section.style.display === 'none' || section.style.display === '') {
        if(document.getElementById('parallel-query-section').style.display === 'block'){
            document.getElementById('parallel-query-section').style.display = 'none';
            removeModal();
        }

        section.style.display = 'block';
    } else {

        section.style.display = 'none';
    }
    removeModal();
});


document.getElementById('add-filter')?.addEventListener('click', () => {
    if (columnNames.length === 0) {
        alert('Please select a file first, and wait for loading the column names.');
        return;
    }
    addFilterRow();
});


function addFilterRow() {
    const container = document.getElementById('column-filters');

    const div = document.createElement('div');
    div.classList.add('filter-row');

    div.innerHTML = `
        <select class="column">
            ${columnNames.map(col => `<option value="${col}">${col}</option>`).join('')}
        </select>
        <select class="operator">
            <option value=">">&gt;</option>
            <option value=">=">&ge;</option>
            <option value="<">&lt;</option>
            <option value="<=">&le;</option>
            <option value="==">=</option>
        </select>
        <input type="text" class="value" placeholder="Input value">
        <select class="logic">
            <option value="and">AND</option>
            <option value="or">OR</option>
        </select>
        <button onclick="removeFilter(this)">Delete</button>
    `;

    container.appendChild(div);
}

document.getElementById('toggle-parallel-query')?.addEventListener('click', () => {
    const section = document.getElementById('parallel-query-section');

    if(section.style.display === 'none' || section.style.display === ''){
        if(document.getElementById('conditional-query-section').style.display === 'block'){
            document.getElementById('conditional-query-section').style.display = 'none';
            removeModal();
        }

        section.style.display = 'block';

        const dropdown = document.getElementById('columnName');
        dropdown.innerHTML = '';

        columnNames.forEach(columnName => {
            const opt = document.createElement('option');
            opt.value = columnName;
            opt.textContent = columnName;
            dropdown.appendChild(opt);
        });
    } else {
        section.style.display = 'none';
    }
    removeModal();
});

document.getElementById('add-subset')?.addEventListener('click', () => {
    addSubsetRow();
});

function addSubsetRow() {
    const container = document.getElementById('column-subsets');

    const div = document.createElement('div');
    div.classList.add('subset-row');

    div.innerHTML = `
        <label for="min">Lower bound: </label>
        <input type="number" min="-2147483648" max="2147483647" class="min">
        <label for="max">Higher bound: </label>
        <input type="number" min="-2147483648" max="2147483647" class="max">
        <button onclick="removeFilter(this)">Delete</button>
    `;
    container.appendChild(div);
}

function removeFilter(button) {
    button.parentElement.remove();
}

document.getElementById('submit-query-button')?.addEventListener('click', async () => {
    if (!selectedFileId || !selectedAlgorithmId) {
        alert('Please select both a file and an algorithm before submitting.');
        return;
    }

    let filters = [];
    document.querySelectorAll('.filter-row').forEach(row => {
        const columnName = row.querySelector('.column').value;
        const operator = row.querySelector('.operator').value;
        const value = row.querySelector('.value').value.trim();
        const logic = row.querySelector('.logic').value;

        if (value && columnName && operator && logic) {
            filters.push({ columnName, operator, value, logic });
        }
    });
    const epsilonInput = document.getElementById('epsilon');
    const parallelEpsilonInput = document.getElementById('parallel-epsilon');
    const epsilonValue = epsilonInput?.value || parallelEpsilonInput?.value;
    const epsilon = epsilonValue ? Number(epsilonValue) : null;
    if(filters.length === 0){
        filters = null;
    }

    let subsets = [];
    document.querySelectorAll('.subset-row').forEach(row => {
        const min = row.querySelector('.min').value;
        const max = row.querySelector('.max').value;
        subsets.push({ min, max });

    });
    if(subsets.length === 0){
        subsets = null;
    }
    const columnName = document.getElementById('columnName')?.value || null;

    try {
        const response = await fetchWithAuth('/query/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileId: selectedFileId,
                algorithmId: selectedAlgorithmId,
                filters,
                subsets,
                epsilon,
                columnName
            })
        });

        const result = await response.json();

        if (result.code === 1) {
            await fetchPrivacyBudget();
            renderQueryOutput(result.data);
        } else {
            document.getElementById('output').innerText = `Error: ${result.message}`;
        }

    } catch (error) {
        document.getElementById('output').innerText = 'Network error. Please try again later.';
    }
});


function highlightSelected(selectedItem, parentId) {
    const parent = document.getElementById(parentId);
    const items = parent.querySelectorAll('li');
    items.forEach(item => item.classList.remove('selected'));
    selectedItem.classList.add('selected');
}

function renderFileOutput(data) {
    const outputDiv = document.getElementById('file-results');
    outputDiv.innerHTML = '';
    data.forEach(file => {
        const listItem = document.createElement('li');
        listItem.textContent = file.filename;
        listItem.dataset.id = file.id;
        listItem.classList.add('clickable');
        listItem.addEventListener('click', () => {
            selectedFileId = file.id;
            highlightSelected(listItem, 'file-results');
            fetchColumnFilters();
            fetchPrivacyBudget();
        });
        outputDiv.appendChild(listItem);
    });
}

function renderAlgorithmOutput(data) {
    const outputDiv = document.getElementById('algorithm-results');
    outputDiv.innerHTML = '';
    data.forEach(algorithm => {
        const listItem = document.createElement('li');
        listItem.textContent = algorithm.name;
        listItem.dataset.id = algorithm.id;
        listItem.classList.add('clickable');
        listItem.addEventListener('click', () => {
            selectedAlgorithmId = algorithm.id;
            highlightSelected(listItem, 'algorithm-results');
        });
        outputDiv.appendChild(listItem);
    });
}

function renderQueryOutput(data) {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
}
