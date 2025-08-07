// Firebase configuration is now in firebase-config.js
// Import Firebase modules will be done via dynamic imports

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM content loaded');
    
    try {
        // Import base URL for GitHub Pages compatibility
        const { baseUrl } = await import('./base-url.js');
        
        // Import Firebase service functions
        const { loadDataFromFirestore, subscribeToDataChanges } = await import('./firebase-service.js');
        
        // Initialize the application
        await initApp();
        
        // Set up event listeners - moved to the end to ensure DOM is fully ready
        setTimeout(() => {
            console.log('Setting up event listeners after delay');
            setupEventListeners();
        }, 500);
        
        // Set up real-time data sync
        subscribeToDataChanges((data) => {
            if (data && Object.keys(data).length > 0) {
                // Only update if the data is different from current data
                const currentDataStr = JSON.stringify(allMonthsData);
                const newDataStr = JSON.stringify(data);
                
                if (currentDataStr !== newDataStr) {
                    console.log('Received updated data from Firestore');
                    allMonthsData = data;
                    loadMonthData(currentViewMonth, currentViewYear);
                }
            }
        });
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Add event listener for page unload/refresh to auto-save data
window.addEventListener('beforeunload', async function() {
    // Save current month data
    saveCurrentMonthData();
    
    // Save all months data to Firestore
    const { saveDataToFirestore } = await import('./firebase-service.js');
    await saveDataToFirestore(allMonthsData);
});

// Global variables to store data
let weeks = [];
let rawMaterialData = [];
let plannedProductionData = [];
let actualProductionData = [];
let plannedSplitData = [];
let actualSplitData = [];
let productionChart = null;

// Global variables for month selection
let currentViewMonth;
let currentViewYear;
let allMonthsData = {}; // Object to store data for all months

// Initialize the application
async function initApp() {
    // Set current view to current month/year
    const currentDate = new Date();
    currentViewMonth = currentDate.getMonth();
    currentViewYear = currentDate.getFullYear();
    
    // Update the month display
    updateMonthDisplay();
    
    // Get the weeks for the current month
    weeks = getWeeksInMonth(currentViewMonth, currentViewYear);
    
    // Try to load data from Firestore
    const { loadDataFromFirestore } = await import('./firebase-service.js');
    const firestoreData = await loadDataFromFirestore();
    
    if (firestoreData) {
        allMonthsData = firestoreData;
        loadMonthData(currentViewMonth, currentViewYear);
    } else {
        // If no Firestore data, try localStorage as fallback
        const savedData = localStorage.getItem('productionPlanningAllMonthsData');
        
        if (savedData) {
            allMonthsData = JSON.parse(savedData);
            loadMonthData(currentViewMonth, currentViewYear);
        } else {
            // Initialize data structures if no data found
            initializeDataStructures();
            populateTables();
        }
    }
    
    // Initialize chart
    initializeChart();
    
    // Load data from localStorage if available
    loadDataFromLocalStorage();
}

// Get weeks in the specified month
function getWeeksInMonth(month, year) {
    const result = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Find the first Monday that includes days from this month
    // This could be in the previous month if the month starts mid-week
    let currentDate = new Date(firstDay);
    if (currentDate.getDay() !== 1) { // If not Monday
        // Go back to the previous Monday
        currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        if (currentDate > firstDay) { // If we went to the next Monday, go back one week
            currentDate.setDate(currentDate.getDate() - 7);
        }
    }
    
    // Generate weeks until we pass the end of the month
    // Include the week if ANY day of the week falls within the month
    while (currentDate <= lastDay || 
          (new Date(currentDate).setDate(currentDate.getDate() + 6) >= firstDay.getTime() && 
           new Date(currentDate).setDate(currentDate.getDate()) <= lastDay.getTime())) {
        
        const weekEndDate = new Date(currentDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        const weekStart = formatDate(currentDate);
        const weekEnd = formatDate(weekEndDate);
        
        result.push({
            label: `${weekStart} - ${weekEnd}`,
            startDate: new Date(currentDate),
            endDate: new Date(weekEndDate)
        });
        
        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return result;
}

// Format date as DD MMM
function formatDate(date) {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    return `${day} ${month}`;
}

// Initialize data structures
function initializeDataStructures() {
    // Initialize raw material data
    rawMaterialData = weeks.map(week => ({
        week: week.label,
        pcw: 0,
        piw: 0,
        total: 0,
        eowStock: 0
    }));
    
    // Initialize planned production data
    plannedProductionData = weeks.map(week => ({
        week: week.label,
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
        total: 0
    }));
    
    // Initialize actual production data
    actualProductionData = weeks.map(week => ({
        week: week.label,
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
        total: 0
    }));
    
    // Initialize planned split data
plannedSplitData = weeks.map(week => ({
    week: week.label,
    rp101Percent: 65, // Default values
    rp106Percent: 29,
    nonPPPercent: 6,
    rp101Tons: 0,
    rp106Tons: 0,
    nonPPTons: 0
}));

// Initialize actual split data
actualSplitData = weeks.map(week => ({
    week: week.label,
    rp101Percent: 0,
    rp106Percent: 0,
    nonPPPercent: 0,
    rp101Tons: 0,
    rp106Tons: 0,
    nonPPTons: 0
}));
}

// Populate tables with initial data
function populateTables() {
    populateRawMaterialTable();
    populatePlannedProductionTable();
    populateActualProductionTable();
    populatePlannedSplitTable();
    populateActualSplitTable();
}

// Populate raw material table
function populateRawMaterialTable() {
    const tableBody = document.getElementById('raw-material-body');
    tableBody.innerHTML = '';
    
    rawMaterialData.forEach((weekData, index) => {
        const row = document.createElement('tr');
        
        // Week column
        const weekCell = document.createElement('td');
        weekCell.textContent = weekData.week;
        row.appendChild(weekCell);
        
        // PCW column
        const pcwCell = document.createElement('td');
        const pcwInput = document.createElement('input');
        pcwInput.type = 'number';
        pcwInput.min = '0';
        pcwInput.step = '0.1';
        pcwInput.value = weekData.pcw;
        pcwInput.addEventListener('input', function() {
            rawMaterialData[index].pcw = parseFloat(this.value) || 0;
            updateRawMaterialTotals(index);
            updateSplitTotals();
            updateChart();
            saveCurrentMonthData();
        });
        pcwCell.appendChild(pcwInput);
        row.appendChild(pcwCell);
        
        // PIW column
        const piwCell = document.createElement('td');
        const piwInput = document.createElement('input');
        piwInput.type = 'number';
        piwInput.min = '0';
        piwInput.step = '0.1';
        piwInput.value = weekData.piw;
        piwInput.addEventListener('input', function() {
            rawMaterialData[index].piw = parseFloat(this.value) || 0;
            updateRawMaterialTotals(index);
            updateSplitTotals();
            updateChart();
            saveCurrentMonthData();
        });
        piwCell.appendChild(piwInput);
        row.appendChild(piwCell);
        
        // Total column
        const totalCell = document.createElement('td');
        totalCell.textContent = weekData.total.toFixed(1);
        totalCell.classList.add('calculated');
        row.appendChild(totalCell);
        
        // End of Week Stock column (calculated)
        const eowStockCell = document.createElement('td');
        eowStockCell.textContent = weekData.eowStock.toFixed(1);
        eowStockCell.classList.add('calculated');
        row.appendChild(eowStockCell);
        
        tableBody.appendChild(row);
    });
    
    updateRawMaterialTotals();
}

// Update raw material totals
function updateRawMaterialTotals(updatedIndex = -1) {
    // Update the total for the specific row if an index is provided
    if (updatedIndex >= 0) {
        const weekData = rawMaterialData[updatedIndex];
        weekData.total = weekData.pcw + weekData.piw;
        
        // Update the total in the table
        const tableBody = document.getElementById('raw-material-body');
        const row = tableBody.children[updatedIndex];
        if (row) {
            const totalCell = row.children[3];
            totalCell.textContent = weekData.total.toFixed(1);
        }
    }
    
    // Calculate monthly totals
    let pcwTotal = 0;
    let piwTotal = 0;
    let rawTotal = 0;
    
    // Calculate end-of-week stock for each week, accounting for previous week's stock
    let previousEowStock = 0; // Initialize previous EOW stock
    
    rawMaterialData.forEach((weekData, index) => {
        pcwTotal += weekData.pcw;
        piwTotal += weekData.piw;
        rawTotal += weekData.total;
        
        // Calculate EOW stock as previous EOW stock + current week's raw material - current week's planned production divided by 80%
        const weekPlannedProduction = plannedProductionData[index] ? plannedProductionData[index].total : 0;
        weekData.eowStock = previousEowStock + weekData.total - (weekPlannedProduction / 0.8);
        
        // Store current EOW stock for next week's calculation
        previousEowStock = weekData.eowStock;
        
        // Update the EOW stock in the table
        const tableBody = document.getElementById('raw-material-body');
        const row = tableBody.children[index];
        if (row) {
            const eowStockCell = row.children[4];
            eowStockCell.textContent = weekData.eowStock.toFixed(1);
        }
    });
    
    // Get the last week's EOW stock for the footer
    const lastWeekEowStock = rawMaterialData.length > 0 ? 
        rawMaterialData[rawMaterialData.length - 1].eowStock : 0;
    
    // Update footer totals
    document.getElementById('pcw-total').textContent = pcwTotal.toFixed(1);
    document.getElementById('piw-total').textContent = piwTotal.toFixed(1);
    document.getElementById('raw-total').textContent = rawTotal.toFixed(1);
    document.getElementById('eow-stock').textContent = lastWeekEowStock.toFixed(1);
}

// Populate planned production table
function populatePlannedProductionTable() {
    const tableBody = document.getElementById('planned-production-body');
    tableBody.innerHTML = '';
    
    plannedProductionData.forEach((weekData, index) => {
        const row = document.createElement('tr');
        
        // Week column
        const weekCell = document.createElement('td');
        weekCell.textContent = weekData.week;
        row.appendChild(weekCell);
        
        // Days columns
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const shortDays = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
        
        days.forEach((day, dayIndex) => {
            const dayCell = document.createElement('td');
            const dayInput = document.createElement('input');
            dayInput.type = 'number';
            dayInput.min = '0';
            dayInput.step = '0.1';
            dayInput.value = weekData[day];
            dayInput.addEventListener('input', function() {
                plannedProductionData[index][day] = parseFloat(this.value) || 0;
                updatePlannedProductionTotals(index);
                updateRawMaterialTotals(); // Update EOW stock when planned production changes
                updateSplitTotals();
                updateChart();
                saveCurrentMonthData();
            });
            dayCell.appendChild(dayInput);
            row.appendChild(dayCell);
        });
        
        // Total column
        const totalCell = document.createElement('td');
        totalCell.textContent = weekData.total.toFixed(1);
        totalCell.classList.add('calculated');
        row.appendChild(totalCell);
        
        tableBody.appendChild(row);
    });
    
    updatePlannedProductionTotals();
}

// Update planned production totals
function updatePlannedProductionTotals(updatedIndex = -1) {
    // Update the total for the specific row if an index is provided
    if (updatedIndex >= 0) {
        const weekData = plannedProductionData[updatedIndex];
        weekData.total = weekData.monday + weekData.tuesday + weekData.wednesday + 
                        weekData.thursday + weekData.friday + weekData.saturday + weekData.sunday;
        
        // Update the total in the table
        const tableBody = document.getElementById('planned-production-body');
        const row = tableBody.children[updatedIndex];
        if (row) {
            const totalCell = row.children[8]; // 8th cell is the total
            totalCell.textContent = weekData.total.toFixed(1);
        }
    }
    
    // Calculate monthly totals
    let mondayTotal = 0;
    let tuesdayTotal = 0;
    let wednesdayTotal = 0;
    let thursdayTotal = 0;
    let fridayTotal = 0;
    let saturdayTotal = 0;
    let sundayTotal = 0;
    let plannedTotal = 0;
    
    plannedProductionData.forEach(weekData => {
        mondayTotal += weekData.monday;
        tuesdayTotal += weekData.tuesday;
        wednesdayTotal += weekData.wednesday;
        thursdayTotal += weekData.thursday;
        fridayTotal += weekData.friday;
        saturdayTotal += weekData.saturday;
        sundayTotal += weekData.sunday;
        plannedTotal += weekData.total;
    });
    
    // Update footer totals
    document.getElementById('planned-m-total').textContent = mondayTotal.toFixed(1);
    document.getElementById('planned-t-total').textContent = tuesdayTotal.toFixed(1);
    document.getElementById('planned-w-total').textContent = wednesdayTotal.toFixed(1);
    document.getElementById('planned-th-total').textContent = thursdayTotal.toFixed(1);
    document.getElementById('planned-f-total').textContent = fridayTotal.toFixed(1);
    document.getElementById('planned-s-total').textContent = saturdayTotal.toFixed(1);
    document.getElementById('planned-su-total').textContent = sundayTotal.toFixed(1);
    document.getElementById('planned-total').textContent = plannedTotal.toFixed(1);
    
    // Update monthly overview planned total
    document.getElementById('monthly-planned-total').textContent = plannedTotal.toFixed(1);
}

// Populate actual production table
function populateActualProductionTable() {
    const tableBody = document.getElementById('actual-production-body');
    tableBody.innerHTML = '';
    
    actualProductionData.forEach((weekData, index) => {
        const row = document.createElement('tr');
        
        // Week column
        const weekCell = document.createElement('td');
        weekCell.textContent = weekData.week;
        row.appendChild(weekCell);
        
        // Days columns
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const shortDays = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
        
        days.forEach((day, dayIndex) => {
            const dayCell = document.createElement('td');
            const dayInput = document.createElement('input');
            dayInput.type = 'number';
            dayInput.min = '0';
            dayInput.step = '0.1';
            dayInput.value = weekData[day];
            
            // Color code based on comparison with planned production
            const plannedValue = plannedProductionData[index] ? plannedProductionData[index][day] : 0;
            if (weekData[day] > plannedValue) {
                dayCell.classList.add('above-target');
            } else if (weekData[day] < plannedValue && weekData[day] > 0) {
                dayCell.classList.add('below-target');
            }
            
            dayInput.addEventListener('input', function() {
                const newValue = parseFloat(this.value) || 0;
                actualProductionData[index][day] = newValue;
                
                // Update color coding
                dayCell.classList.remove('above-target', 'below-target');
                if (newValue > plannedValue) {
                    dayCell.classList.add('above-target');
                } else if (newValue < plannedValue && newValue > 0) {
                    dayCell.classList.add('below-target');
                }
                
                updateActualProductionTotals(index);
                updateSplitTotals();
                updateChart();
                saveCurrentMonthData();
            });
            
            dayCell.appendChild(dayInput);
            row.appendChild(dayCell);
        });
        
        // Total column
        const totalCell = document.createElement('td');
        totalCell.textContent = weekData.total.toFixed(1);
        totalCell.classList.add('calculated');
        row.appendChild(totalCell);
        
        tableBody.appendChild(row);
    });
    
    updateActualProductionTotals();
}

// Update actual production totals
function updateActualProductionTotals(updatedIndex = -1) {
    // Update the total for the specific row if an index is provided
    if (updatedIndex >= 0) {
        const weekData = actualProductionData[updatedIndex];
        weekData.total = weekData.monday + weekData.tuesday + weekData.wednesday + 
                        weekData.thursday + weekData.friday + weekData.saturday + weekData.sunday;
        
        // Update the total in the table
        const tableBody = document.getElementById('actual-production-body');
        const row = tableBody.children[updatedIndex];
        if (row) {
            const totalCell = row.children[8]; // 8th cell is the total
            totalCell.textContent = weekData.total.toFixed(1);
        }
    }
    
    // Calculate monthly totals
    let mondayTotal = 0;
    let tuesdayTotal = 0;
    let wednesdayTotal = 0;
    let thursdayTotal = 0;
    let fridayTotal = 0;
    let saturdayTotal = 0;
    let sundayTotal = 0;
    let actualTotal = 0;
    
    actualProductionData.forEach(weekData => {
        mondayTotal += weekData.monday;
        tuesdayTotal += weekData.tuesday;
        wednesdayTotal += weekData.wednesday;
        thursdayTotal += weekData.thursday;
        fridayTotal += weekData.friday;
        saturdayTotal += weekData.saturday;
        sundayTotal += weekData.sunday;
        actualTotal += weekData.total;
    });
    
    // Update footer totals
    document.getElementById('actual-m-total').textContent = mondayTotal.toFixed(1);
    document.getElementById('actual-t-total').textContent = tuesdayTotal.toFixed(1);
    document.getElementById('actual-w-total').textContent = wednesdayTotal.toFixed(1);
    document.getElementById('actual-th-total').textContent = thursdayTotal.toFixed(1);
    document.getElementById('actual-f-total').textContent = fridayTotal.toFixed(1);
    document.getElementById('actual-s-total').textContent = saturdayTotal.toFixed(1);
    document.getElementById('actual-su-total').textContent = sundayTotal.toFixed(1);
    document.getElementById('actual-total').textContent = actualTotal.toFixed(1);
    
    // Update monthly overview actual total
    document.getElementById('monthly-actual-total').textContent = actualTotal.toFixed(1);
}

// Populate planned split table
function populatePlannedSplitTable() {
    const tableBody = document.getElementById('planned-split-body');
    tableBody.innerHTML = '';
    
    plannedSplitData.forEach((weekData, index) => {
        const row = document.createElement('tr');
        
        // Week column
        const weekCell = document.createElement('td');
        weekCell.textContent = weekData.week;
        row.appendChild(weekCell);
        
        // RP 101 Black % column
        const rp101PercentCell = document.createElement('td');
        const rp101PercentInput = document.createElement('input');
        rp101PercentInput.type = 'number';
        rp101PercentInput.min = '0';
        rp101PercentInput.max = '100';
        rp101PercentInput.step = '1';
        rp101PercentInput.value = weekData.rp101Percent;
        rp101PercentInput.addEventListener('input', function() {
            plannedSplitData[index].rp101Percent = parseFloat(this.value) || 0;
            // Ensure percentages sum to 100
            const total = plannedSplitData[index].rp101Percent + 
                         plannedSplitData[index].rp106Percent + 
                         (plannedSplitData[index].nonPPPercent || 0);
            
            if (total !== 100) {
                // Adjust nonPP percentage to make total 100
                plannedSplitData[index].nonPPPercent = Math.max(0, 100 - plannedSplitData[index].rp101Percent - plannedSplitData[index].rp106Percent);
                
                // Update the nonPP input value in the UI
                const nonPPInput = row.children[3].querySelector('input');
                if (nonPPInput) {
                    nonPPInput.value = plannedSplitData[index].nonPPPercent;
                }
            }
            
            updatePlannedSplitTotals(index);
            saveCurrentMonthData();
        });
        rp101PercentCell.appendChild(rp101PercentInput);
        row.appendChild(rp101PercentCell);
        
        // RP 106 White % column
        const rp106PercentCell = document.createElement('td');
        const rp106PercentInput = document.createElement('input');
        rp106PercentInput.type = 'number';
        rp106PercentInput.min = '0';
        rp106PercentInput.max = '100';
        rp106PercentInput.step = '1';
        rp106PercentInput.value = weekData.rp106Percent;
        rp106PercentInput.addEventListener('input', function() {
            plannedSplitData[index].rp106Percent = parseFloat(this.value) || 0;
            // Ensure percentages sum to 100
            const total = plannedSplitData[index].rp101Percent + 
                         plannedSplitData[index].rp106Percent + 
                         (plannedSplitData[index].nonPPPercent || 0);
            
            if (total !== 100) {
                // Adjust nonPP percentage to make total 100
                plannedSplitData[index].nonPPPercent = Math.max(0, 100 - plannedSplitData[index].rp101Percent - plannedSplitData[index].rp106Percent);
                
                // Update the nonPP input value in the UI
                const nonPPInput = row.children[3].querySelector('input');
                if (nonPPInput) {
                    nonPPInput.value = plannedSplitData[index].nonPPPercent;
                }
            }
            
            updatePlannedSplitTotals(index);
            saveCurrentMonthData();
        });
        rp106PercentCell.appendChild(rp106PercentInput);
        row.appendChild(rp106PercentCell);
        
        // Non PP % column
        const nonPPPercentCell = document.createElement('td');
        const nonPPPercentInput = document.createElement('input');
        nonPPPercentInput.type = 'number';
        nonPPPercentInput.min = '0';
        nonPPPercentInput.max = '100';
        nonPPPercentInput.step = '1';
        nonPPPercentInput.value = weekData.nonPPPercent || 0;
        nonPPPercentInput.addEventListener('input', function() {
            plannedSplitData[index].nonPPPercent = parseFloat(this.value) || 0;
            // Ensure percentages sum to 100
            const total = plannedSplitData[index].rp101Percent + 
                         plannedSplitData[index].rp106Percent + 
                         plannedSplitData[index].nonPPPercent;
            
            if (total !== 100) {
                // Adjust RP 101 percentage to make total 100
                plannedSplitData[index].rp101Percent = Math.max(0, 100 - plannedSplitData[index].rp106Percent - plannedSplitData[index].nonPPPercent);
                
                // Update the RP 101 input value in the UI
                const rp101Input = row.children[1].querySelector('input');
                if (rp101Input) {
                    rp101Input.value = plannedSplitData[index].rp101Percent;
                }
            }
            
            updatePlannedSplitTotals(index);
            saveCurrentMonthData();
        });
        nonPPPercentCell.appendChild(nonPPPercentInput);
        row.appendChild(nonPPPercentCell);
        
        // RP 101 Black Tons column
        const rp101TonsCell = document.createElement('td');
        rp101TonsCell.textContent = weekData.rp101Tons.toFixed(2);
        rp101TonsCell.classList.add('calculated');
        row.appendChild(rp101TonsCell);
        
        // RP 106 White Tons column
        const rp106TonsCell = document.createElement('td');
        rp106TonsCell.textContent = weekData.rp106Tons.toFixed(2);
        rp106TonsCell.classList.add('calculated');
        row.appendChild(rp106TonsCell);
        
        // Non PP Tons column
        const nonPPTonsCell = document.createElement('td');
        nonPPTonsCell.textContent = (weekData.nonPPTons || 0).toFixed(2);
        nonPPTonsCell.classList.add('calculated');
        row.appendChild(nonPPTonsCell);
        
        tableBody.appendChild(row);
    });
    
    updateSplitTotals();
}

// Populate actual split table
function populateActualSplitTable() {
    const tableBody = document.getElementById('actual-split-body');
    tableBody.innerHTML = '';
    
    actualSplitData.forEach((weekData, index) => {
        const row = document.createElement('tr');
        
        // Week column
        const weekCell = document.createElement('td');
        weekCell.textContent = weekData.week;
        row.appendChild(weekCell);
        
        // RP 101 Black % column
        const rp101PercentCell = document.createElement('td');
        const rp101PercentInput = document.createElement('input');
        rp101PercentInput.type = 'number';
        rp101PercentInput.min = '0';
        rp101PercentInput.max = '100';
        rp101PercentInput.step = '1';
        rp101PercentInput.value = weekData.rp101Percent;
        rp101PercentInput.addEventListener('input', function() {
            actualSplitData[index].rp101Percent = parseFloat(this.value) || 0;
            // Ensure percentages sum to 100
            const total = actualSplitData[index].rp101Percent + 
                         actualSplitData[index].rp106Percent + 
                         (actualSplitData[index].nonPPPercent || 0);
            
            if (total !== 100) {
                // Adjust nonPP percentage to make total 100
                actualSplitData[index].nonPPPercent = Math.max(0, 100 - actualSplitData[index].rp101Percent - actualSplitData[index].rp106Percent);
                
                // Update the nonPP input value in the UI
                const nonPPInput = row.children[3].querySelector('input');
                if (nonPPInput) {
                    nonPPInput.value = actualSplitData[index].nonPPPercent;
                }
            }
            
            updateActualSplitTotals(index);
            saveCurrentMonthData();
        });
        rp101PercentCell.appendChild(rp101PercentInput);
        row.appendChild(rp101PercentCell);
        
        // RP 106 White % column
        const rp106PercentCell = document.createElement('td');
        const rp106PercentInput = document.createElement('input');
        rp106PercentInput.type = 'number';
        rp106PercentInput.min = '0';
        rp106PercentInput.max = '100';
        rp106PercentInput.step = '1';
        rp106PercentInput.value = weekData.rp106Percent;
        rp106PercentInput.addEventListener('input', function() {
            actualSplitData[index].rp106Percent = parseFloat(this.value) || 0;
            // Ensure percentages sum to 100
            const total = actualSplitData[index].rp101Percent + 
                         actualSplitData[index].rp106Percent + 
                         (actualSplitData[index].nonPPPercent || 0);
            
            if (total !== 100) {
                // Adjust nonPP percentage to make total 100
                actualSplitData[index].nonPPPercent = Math.max(0, 100 - actualSplitData[index].rp101Percent - actualSplitData[index].rp106Percent);
                
                // Update the nonPP input value in the UI
                const nonPPInput = row.children[3].querySelector('input');
                if (nonPPInput) {
                    nonPPInput.value = actualSplitData[index].nonPPPercent;
                }
            }
            
            updateActualSplitTotals(index);
            saveCurrentMonthData();
        });
        rp106PercentCell.appendChild(rp106PercentInput);
        row.appendChild(rp106PercentCell);
        
        // Non PP % column
        const nonPPPercentCell = document.createElement('td');
        const nonPPPercentInput = document.createElement('input');
        nonPPPercentInput.type = 'number';
        nonPPPercentInput.min = '0';
        nonPPPercentInput.max = '100';
        nonPPPercentInput.step = '1';
        nonPPPercentInput.value = weekData.nonPPPercent || 0;
        nonPPPercentInput.addEventListener('input', function() {
            actualSplitData[index].nonPPPercent = parseFloat(this.value) || 0;
            // Ensure percentages sum to 100
            const total = actualSplitData[index].rp101Percent + 
                         actualSplitData[index].rp106Percent + 
                         actualSplitData[index].nonPPPercent;
            
            if (total !== 100) {
                // Ensure total is 100% by adjusting RP 101
                actualSplitData[index].rp101Percent = Math.max(0, 100 - actualSplitData[index].rp106Percent - actualSplitData[index].nonPPPercent);
                
                // Update the RP 101 input value in the UI
                const rp101Input = row.children[1].querySelector('input');
                if (rp101Input) {
                    rp101Input.value = actualSplitData[index].rp101Percent;
                }
            }
            
            updateActualSplitTotals(index);
            saveCurrentMonthData();
        });
        nonPPPercentCell.appendChild(nonPPPercentInput);
        row.appendChild(nonPPPercentCell);
        
        // RP 101 Black Tons column
        const rp101TonsCell = document.createElement('td');
        rp101TonsCell.textContent = weekData.rp101Tons.toFixed(2);
        rp101TonsCell.classList.add('calculated');
        row.appendChild(rp101TonsCell);
        
        // RP 106 White Tons column
        const rp106TonsCell = document.createElement('td');
        rp106TonsCell.textContent = weekData.rp106Tons.toFixed(2);
        rp106TonsCell.classList.add('calculated');
        row.appendChild(rp106TonsCell);
        
        // Non PP Tons column
        const nonPPTonsCell = document.createElement('td');
        nonPPTonsCell.textContent = (weekData.nonPPTons || 0).toFixed(2);
        nonPPTonsCell.classList.add('calculated');
        row.appendChild(nonPPTonsCell);
        
        tableBody.appendChild(row);
    });
    
    updateSplitTotals();
}

// Update split totals
function updateSplitTotals() {
    updatePlannedSplitTotals();
    updateActualSplitTotals();
}

// Update planned split totals
function updatePlannedSplitTotals(updatedIndex = -1) {
    // Calculate tons based on percentages and production totals
    plannedSplitData.forEach((weekData, index) => {
        const weekProduction = plannedProductionData[index].total;
        weekData.rp101Tons = (weekData.rp101Percent / 100) * weekProduction;
        weekData.rp106Tons = (weekData.rp106Percent / 100) * weekProduction;
        weekData.nonPPTons = (weekData.nonPPPercent / 100) * weekProduction;
        
        // Update the tons in the table
        const tableBody = document.getElementById('planned-split-body');
        if (tableBody.children[index]) {
            tableBody.children[index].children[4].textContent = weekData.rp101Tons.toFixed(2);
            tableBody.children[index].children[5].textContent = weekData.rp106Tons.toFixed(2);
            tableBody.children[index].children[6].textContent = weekData.nonPPTons.toFixed(2);
        }
    });
    
    // Calculate monthly totals
    let rp101Total = 0;
    let rp106Total = 0;
    let nonPPTotal = 0;
    let totalProduction = 0;
    
    plannedSplitData.forEach(weekData => {
        rp101Total += weekData.rp101Tons;
        rp106Total += weekData.rp106Tons;
        nonPPTotal += weekData.nonPPTons;
    });
    
    totalProduction = rp101Total + rp106Total + nonPPTotal;
    
    // Calculate average percentages
    const rp101Percent = totalProduction > 0 ? (rp101Total / totalProduction) * 100 : 0;
    const rp106Percent = totalProduction > 0 ? (rp106Total / totalProduction) * 100 : 0;
    const nonPPPercent = totalProduction > 0 ? (nonPPTotal / totalProduction) * 100 : 0;
    
    // Update footer totals
    document.getElementById('planned-rp101-percent').textContent = rp101Percent.toFixed(1) + '%';
    document.getElementById('planned-rp106-percent').textContent = rp106Percent.toFixed(1) + '%';
    document.getElementById('planned-nonPP-percent').textContent = nonPPPercent.toFixed(1) + '%';
    document.getElementById('planned-rp101-total').textContent = rp101Total.toFixed(2);
    document.getElementById('planned-rp106-total').textContent = rp106Total.toFixed(2);
    document.getElementById('planned-nonPP-total').textContent = nonPPTotal.toFixed(2);
}

// Update actual split totals
function updateActualSplitTotals(updatedIndex = -1) {
    // Calculate tons based on percentages and production totals
    actualSplitData.forEach((weekData, index) => {
        const weekProduction = actualProductionData[index].total;
        weekData.rp101Tons = (weekData.rp101Percent / 100) * weekProduction;
        weekData.rp106Tons = (weekData.rp106Percent / 100) * weekProduction;
        weekData.nonPPTons = (weekData.nonPPPercent / 100) * weekProduction;
        
        // Update the tons in the table
        const tableBody = document.getElementById('actual-split-body');
        if (tableBody.children[index]) {
            tableBody.children[index].children[4].textContent = (weekData.rp101Tons || 0).toFixed(2);
            tableBody.children[index].children[5].textContent = (weekData.rp106Tons || 0).toFixed(2);
            tableBody.children[index].children[6].textContent = (weekData.nonPPTons || 0).toFixed(2);
        }
    });
    
    // Calculate monthly totals
    let rp101Total = 0;
    let rp106Total = 0;
    let nonPPTotal = 0;
    let totalProduction = 0;
    
    actualSplitData.forEach(weekData => {
        rp101Total += weekData.rp101Tons || 0;
        rp106Total += weekData.rp106Tons || 0;
        nonPPTotal += weekData.nonPPTons || 0;
    });
    
    totalProduction = rp101Total + rp106Total + nonPPTotal;
    
    // Calculate average percentages
    const rp101Percent = totalProduction > 0 ? (rp101Total / totalProduction) * 100 : 0;
    const rp106Percent = totalProduction > 0 ? (rp106Total / totalProduction) * 100 : 0;
    const nonPPPercent = totalProduction > 0 ? (nonPPTotal / totalProduction) * 100 : 0;
    
    // Update footer totals
    document.getElementById('actual-rp101-percent').textContent = rp101Percent.toFixed(1) + '%';
    document.getElementById('actual-rp106-percent').textContent = rp106Percent.toFixed(1) + '%';
    document.getElementById('actual-nonPP-percent').textContent = nonPPPercent.toFixed(1) + '%';
    document.getElementById('actual-rp101-total').textContent = rp101Total.toFixed(2);
    document.getElementById('actual-rp106-total').textContent = rp106Total.toFixed(2);
    document.getElementById('actual-nonPP-total').textContent = nonPPTotal.toFixed(2);
}

// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('production-chart').getContext('2d');
    
    productionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], // Will be populated with days of the month
            datasets: [
                {
                    label: 'Actual Production',
                    data: [],
                    backgroundColor: function(context) {
                        const index = context.dataIndex;
                        const value = context.dataset.data[index];
                        const plannedValue = productionChart ? 
                            productionChart.data.datasets[1].data[index] : 0;
                        
                        // Return green if above plan, red if below
                        return value >= plannedValue ? 
                            'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)';
                    },
                    borderColor: function(context) {
                        const index = context.dataIndex;
                        const value = context.dataset.data[index];
                        const plannedValue = productionChart ? 
                            productionChart.data.datasets[1].data[index] : 0;
                        
                        // Return green if above plan, red if below
                        return value >= plannedValue ? 
                            'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)';
                    },
                    borderWidth: 1
                },
                {
                    label: 'Planned Production',
                    data: [],
                    type: 'scatter',
                    pointStyle: 'circle',
                    pointRadius: 6,
                    pointBackgroundColor: 'rgba(52, 176, 176, 1)', // Teal color
                    pointBorderColor: 'rgba(52, 176, 176, 1)', // Teal color
                    borderWidth: 0,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Production (Tons)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Day of Month'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Monthly Production Overview'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw.toFixed(1) + ' Tons';
                        }
                    }
                }
            }
        }
    });
    
    updateChart();
}

