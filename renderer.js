const axios = require('axios');
const { ipcRenderer } = require('electron');

let currentFilters = {}; // Globalna zmienna do przechowywania bieżących filtrów
let originalData = []; // Globalna zmienna do przechowywania wszystkich danych

// Funkcja do pobierania danych z API z dynamicznymi filtrami
async function fetchFilteredData(status) {
	console.log('Fetching data with status:', status);
	const params = { ...currentFilters };
	if (status && status !== 'all') {
		params.status = status;
	} else {
		delete params.status;
	}

	try {
		const response = await axios.get('http://192.168.0.248:5002/api/data', {
			params,
		});
		console.log('Received data:', response.data);
		return response.data;
	} catch (error) {
		console.error('Error fetching data:', error);
		return [];
	}
}

// Funkcja renderująca dane z obsługą paginacji
let currentData = []; // Zmienna do przechowywania aktualnie wyświetlanych danych

//
function normalizeData(data) {
	return data.map((row) => {
		console.log('Before normalization:', row.status);
		if (row.status) {
			row.status = row.status.trim().toUpperCase();
		}
		console.log('After normalization:', row.status);
		return row;
	});
}

// Po pobraniu danych przypisz znormalizowane dane
originalData = normalizeData(originalData);
console.log('Original Data Structure:', originalData);

// Obsługa kliknięcia przycisków filtrowania
document.querySelectorAll('.filter-button').forEach((button) => {
        button.addEventListener('click', () => {
                const status = button.getAttribute('data-status');
                console.log('Filtr statusu:', status);

                let filteredData = originalData.filter((row) => {
                        const rowStatus = row.status ? row.status.trim().toUpperCase() : ''; // Normalizacja
                        return status === 'all' ? true : rowStatus === status.toUpperCase();
                });

                console.log('Dane po filtrowaniu:', filteredData);
                currentData = filteredData;
                renderFetchedData(currentData); // Wyświetl dane przefiltrowane
        });
});

document
        .getElementById('fetch_all_data')
        .addEventListener('click', async () => {
                const spinner = document.getElementById('loading-spinner');
                const fetchButton = document.getElementById('fetch_all_data');
                spinner.style.display = 'block';
                fetchButton.disabled = true;
                try {
                        const forms = document.querySelectorAll('.form-section');
                        const dataSets = []; // Lista do przechowywania zestawów danych
                        const formDetails = []; // Lista do przechowywania szczegółów formularzy

                        // Iteracja po wszystkich formularzach
                        for (const form of forms) {
                                const startDateInput = form.querySelector('.start_date');
                                const startTimeInput = form.querySelector('.start_time');
                                const endDateInput = form.querySelector('.end_date');
                                const endTimeInput = form.querySelector('.end_time');
                                const machineNumberInput = form.querySelector('.machine_number');
                                const programNumberInput = form.querySelector('.program_number');

                                if (!startDateInput?.value || !endDateInput?.value) {
                                        console.warn(
                                                'Brak wymaganych dat w formularzu. Pomijam ten formularz.'
                                        );
                                        continue;
                                }

                                // Formatowanie dat
                                const startDate = `${startDateInput.value}T${
                                        startTimeInput.value || '00:00'
                                }`;
                                const endDate = `${endDateInput.value}T${
                                        endTimeInput.value || '23:59'
                                }`;
                                const machineNumber = machineNumberInput?.value || '';
                                const programNumber = programNumberInput?.value || '';

                                formDetails.push({
                                        startDate,
                                        endDate,
                                        machineNumber,
                                        programNumber,
                                });

                                try {
                                        const response = await axios.get(
                                                'http://192.168.0.248:5002/api/data',
                                                {
                                                        params: {
                                                                start_date: startDate,
                                                                end_date: endDate,
                                                                machine_number: machineNumber,
                                                                program_number: programNumber,
                                                        },
                                                }
                                        );

                                        if (Array.isArray(response.data)) {
                                                dataSets.push(response.data);
                                        } else {
                                                console.warn(
                                                        'Otrzymane dane nie są tablicą:',
                                                        response.data
                                                );
                                        }
                                } catch (error) {
                                        console.error(
                                                'Błąd podczas pobierania danych z API:',
                                                error.message
                                        );
                                }
                        }

                        if (dataSets.length > 0) {
                                originalData = dataSets.flat(); // Połącz wszystkie dane w jedną listę
                                currentData = [...originalData];
                                renderFetchedData(currentData); // Wyświetlenie wszystkich danych
                                renderReports(dataSets, formDetails); // Generowanie raportów
                        } else {
                                document.getElementById('results').innerText =
                                        'Brak danych do pobrania.';
                        }
                } finally {
                        spinner.style.display = 'none';
                        fetchButton.disabled = false;
                }
        });