// Update chart with current data
function updateChart() {
    if (!productionChart) return;
    
    // Get the month and year being viewed
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    
    // Create labels for each day of the month
    const labels = [];
    for (let i = 1; i <= daysInMonth; i++) {
        labels.push(i);
    }
    
    // Initialize data arrays
    const plannedData = new Array(daysInMonth).fill(0);
    const actualData = new Array(daysInMonth).fill(0);
    
    // Populate planned data - check all weeks, not just those starting in current month
    plannedProductionData.forEach(weekData => {
        const weekStart = weekData.week.split(' - ')[0];
        const weekStartDate = parseDate(weekStart);
        
        // Map day of week to day of month
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach((day, index) => {
            const dayOfMonth = new Date(weekStartDate);
            dayOfMonth.setDate(weekStartDate.getDate() + index);
            
            // Check if this day falls in our target month
            if (dayOfMonth.getMonth() === currentViewMonth && dayOfMonth.getFullYear() === currentViewYear) {
                const dayIndex = dayOfMonth.getDate() - 1; // 0-indexed
                plannedData[dayIndex] = weekData[day];
            }
        });
    });
    
    // Populate actual data - check all weeks, not just those starting in current month
    actualProductionData.forEach(weekData => {
        const weekStart = weekData.week.split(' - ')[0];
        const weekStartDate = parseDate(weekStart);
        
        // Map day of week to day of month
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach((day, index) => {
            const dayOfMonth = new Date(weekStartDate);
            dayOfMonth.setDate(weekStartDate.getDate() + index);
            
            // Check if this day falls in our target month
            if (dayOfMonth.getMonth() === currentViewMonth && dayOfMonth.getFullYear() === currentViewYear) {
                const dayIndex = dayOfMonth.getDate() - 1; // 0-indexed
                actualData[dayIndex] = weekData[day];
            }
        });
    });
    
    // Update chart data
    productionChart.data.labels = labels;
    productionChart.data.datasets[0].data = actualData;
    productionChart.data.datasets[1].data = plannedData;
    
    productionChart.update();
}

// Parse date from format "DD MMM"
function parseDate(dateStr) {
    const parts = dateStr.split(' ');
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    
    const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = months[monthStr];
    const year = currentViewYear;
    
    // Handle year transition for dates in adjacent months
    // If we're viewing January (0) and the parsed month is December (11), it's from the previous year
    let adjustedYear = year;
    if (currentViewMonth === 0 && month === 11) {
        adjustedYear = year - 1;
    }
    // If we're viewing December (11) and the parsed month is January (0), it's from the next year
    else if (currentViewMonth === 11 && month === 0) {
        adjustedYear = year + 1;
    }
    
    return new Date(adjustedYear, month, day);
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('Found tab buttons:', tabButtons.length);
    
    // Remove any existing click listeners to prevent duplicates
    tabButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Add fresh click listeners
    document.querySelectorAll('.tab-btn').forEach(button => {
        console.log('Adding click listener to button:', button.getAttribute('data-tab'));
        button.addEventListener('click', function(event) {
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Tab button clicked:', this.getAttribute('data-tab'));
            const tabId = this.getAttribute('data-tab');
            
            // Get parent tabs container to scope our selectors
            const tabsContainer = this.closest('.tabs').parentNode;
            
            // Remove active class from all buttons in this tab group
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Remove active class from all tab contents in this section
            tabsContainer.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Find the tab content element
            const tabElement = tabsContainer.querySelector('#' + tabId + '-tab');
            
            console.log('Tab element to activate:', tabId + '-tab', tabElement);
            if (tabElement) {
                tabElement.classList.add('active');
            } else {
                console.error('Tab element not found:', tabId + '-tab');
            }
        });
    });
    
    // Previous month button
    const prevMonthBtn = document.getElementById('prev-month');
    console.log('Previous month button:', prevMonthBtn);
    
    // Remove any existing click listeners to prevent duplicates
    if (prevMonthBtn) {
        const newPrevMonthBtn = prevMonthBtn.cloneNode(true);
        prevMonthBtn.parentNode.replaceChild(newPrevMonthBtn, prevMonthBtn);
        
        // Add fresh click listener
        document.getElementById('prev-month').addEventListener('click', function(event) {
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Previous month button clicked');
            // Save current month data before switching
            saveCurrentMonthData();
            
            // Go to previous month
            currentViewMonth--;
            if (currentViewMonth < 0) {
                currentViewMonth = 11; // December
                currentViewYear--;
            }
            
            // Update display and load data
            updateMonthDisplay();
            weeks = getWeeksInMonth(currentViewMonth, currentViewYear);
            loadMonthData(currentViewMonth, currentViewYear);
        });
    } else {
        console.error('Previous month button not found');
    }
    
    // Next month button
    const nextMonthBtn = document.getElementById('next-month');
    console.log('Next month button:', nextMonthBtn);
    
    // Remove any existing click listeners to prevent duplicates
    if (nextMonthBtn) {
        const newNextMonthBtn = nextMonthBtn.cloneNode(true);
        nextMonthBtn.parentNode.replaceChild(newNextMonthBtn, nextMonthBtn);
        
        // Add fresh click listener
        document.getElementById('next-month').addEventListener('click', function(event) {
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Next month button clicked');
            // Save current month data before switching
            saveCurrentMonthData();
            
            // Go to next month
            currentViewMonth++;
            if (currentViewMonth > 11) {
                currentViewMonth = 0; // January
                currentViewYear++;
            }
            
            // Update display and load data
            updateMonthDisplay();
            weeks = getWeeksInMonth(currentViewMonth, currentViewYear);
            loadMonthData(currentViewMonth, currentViewYear);
        });
    } else {
        console.error('Next month button not found');
    }
    
    // Current month button
    const currentMonthBtn = document.getElementById('current-month-btn');
    console.log('Current month button:', currentMonthBtn);
    
    // Remove any existing click listeners to prevent duplicates
    if (currentMonthBtn) {
        const newCurrentMonthBtn = currentMonthBtn.cloneNode(true);
        currentMonthBtn.parentNode.replaceChild(newCurrentMonthBtn, currentMonthBtn);
        
        // Add fresh click listener
        document.getElementById('current-month-btn').addEventListener('click', function(event) {
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Current month button clicked');
            // Save current month data before switching
            saveCurrentMonthData();
            
            // Go to current month
            const currentDate = new Date();
            currentViewMonth = currentDate.getMonth();
            currentViewYear = currentDate.getFullYear();
            
            // Update display and load data
            updateMonthDisplay();
            weeks = getWeeksInMonth(currentViewMonth, currentViewYear);
            loadMonthData(currentViewMonth, currentViewYear);
        });
    } else {
        console.error('Current month button not found');
    }
    
    // Save button
    document.getElementById('save-btn').addEventListener('click', async function() {
        saveCurrentMonthData();
        
        // Save to Firestore
        const success = await saveDataToStorage();
        
        if (success) {
            alert('Data saved successfully to cloud storage!');
        } else {
            alert('Data saved to local storage only. Cloud storage failed.');
        }
    });
    
    // Load button
    document.getElementById('load-btn').addEventListener('click', async function() {
        const success = await loadDataFromStorage();
        
        if (success) {
            alert('Data loaded successfully!');
        } else {
            alert('No saved data found.');
            // Initialize data structures if no data found
            initializeDataStructures();
            populateTables();
            updateChart();
        }
    });
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', function() {
        exportToExcel();
    });
}