// Obsługa dynamicznego dodawania formularzy
document.getElementById('add_form').addEventListener('click', () => {
	const formsContainer = document.getElementById('forms-container');
	const formSection = document.createElement('div');
	formSection.classList.add('form-section');
	formSection.innerHTML = `
        <label>Data początkowa:</label>
        <input type="date" class="start_date" />
        <input type="time" class="start_time" value="00:00" />
        <label>Data końcowa:</label>
        <input type="date" class="end_date" />
        <input type="time" class="end_time" value="00:00" />
        <label>Nr maszyny:</label>
        <input type="text" class="machine_number" />
        <label>Nr programu:</label>
        <input type="text" class="program_number" />
        <button class="remove-form">Usuń</button>
    `;
	formsContainer.appendChild(formSection);

	// Obsługa usuwania formularza
	formSection.querySelector('.remove-form').addEventListener('click', () => {
		formSection.remove();
	});
});

document.querySelectorAll('nav button').forEach((button) => {
	button.addEventListener('click', () => {
		// Usunięcie klasy "active" ze wszystkich przycisków
		document
			.querySelectorAll('nav button')
			.forEach((btn) => btn.classList.remove('active'));

		// Dodanie klasy "active" do klikniętego przycisku
		button.classList.add('active');

		// Ukrycie wszystkich sekcji
		document
			.querySelectorAll('.content')
			.forEach((content) => content.classList.remove('active'));

		// Wyświetlenie odpowiedniej sekcji na podstawie klikniętego przycisku
		const targetId = button.id.replace('tab-', 'content-');
		const targetContent = document.getElementById(targetId);
		if (targetContent) {
			targetContent.classList.add('active');
		}
	});
});