// Update the month display
function updateMonthDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month-display').textContent = `${monthNames[currentViewMonth]} ${currentViewYear}`;
}

// Save current month's data to the allMonthsData object
function saveCurrentMonthData() {
    const monthKey = `${currentViewYear}-${currentViewMonth}`;
    
    // Store the current month's data
    allMonthsData[monthKey] = {
        rawMaterialData: [...rawMaterialData],
        plannedProductionData: [...plannedProductionData],
        actualProductionData: [...actualProductionData],
        plannedSplitData: [...plannedSplitData],
        actualSplitData: [...actualSplitData]
    };
    
    // Handle weeks that cross month boundaries
    // For each week in the current month's data
    weeks.forEach((week, index) => {
        const weekStart = week.startDate;
        const weekEnd = week.endDate;
        
        // Check if this week spans into previous or next month
        const weekStartMonth = weekStart.getMonth();
        const weekStartYear = weekStart.getFullYear();
        const weekEndMonth = weekEnd.getMonth();
        const weekEndYear = weekEnd.getFullYear();
        
        // If week starts in a different month than current view
        if (weekStartMonth !== currentViewMonth || weekStartYear !== currentViewYear) {
            const otherMonthKey = `${weekStartYear}-${weekStartMonth}`;
            
            // If we have data for that month, update the week data
            if (allMonthsData[otherMonthKey]) {
                // Find the matching week in the other month's data
                const otherMonthWeeks = getWeeksInMonth(weekStartMonth, weekStartYear);
                const matchingWeekIndex = otherMonthWeeks.findIndex(w => w.label === week.label);
                
                if (matchingWeekIndex !== -1 && allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex]) {
                    // Update the data for this week in the other month
                    allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex] = {...rawMaterialData[index]};
                    allMonthsData[otherMonthKey].plannedProductionData[matchingWeekIndex] = {...plannedProductionData[index]};
                    allMonthsData[otherMonthKey].actualProductionData[matchingWeekIndex] = {...actualProductionData[index]};
                    allMonthsData[otherMonthKey].plannedSplitData[matchingWeekIndex] = {...plannedSplitData[index]};
                    allMonthsData[otherMonthKey].actualSplitData[matchingWeekIndex] = {...actualSplitData[index]};
                }
            }
        }
        
        // If week ends in a different month than current view
        if (weekEndMonth !== currentViewMonth || weekEndYear !== currentViewYear) {
            const otherMonthKey = `${weekEndYear}-${weekEndMonth}`;
            
            // If we have data for that month, update the week data
            if (allMonthsData[otherMonthKey]) {
                // Find the matching week in the other month's data
                const otherMonthWeeks = getWeeksInMonth(weekEndMonth, weekEndYear);
                const matchingWeekIndex = otherMonthWeeks.findIndex(w => w.label === week.label);
                
                if (matchingWeekIndex !== -1 && allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex]) {
                    // Update the data for this week in the other month
                    allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex] = {...rawMaterialData[index]};
                    allMonthsData[otherMonthKey].plannedProductionData[matchingWeekIndex] = {...plannedProductionData[index]};
                    allMonthsData[otherMonthKey].actualProductionData[matchingWeekIndex] = {...actualProductionData[index]};
                    allMonthsData[otherMonthKey].plannedSplitData[matchingWeekIndex] = {...plannedSplitData[index]};
                    allMonthsData[otherMonthKey].actualSplitData[matchingWeekIndex] = {...actualSplitData[index]};
                }
            }
        }
    });
}