function renderReports(dataSets, formDetails) {
	console.log('Generowanie raportu z:', dataSets, formDetails);
	const reportsContainer = document.getElementById('report_data');
	reportsContainer.innerHTML = '';

	if (!dataSets || !formDetails || dataSets.length === 0) {
		reportsContainer.innerHTML = '<p>Brak danych do wygenerowania raportu.</p>';
		return;
	}

	let totalAccepted = 0;
	let totalRejected = 0;
	let totalContaminated = 0;
	let totalWeight = 0;
	let totalPackages = 0;
	let totalBelowAverage = 0;
	let totalAboveAverage = 0;

	dataSets.forEach((data, index) => {
		if (!Array.isArray(data)) {
			console.error(`Dane dla zestawu #${index + 1} nie są tablicą:`, data);
			return;
		}

		const { startDate, endDate, machineNumber, programNumber } =
			formDetails[index];

		const acceptedPacks = data.filter((row) => row.status === 'A');
		const accepted = acceptedPacks.length;
		const rejected = data.filter((row) => row.status === 'R').length;
		const contaminated = data.filter((row) => row.status === 'C').length;

		const weightSum = acceptedPacks.reduce(
			(sum, row) => sum + (parseFloat(row.weight) || 0),
			0
		);
		const averageWeight = accepted > 0 ? weightSum / accepted : 0;

		const belowAverage = acceptedPacks.filter(
			(row) => parseFloat(row.weight) < averageWeight
		).length;
		const aboveAverage = acceptedPacks.filter(
			(row) => parseFloat(row.weight) > averageWeight
		).length;

		// Sumowanie do łącznych wartości
		totalAccepted += accepted;
		totalRejected += rejected;
		totalContaminated += contaminated;
		totalWeight += weightSum;
		totalPackages += data.length;
		totalBelowAverage += belowAverage;
		totalAboveAverage += aboveAverage;

		const report = document.createElement('div');
		report.classList.add('report-section');
		report.innerHTML = `
            <h3>Raport dla zestawu danych #${index + 1}:</h3>
            <p class="machine-number"><strong>NR MASZYNY:</strong> ${
							machineNumber || 'Brak danych'
						}</p>
            <p class="program-number"><strong>NR PROGRAMU:</strong> ${
							programNumber || 'Brak danych'
						}</p>
            <p><strong>Data początkowa:</strong> ${startDate}</p>
            <p><strong>Data końcowa:</strong> ${endDate}</p>
            <p><strong>Liczba zaakceptowanych paczek (A):</strong> ${accepted} szt.</p>
            <p><strong>Liczba odrzuconych paczek (R):</strong> ${rejected} szt.</p>
            <p><strong>Liczba zanieczyszczonych paczek (C):</strong> ${contaminated} szt.</p>
            <p><strong>Suma wagi zaakceptowanych paczek:</strong> ${(
							weightSum / 1000
						).toFixed(2)} kg</p>
            <p><strong>Średnia waga zaakceptowanych paczek:</strong> ${averageWeight.toFixed(
							2
						)} g</p>
            <p><strong>Paczki poniżej średniej wagi:</strong> ${belowAverage} szt.</p>
            <p><strong>Paczki powyżej średniej wagi:</strong> ${aboveAverage} szt.</p>
        `;

		reportsContainer.appendChild(report);
	});

	// Łączny raport
	const totalAverageWeight =
		totalAccepted > 0 ? totalWeight / totalAccepted : 0;
	const totalReport = document.createElement('div');
	totalReport.classList.add('report-section', 'total');
	totalReport.innerHTML = `
        <h3>Łączny raport:</h3>
        <p><strong>Liczba zaakceptowanych paczek (A):</strong> ${totalAccepted} szt.</p>
        <p><strong>Liczba odrzuconych paczek (R):</strong> ${totalRejected} szt.</p>
        <p><strong>Liczba zanieczyszczonych paczek (C):</strong> ${totalContaminated} szt.</p>
        <p><strong>Łączna waga:</strong> ${(totalWeight / 1000).toFixed(
					2
				)} kg</p>
        <p><strong>Średnia waga zaakceptowanych paczek:</strong> ${totalAverageWeight.toFixed(
					2
				)} g</p>
        <p><strong>Paczki poniżej średniej wagi:</strong> ${totalBelowAverage} szt.</p>
        <p><strong>Paczki powyżej średniej wagi:</strong> ${totalAboveAverage} szt.</p>
        <p><strong>Łączna liczba paczek:</strong> ${totalPackages} szt.</p>
    `;

	reportsContainer.appendChild(totalReport);
}

//Programy

// Główna inicjalizacja DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
	// Obsługa zakładek nawigacji
	document.querySelectorAll('nav button').forEach((button) => {
		button.addEventListener('click', () => {
			document
				.querySelectorAll('nav button')
				.forEach((btn) => btn.classList.remove('active'));
			button.classList.add('active');

			document
				.querySelectorAll('.content')
				.forEach((content) => content.classList.remove('active'));

			const targetId = button.id.replace('tab-', 'content-');
			const targetContent = document.getElementById(targetId);
			if (targetContent) targetContent.classList.add('active');

			// Załaduj formularz w sekcji Programy
			if (targetId === 'content-programs') loadProgramForm();
		});
	});
});

// Funkcja generująca formularz w sekcji Programy
function loadProgramForm() {
	const programContainer = document.getElementById('program_form_container');
	if (!programContainer.hasChildNodes()) {
		programContainer.innerHTML = `
            <div class="form-section">
                <label>Data początkowa:</label>
                <input type="date" id="program_start_date" />
                <input type="time" id="program_start_time" value="06:00" />
                <label>Data końcowa:</label>
                <input type="date" id="program_end_date" />
                <input type="time" id="program_end_time" value="06:00" />
                <button id="fetch_programs_data">Pobierz dane</button>
            </div>
            <div id="program_report"></div>
            <button id="fetch_selected_reports" style="display:none;">Pobierz dane dla zaznaczonych</button>
        `;

		document
			.getElementById('fetch_programs_data')
			.addEventListener('click', fetchProgramDataHandler);

		document
			.getElementById('fetch_selected_reports')
			.addEventListener('click', fetchSelectedReportsHandler);
	}
}