// Load data for the specified month from allMonthsData
function loadMonthData(month, year) {
    const monthKey = `${year}-${month}`;
    
    if (allMonthsData[monthKey]) {
        // Load data from the stored month data
        rawMaterialData = [...allMonthsData[monthKey].rawMaterialData];
        plannedProductionData = [...allMonthsData[monthKey].plannedProductionData];
        actualProductionData = [...allMonthsData[monthKey].actualProductionData];
        plannedSplitData = [...allMonthsData[monthKey].plannedSplitData];
        actualSplitData = [...allMonthsData[monthKey].actualSplitData];
    } else {
        // Initialize new data structures for this month
        initializeDataStructures();
    }
    
    // Check for weeks that cross month boundaries and merge data from adjacent months
    weeks.forEach((week, index) => {
        const weekStart = week.startDate;
        const weekEnd = week.endDate;
        
        // Check if this week spans into previous or next month
        const weekStartMonth = weekStart.getMonth();
        const weekStartYear = weekStart.getFullYear();
        const weekEndMonth = weekEnd.getMonth();
        const weekEndYear = weekEnd.getFullYear();
        
        // If week starts in a different month than current view
        if (weekStartMonth !== month || weekStartYear !== year) {
            const otherMonthKey = `${weekStartYear}-${weekStartMonth}`;
            
            // If we have data for that month, check for matching week data
            if (allMonthsData[otherMonthKey]) {
                // Find the matching week in the other month's data
                const otherMonthWeeks = getWeeksInMonth(weekStartMonth, weekStartYear);
                const matchingWeekIndex = otherMonthWeeks.findIndex(w => w.label === week.label);
                
                if (matchingWeekIndex !== -1 && allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex]) {
                    // Use the data from the other month for this week
                    rawMaterialData[index] = {...allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex]};
                    plannedProductionData[index] = {...allMonthsData[otherMonthKey].plannedProductionData[matchingWeekIndex]};
                    actualProductionData[index] = {...allMonthsData[otherMonthKey].actualProductionData[matchingWeekIndex]};
                    plannedSplitData[index] = {...allMonthsData[otherMonthKey].plannedSplitData[matchingWeekIndex]};
                    actualSplitData[index] = {...allMonthsData[otherMonthKey].actualSplitData[matchingWeekIndex]};
                }
            }
        }
        
        // If week ends in a different month than current view
        if (weekEndMonth !== month || weekEndYear !== year) {
            const otherMonthKey = `${weekEndYear}-${weekEndMonth}`;
            
            // If we have data for that month, check for matching week data
            if (allMonthsData[otherMonthKey]) {
                // Find the matching week in the other month's data
                const otherMonthWeeks = getWeeksInMonth(weekEndMonth, weekEndYear);
                const matchingWeekIndex = otherMonthWeeks.findIndex(w => w.label === week.label);
                
                if (matchingWeekIndex !== -1 && allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex]) {
                    // Use the data from the other month for this week
                    rawMaterialData[index] = {...allMonthsData[otherMonthKey].rawMaterialData[matchingWeekIndex]};
                    plannedProductionData[index] = {...allMonthsData[otherMonthKey].plannedProductionData[matchingWeekIndex]};
                    actualProductionData[index] = {...allMonthsData[otherMonthKey].actualProductionData[matchingWeekIndex]};
                    plannedSplitData[index] = {...allMonthsData[otherMonthKey].plannedSplitData[matchingWeekIndex]};
                    actualSplitData[index] = {...allMonthsData[otherMonthKey].actualSplitData[matchingWeekIndex]};
                }
            }
        }
    });
    
    // Repopulate tables
    populateTables();
    
    // Update chart
    updateChart();
}