// Funkcja obsługująca pobranie danych programów
async function fetchProgramDataHandler() {
	const startDate = document.getElementById('program_start_date').value;
	const startTime =
		document.getElementById('program_start_time').value || '00:00';
	const endDate = document.getElementById('program_end_date').value;
	const endTime = document.getElementById('program_end_time').value || '23:59';

	if (!startDate || !endDate) {
		alert('Wprowadź daty początkową i końcową.');
		return;
	}

	const formattedStartDate = `${startDate}T${startTime}`;
	const formattedEndDate = `${endDate}T${endTime}`;

	if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
		alert('Data początkowa nie może być późniejsza niż data końcowa.');
		return;
	}

	const programData = await fetchProgramReportData(
		formattedStartDate,
		formattedEndDate
	);
	originalData = programData;

	generateProgramReportWithTimes(
		programData,
		formattedStartDate,
		formattedEndDate
	);
	renderMachineAndProgramFilters([programData]); // Wywołanie funkcji do generowania filtrów
}

// Funkcja pobierająca dane z API
// Funkcja pobierająca dane z API
async function fetchProgramReportData(
	startDate,
	endDate,
	machineNumber = '',
	programNumber = ''
) {
	try {
		const response = await axios.get('http://192.168.0.248:5002/api/data', {
			params: {
				start_date: startDate,
				end_date: endDate,
				machine_number: machineNumber, // Opcjonalny parametr
				program_number: programNumber, // Opcjonalny parametr
			},
		});

		console.log('API Response:', response.data); // Logowanie odpowiedzi API

		// Sprawdzenie, czy odpowiedź zawiera tablicę
		if (Array.isArray(response.data)) {
			console.log('Pobrane dane:', response.data);
			return response.data; // Zwróć dane pobrane z API
		} else {
			console.warn('Otrzymane dane nie są tablicą:', response.data);
			return []; // Zwróć pustą tablicę w przypadku błędnej odpowiedzi
		}
	} catch (error) {
		console.error('Błąd podczas pobierania danych z API:', error.message);
		return []; // Zwróć pustą tablicę w przypadku błędu
	}
}

// Funkcja generująca raport z checkboxami
function generateProgramReportWithTimes(data, startDate, endDate) {
	const reportContainer = document.getElementById('program_report');
	reportContainer.innerHTML = '';

	if (!data || data.length === 0) {
		reportContainer.innerHTML = '<p>Brak danych dla wybranego zakresu dat.</p>';
		return;
	}

	const groupedData = {};
	data.forEach((entry) => {
		const key = `Nr maszyny: ${entry.machine_number} - Nr programu: ${entry.program_number}`;
		if (!groupedData[key]) {
			groupedData[key] = { startTime: entry.date, endTime: entry.date };
		} else {
			if (new Date(entry.date) < new Date(groupedData[key].startTime))
				groupedData[key].startTime = entry.date;
			if (new Date(entry.date) > new Date(groupedData[key].endTime))
				groupedData[key].endTime = entry.date;
		}
	});

	let reportHTML = `<h3>Raport z zakresu: ${startDate} - ${endDate}</h3>`;
	let index = 0;

	for (const [key, times] of Object.entries(groupedData)) {
		reportHTML += `
            <div class="report-section">
                <input type="checkbox" class="report-checkbox" data-start="${
									times.startTime
								}" data-end="${times.endTime}" data-key="${key}" />
                <h4>Raport ${++index}:</h4>
                <p><strong>${key}</strong></p>
                <p><strong>Godzina rozpoczęcia:</strong> ${new Date(
									times.startTime
								).toLocaleString()}</p>
                <p><strong>Godzina zakończenia:</strong> ${new Date(
									times.endTime
								).toLocaleString()}</p>
            </div>
        `;
	}

	reportContainer.innerHTML = reportHTML;
	document.getElementById('fetch_selected_reports').style.display = 'block';
}

// Funkcja obsługująca zaznaczone raporty

// Funkcja renderująca dane z paginacją
function renderFetchedData(data) {
	const fetchedDataContainer = document.getElementById('fetched_data');
	const paginationContainer = document.getElementById('pagination');

	fetchedDataContainer.innerHTML = '';
	paginationContainer.innerHTML = '';

	if (!data || data.length === 0) {
		fetchedDataContainer.innerHTML = '<p>Brak danych.</p>';
		return;
	}

	const rowsPerPage = 100;
	let currentPage = 1;
	const totalPages = Math.ceil(data.length / rowsPerPage);

	function displayPage(page) {
		fetchedDataContainer.innerHTML = '';
		const startIndex = (page - 1) * rowsPerPage;
		const endIndex = Math.min(startIndex + rowsPerPage, data.length);

		const table = document.createElement('table');
		table.className = 'styled-table';
		table.innerHTML = `
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Nr maszyny</th>
                    <th>Nr programu</th>
                    <th>Status</th>
                    <th>Waga</th>
                </tr>
            </thead>
        `;

		const tbody = document.createElement('tbody');
		data.slice(startIndex, endIndex).forEach((row) => {
			const tableRow = document.createElement('tr');
			tableRow.innerHTML = `
                <td>${row.date || 'Brak danych'}</td>
                <td>${row.machine_number || 'Brak danych'}</td>
                <td>${row.program_number || 'Brak danych'}</td>
                <td>${row.status || 'Brak danych'}</td>
                <td>${row.weight || 'Brak danych'}</td>
            `;
			tbody.appendChild(tableRow);
		});

		table.appendChild(tbody);
		fetchedDataContainer.appendChild(table);
	}

	function renderPagination() {
		paginationContainer.innerHTML = '';
		for (let i = 1; i <= totalPages; i++) {
			const button = document.createElement('button');
			button.textContent = i;
			button.className = i === currentPage ? 'active' : '';
			button.addEventListener('click', () => {
				currentPage = i;
				displayPage(currentPage);
				renderPagination();
			});
			paginationContainer.appendChild(button);
		}
	}

	displayPage(currentPage);
	renderPagination();
}

async function fetchSelectedReportsHandler() {
	const checkboxes = document.querySelectorAll('.report-checkbox:checked');
	if (checkboxes.length === 0) {
		alert('Wybierz przynajmniej jeden raport.');
		return;
	}

	const fetchedDataContainer = document.getElementById('fetched_data');
	fetchedDataContainer.innerHTML = '<p>Pobieranie danych...</p>';
	const allData = []; // Zmienna do przechowywania wyników
	const formDetails = []; // Szczegóły dla raportów (maszyna, program, daty)

	// Pobieranie danych tylko dla zaznaczonych raportów
	for (const checkbox of checkboxes) {
		const startDate = checkbox.getAttribute('data-start');
		const endDate = checkbox.getAttribute('data-end');
		const reportKey = checkbox.getAttribute('data-key'); // Klucz raportu

		// Parsowanie szczegółów maszyny i programu z klucza
		const [_, machineNumber, programNumber] = reportKey.match(
			/Nr maszyny: (\d+) - Nr programu: (\d+)/
		);

		console.log(
			`Pobieranie danych dla raportu -> Maszyna: ${machineNumber}, Program: ${programNumber}, Start: ${startDate}, End: ${endDate}`
		);

		try {
			const response = await axios.get('http://192.168.0.248:5002/api/data', {
				params: {
					start_date: startDate,
					end_date: endDate,
					machine_number: machineNumber,
					program_number: programNumber,
				},
			});

			if (response.data && Array.isArray(response.data)) {
				allData.push(response.data); // Dodaj dane jako zestaw
				formDetails.push({
					startDate,
					endDate,
					machineNumber,
					programNumber,
				});
			}
		} catch (error) {
			console.error(
				`Błąd przy pobieraniu danych dla raportu: ${startDate} - ${endDate}`,
				error
			);
		}
        }

        // Renderowanie pobranych danych w tabeli i raportów
        if (allData.length > 0) {
                // Spłaszcz dane i zapisz je jako bazowe dla filtrów
                originalData = normalizeData(allData.flat());
                currentData = [...originalData];

                renderFetchedData(currentData); // Renderowanie tabeli z danymi
                renderReports(allData, formDetails); // Generowanie raportów
        } else {
                fetchedDataContainer.innerHTML = '<p>Brak danych do wyświetlenia.</p>';
        }

	alert('Dane zostały pobrane i wyświetlone.');
}
//----------------filtrowanie programu----------------------------------------------------------------------------------------------