// Save all months data to Firestore and localStorage as backup
async function saveDataToStorage() {
    // Save current month's data before storing everything
    saveCurrentMonthData();
    
    // Save to localStorage as backup
    localStorage.setItem('productionPlanningAllMonthsData', JSON.stringify(allMonthsData));
    
    // Save to Firestore
    const { saveDataToFirestore } = await import('./firebase-service.js');
    const success = await saveDataToFirestore(allMonthsData);
    
    return success;
}

// Load data from Firestore or localStorage as fallback
async function loadDataFromStorage() {
    // Try to load from Firestore first
    const { loadDataFromFirestore } = await import('./firebase-service.js');
    const firestoreData = await loadDataFromFirestore();
    
    if (firestoreData) {
        allMonthsData = firestoreData;
        loadMonthData(currentViewMonth, currentViewYear);
        return true;
    }
    
    // Fall back to localStorage if Firestore fails
    const savedData = localStorage.getItem('productionPlanningAllMonthsData');
    
    if (savedData) {
        allMonthsData = JSON.parse(savedData);
        loadMonthData(currentViewMonth, currentViewYear);
        return true;
    }
    
    return false;
}

// Export data to Excel
function exportToExcel() {
    // Create a CSV string
    let csv = 'data:text/csv;charset=utf-8,';
    
    // Get month and year for filename
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[currentViewMonth];
    const fileName = `Production_Planning_${monthName}_${currentViewYear}.csv`;
    
    // Add Raw Material section
    csv += 'Raw Material Received Per Week\n';
    csv += 'Week,PCW,PIW,Total,End of Week Stock\n';
    
    rawMaterialData.forEach(weekData => {
        csv += `"${weekData.week}",${weekData.pcw},${weekData.piw},${weekData.total},${weekData.eowStock}\n`;
    });
    
    csv += '\n';
    
    // Add Planned Production section
    csv += 'Planned Daily Production\n';
    csv += 'Week,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday,Total\n';
    
    plannedProductionData.forEach(weekData => {
        csv += `"${weekData.week}",${weekData.monday},${weekData.tuesday},${weekData.wednesday},${weekData.thursday},${weekData.friday},${weekData.saturday},${weekData.sunday},${weekData.total}\n`;
    });
    
    csv += '\n';
    
    // Add Actual Production section
    csv += 'Actual Daily Production\n';
    csv += 'Week,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday,Total\n';
    
    actualProductionData.forEach(weekData => {
        csv += `"${weekData.week}",${weekData.monday},${weekData.tuesday},${weekData.wednesday},${weekData.thursday},${weekData.friday},${weekData.saturday},${weekData.sunday},${weekData.total}\n`;
    });
    
    csv += '\n';
    
    // Add Planned Split section
    csv += 'Planned Product Split\n';
    csv += 'Week,RP 101 Black (%),RP 106 White (%),Non PP (%),RP 101 Black (Tons),RP 106 White (Tons),Non PP (Tons)\n';
    
    plannedSplitData.forEach(weekData => {
        csv += `"${weekData.week}",${weekData.rp101Percent},${weekData.rp106Percent},${weekData.nonPPPercent},${weekData.rp101Tons},${weekData.rp106Tons},${weekData.nonPPTons}\n`;
    });
    
    csv += '\n';
    
    // Add Actual Split section
    csv += 'Actual Product Split\n';
    csv += 'Week,RP 101 Black (%),RP 106 White (%),Non PP (%),RP 101 Black (Tons),RP 106 White (Tons),Non PP (Tons)\n';
    
    actualSplitData.forEach(weekData => {
        csv += `"${weekData.week}",${weekData.rp101Percent},${weekData.rp106Percent},${weekData.nonPPPercent},${weekData.rp101Tons},${weekData.rp106Tons},${weekData.nonPPTons}\n`;
    });
    
    // Create a download link
    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}