function renderMachineAndProgramFilters(dataSets) {
	const filterContainer = document.getElementById('filters-container');
	filterContainer.innerHTML = ''; // Czyści poprzednie filtry

	if (!dataSets || dataSets.length === 0) {
		return;
	}

	let uniqueMachines = new Set();
	let uniquePrograms = new Set();

	dataSets.forEach((data) => {
		data.forEach((entry) => {
			uniqueMachines.add(entry.machine_number);
			uniquePrograms.add(entry.program_number);
		});
	});

	const machinesArray = Array.from(uniqueMachines);
	const programsArray = Array.from(uniquePrograms);

	// Tworzymy sekcję dla maszyn
	const machineFilterSection = document.createElement('div');
	machineFilterSection.innerHTML = `<h4>Nr maszyny:</h4>`;
	filterContainer.appendChild(machineFilterSection);

	// Dodajemy przyciski dla maszyn
	machinesArray.forEach((machine) => {
		const button = document.createElement('button');
		button.textContent = `Maszyna ${machine}`;
		button.classList.add('filter-button');
		button.addEventListener('click', () => filterReportsByMachine(machine));
		machineFilterSection.appendChild(button);
	});

	// Tworzymy sekcję dla programów
	const programFilterSection = document.createElement('div');
	programFilterSection.innerHTML = `<h4>Nr programu:</h4>`;
	filterContainer.appendChild(programFilterSection);

	// Dodajemy przyciski dla programów
	programsArray.forEach((program) => {
		const button = document.createElement('button');
		button.textContent = `Program ${program}`;
		button.classList.add('filter-button');
		button.addEventListener('click', () => filterReportsByProgram(program));
		programFilterSection.appendChild(button);
	});

	// Dodajemy przycisk "Wszystko" do resetowania filtrów
	const resetButton = document.createElement('button');
	resetButton.textContent = 'Wszystko';
	resetButton.classList.add('filter-button', 'reset-button');
	resetButton.addEventListener('click', () =>
		filterReportsByMachine(null, true)
	);
	filterContainer.appendChild(resetButton);
}

// Funkcja filtrowania raportów według maszyny
function filterReportsByMachine(machineNumber, showAll = false) {
	const allReports = document.querySelectorAll('.report-section');
	allReports.forEach((report) => {
		if (showAll) {
			report.style.display = 'block';
		} else {
			report.style.display = report.innerHTML.includes(
				`Nr maszyny: ${machineNumber}`
			)
				? 'block'
				: 'none';
		}
	});
}

// Funkcja filtrowania raportów według programu
function filterReportsByProgram(programNumber) {
        const allReports = document.querySelectorAll('.report-section');
        allReports.forEach((report) => {
                report.style.display = report.innerHTML.includes(
                        `Nr programu: ${programNumber}`
                )
                        ? 'block'
                        : 'none';
        });
}

document.getElementById('export_data').addEventListener('click', async () => {
        if (!currentData || currentData.length === 0) {
                alert('Brak danych do eksportu.');
                return;
        }
        try {
                const result = await ipcRenderer.invoke(
                        'export-data-to-excel',
                        currentData
                );
                if (result.canceled) {
                        alert('Zapis anulowany.');
                } else {
                        alert('Dane zapisane pomyślnie.');
                }
        } catch (err) {
                console.error('Błąd eksportu danych:', err);
                alert('Wystąpił błąd podczas eksportu danych.');
        }
});