// Load sample data for demonstration
function loadSampleData() {
    // Sample raw material data
    rawMaterialData.forEach((weekData, index) => {
        weekData.pcw = 160;
        weekData.piw = 40;
        weekData.total = 200;
        weekData.eowStock = 0;
    });
    
    // Sample planned production data
    plannedProductionData.forEach((weekData, index) => {
        weekData.monday = 25;
        weekData.tuesday = 50;
        weekData.wednesday = 0;
        weekData.thursday = 0;
        weekData.friday = 25;
        weekData.saturday = 50;
        weekData.sunday = 50;
        weekData.total = 200;
    });
    
    // Sample actual production data for first week only
    if (actualProductionData.length > 0) {
        actualProductionData[0].monday = 36.3;
        actualProductionData[0].tuesday = 30.9;
        actualProductionData[0].total = 67.2;
    }
    
    // Sample planned split data
    plannedSplitData.forEach((weekData, index) => {
        weekData.rp101Percent = 65;
        weekData.rp106Percent = 29;
        weekData.nonPPPercent = 6;
    });
    
    // Sample actual split data for first week only
    if (actualSplitData.length > 0) {
        actualSplitData[0].rp101Percent = 75;
        actualSplitData[0].rp106Percent = 20;
        actualSplitData[0].nonPPPercent = 5;
    }
    
    // Repopulate tables
    populateTables();
    
    // Update chart
    updateChart();
}

// Load sample data on first run
if (!localStorage.getItem('productionPlanningData')) {
    // Wait for tables to be populated
    setTimeout(loadSampleData, 500);
}