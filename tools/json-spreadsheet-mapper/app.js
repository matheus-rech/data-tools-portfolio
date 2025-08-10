// JSON to Spreadsheet Field Mapper - Main JavaScript

class JSONSpreadsheetMapper {
    constructor() {
        this.spreadsheetColumns = [
            "PDF_Name", "study_design", "total_patients", "age_info", "gender_distribution", 
            "initial_neurological_status", "inclusion_exclusion_criteria", "procedure_type", 
            "additional_procedures", "timing_of_surgery", "criteria_for_intervention",
            "neurological_status_measures", "functional_outcome_measures", "survival_rates",
            "complications", "assessment_timepoints", "min_followup", "max_followup",
            "median_mean_followup", "neurological_improvement", "functional_outcomes",
            "mortality_rates", "research_question", "indication_for_surgery",
            "any_non_cerebellar_stroke_areas", "peak_swell_window", "stroke_volume",
            "predictors_poor_outcome_surgical_group"
        ];

        // Load PDF names from localStorage or use defaults
        this.loadPDFNames();
        
        // Spreadsheet data storage
        this.worksheets = this.loadWorksheets();
        this.currentWorksheet = this.getCurrentWorksheet();

        this.exampleJSON = {
            "study_design": "Data was retrospectively collected from patient records, CT/MRI scans and surgical protocols.",
            "patient_characteristics": {
                "total_patients": 22,
                "age_info": "Median age was 53 years (IQR 32-72 years).",
                "gender_distribution": "16 male, 6 female",
                "initial_neurological_status": "Preoperatively, median GCS was 8 (IQR 5-10) and 12 patients had a GCS <= 8."
            },
            "surgical_procedure_details": {
                "procedure_type": "Suboccipital decompressive craniectomy (SDC)",
                "additional_procedures": "All 22 patients were treated with external ventricular drainage",
                "timing_of_surgery": "Median time from symptom onset to SDC surgery was 48 h (IQR 28-99 hours)"
            },
            "key_clinical_outcomes": {
                "mortality_rates": "Seven of the 22 patients were dead",
                "functional_outcomes": "At one-year follow-up, 12/22 patients had favorable functional outcome (mRS 0-3)"
            }
        };

        this.currentMappings = [];
        this.flattenedJSON = {};
        
        this.initializeApp();
    }
    
    // PDF Name Management
    loadPDFNames() {
        const saved = localStorage.getItem('pdfNamesList');
        if (saved) {
            this.pdfNames = JSON.parse(saved);
        } else {
            // Default PDF names
            this.pdfNames = [
                "Lindeskog2018.pdf", "Champeaux2019.pdf", "Chen1992.pdf", "Fernandes2022.pdf",
                "Hernandez-Duranetal..pdf", "HernandezDuran2023.pdf", "Hornig1994.pdf", "Jauss1999.pdf",
                "Kim2016.pdf", "Kudo2007(1).pdf", "Kwon2021.pdf", "Lee2019.pdf", "Mattar2021.pdf",
                "Pfefferkorn2009.pdf", "Raco2003.pdf", "Taylor2020.pdf", "Tsitsopoulos2011_2.pdf",
                "Tsitsopoulos2011.pdf", "Wang2022.pdf", "Winslow2023.pdf", "Won2023.pdf",
                "wonetal..pdf", "Won2024.pdf", "Wu2023.pdf"
            ];
        }
    }
    
    savePDFNames() {
        localStorage.setItem('pdfNamesList', JSON.stringify(this.pdfNames));
    }
    
    addPDFName(name) {
        if (!this.pdfNames.includes(name)) {
            this.pdfNames.push(name);
            this.pdfNames.sort();
            this.savePDFNames();
            this.populatePDFDropdown();
        }
    }
    
    removePDFName(name) {
        const index = this.pdfNames.indexOf(name);
        if (index > -1) {
            this.pdfNames.splice(index, 1);
            this.savePDFNames();
            this.populatePDFDropdown();
        }
    }
    
    // Worksheet Management
    loadWorksheets() {
        const saved = localStorage.getItem('worksheets');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            'default': {
                name: 'Default Worksheet',
                data: [],
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }
        };
    }
    
    getCurrentWorksheet() {
        const current = localStorage.getItem('currentWorksheet') || 'default';
        if (!this.worksheets[current]) {
            return 'default';
        }
        return current;
    }
    
    saveWorksheets() {
        localStorage.setItem('worksheets', JSON.stringify(this.worksheets));
        localStorage.setItem('currentWorksheet', this.currentWorksheet);
    }
    
    createWorksheet(name) {
        const id = Date.now().toString();
        this.worksheets[id] = {
            name: name,
            data: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        this.currentWorksheet = id;
        this.saveWorksheets();
        return id;
    }
    
    switchWorksheet(id) {
        if (this.worksheets[id]) {
            this.currentWorksheet = id;
            this.saveWorksheets();
            this.updateSpreadsheetView();
        }
    }
    
    deleteWorksheet(id) {
        if (id !== 'default' && this.worksheets[id]) {
            delete this.worksheets[id];
            if (this.currentWorksheet === id) {
                this.currentWorksheet = 'default';
            }
            this.saveWorksheets();
            this.updateSpreadsheetView();
        }
    }
    
    // Add row to current worksheet
    addRowToWorksheet(pdfName, mappedFields) {
        const worksheet = this.worksheets[this.currentWorksheet];
        const row = {
            id: Date.now(),
            PDF_Name: pdfName
        };
        
        // Add all mapped fields to row
        mappedFields.forEach(field => {
            row[field.spreadsheetColumn] = field.value;
        });
        
        // Add empty values for unmapped columns
        this.spreadsheetColumns.forEach(col => {
            if (!(col in row)) {
                row[col] = '';
            }
        });
        
        worksheet.data.push(row);
        worksheet.modified = new Date().toISOString();
        this.saveWorksheets();
        
        return row;
    }
    
    // Remove row from worksheet
    removeRowFromWorksheet(rowId) {
        const worksheet = this.worksheets[this.currentWorksheet];
        worksheet.data = worksheet.data.filter(row => row.id !== rowId);
        worksheet.modified = new Date().toISOString();
        this.saveWorksheets();
        this.updateSpreadsheetView();
    }
    
    // Update spreadsheet view
    updateSpreadsheetView() {
        // This will be called to refresh the UI when worksheet changes
        const event = new CustomEvent('worksheetChanged', {
            detail: {
                worksheet: this.worksheets[this.currentWorksheet],
                worksheetId: this.currentWorksheet
            }
        });
        document.dispatchEvent(event);
    }

    initializeApp() {
        this.populatePDFDropdown();
        this.bindEventListeners();
        this.loadSavedData();
        
        // Auto-save setup
        this.setupAutoSave();
        
        // Initialize spreadsheet view
        this.renderSpreadsheetView();
        
        // Listen for worksheet changes
        document.addEventListener('worksheetChanged', () => {
            this.renderSpreadsheetView();
        });
    }
    
    renderSpreadsheetView() {
        const worksheet = this.worksheets[this.currentWorksheet];
        const container = document.getElementById('spreadsheet-view');
        const worksheetNameEl = document.getElementById('worksheet-name');
        const rowCountEl = document.getElementById('row-count');
        
        // Update worksheet name
        worksheetNameEl.textContent = worksheet.name;
        rowCountEl.textContent = `${worksheet.data.length} row${worksheet.data.length !== 1 ? 's' : ''}`;
        
        if (worksheet.data.length === 0) {
            container.innerHTML = '<div class="no-data-message">No data yet. Process JSON data above to add rows.</div>';
            return;
        }
        
        // Create table
        const table = document.createElement('table');
        table.className = 'spreadsheet-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Actions</th>';
        
        // Only show first few columns to fit screen
        const displayColumns = ['PDF_Name', 'study_design', 'total_patients', 'procedure_type', 'mortality_rates'];
        displayColumns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        headerRow.innerHTML += '<th>...</th>';
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        worksheet.data.forEach(row => {
            const tr = document.createElement('tr');
            
            // Actions column
            tr.innerHTML = `
                <td>
                    <button class="btn-delete" onclick="mapper.removeRowFromWorksheet(${row.id})" title="Delete row">🗑️</button>
                </td>
            `;
            
            // Data columns
            displayColumns.forEach(col => {
                const td = document.createElement('td');
                const value = row[col] || '';
                td.textContent = this.truncateText(String(value), 30);
                td.title = String(value);
                tr.appendChild(td);
            });
            
            // More indicator
            tr.innerHTML += '<td>...</td>';
            
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        container.innerHTML = '';
        container.appendChild(table);
    }
    
    showWorksheetManager() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const worksheetsList = Object.entries(this.worksheets).map(([id, ws]) => `
            <div class="worksheet-item ${id === this.currentWorksheet ? 'active' : ''}">
                <span class="worksheet-name">${ws.name}</span>
                <span class="worksheet-info">${ws.data.length} rows</span>
                <div class="worksheet-actions">
                    ${id === this.currentWorksheet ? '<span class="current-badge">Current</span>' : 
                      `<button onclick="mapper.switchWorksheet('${id}')">Switch</button>`}
                    ${id !== 'default' ? `<button onclick="mapper.deleteWorksheet('${id}')">Delete</button>` : ''}
                </div>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Worksheet Manager</h2>
                <div class="worksheets-list">
                    ${worksheetsList}
                </div>
                <div class="worksheet-create">
                    <input type="text" id="new-worksheet-name" placeholder="New worksheet name...">
                    <button onclick="mapper.createWorksheetFromModal()">Create New Worksheet</button>
                </div>
                <button class="modal-close">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                modal.remove();
            }
        });
    }
    
    createWorksheetFromModal() {
        const input = document.getElementById('new-worksheet-name');
        const name = input.value.trim();
        
        if (name) {
            this.createWorksheet(name);
            document.querySelector('.modal-overlay').remove();
            this.renderSpreadsheetView();
        }
    }
    
    setupAutoSave() {
        // Save data periodically
        setInterval(() => {
            this.saveToLocalStorage();
        }, 5000); // Auto-save every 5 seconds
        
        // Save before page unload
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
    }
    
    saveToLocalStorage() {
        const jsonInput = document.getElementById('json-input').value;
        const pdfName = document.getElementById('pdf-name').value;
        
        if (jsonInput || pdfName) {
            const savedData = {
                jsonInput: jsonInput,
                pdfName: pdfName,
                exactMatch: document.getElementById('exact-match').checked,
                partialMatch: document.getElementById('partial-match').checked,
                caseInsensitive: document.getElementById('case-insensitive').checked,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('jsonMapperData', JSON.stringify(savedData));
        }
    }
    
    loadSavedData() {
        const saved = localStorage.getItem('jsonMapperData');
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                // Check if data is less than 24 hours old
                const savedTime = new Date(data.timestamp);
                const now = new Date();
                const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    // Restore form data
                    document.getElementById('json-input').value = data.jsonInput || '';
                    document.getElementById('pdf-name').value = data.pdfName || '';
                    document.getElementById('exact-match').checked = data.exactMatch !== false;
                    document.getElementById('partial-match').checked = data.partialMatch !== false;
                    document.getElementById('case-insensitive').checked = data.caseInsensitive !== false;
                    
                    // Process if JSON exists
                    if (data.jsonInput) {
                        this.validateAndProcessJSON();
                    }
                    
                    // Show notification
                    this.showDataRestoredNotification();
                } else {
                    // Data too old, load example instead
                    this.loadExampleData();
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
                this.loadExampleData();
            }
        } else {
            // No saved data, load example
            this.loadExampleData();
        }
    }
    
    showDataRestoredNotification() {
        const notification = document.createElement('div');
        notification.className = 'restore-notification';
        notification.innerHTML = `
            <span>✓ Previous session restored</span>
            <button onclick="mapper.clearSavedData()" class="clear-saved">Clear</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    clearSavedData() {
        localStorage.removeItem('jsonMapperData');
        this.clearJSONInput();
        
        // Remove notification if exists
        const notification = document.querySelector('.restore-notification');
        if (notification) {
            notification.remove();
        }
    }

    populatePDFDropdown() {
        const select = document.getElementById('pdf-name');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select a PDF/Study...</option>';
        
        // Add existing PDF names
        this.pdfNames.forEach(pdfName => {
            const option = document.createElement('option');
            option.value = pdfName;
            option.textContent = pdfName;
            select.appendChild(option);
        });
        
        // Add separator and "Add new..." option
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────';
        select.appendChild(separator);
        
        const addNewOption = document.createElement('option');
        addNewOption.value = '__add_new__';
        addNewOption.textContent = '➕ Add new PDF name...';
        select.appendChild(addNewOption);
    }

    bindEventListeners() {
        // JSON input validation
        document.getElementById('json-input').addEventListener('input', () => {
            this.validateAndProcessJSON();
        });

        // Load example button
        document.getElementById('load-example').addEventListener('click', () => {
            this.loadExampleData();
        });

        // Clear JSON button
        document.getElementById('clear-json').addEventListener('click', () => {
            this.clearJSONInput();
        });

        // Mapping option checkboxes
        ['exact-match', 'partial-match', 'case-insensitive'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateMappings();
            });
        });

        // Toggle mapping details
        document.getElementById('toggle-details').addEventListener('click', (e) => {
            this.toggleMappingDetails(e.target);
        });

        // Insert data button
        document.getElementById('insert-data').addEventListener('click', () => {
            this.insertData();
        });

        // PDF name selection
        document.getElementById('pdf-name').addEventListener('change', (e) => {
            if (e.target.value === '__add_new__') {
                const newName = prompt('Enter new PDF/Study name:');
                if (newName && newName.trim()) {
                    this.addPDFName(newName.trim());
                    e.target.value = newName.trim();
                } else {
                    e.target.value = '';
                }
            }
            this.updateInsertButtonState();
        });
    }

    loadExampleData() {
        const jsonInput = document.getElementById('json-input');
        const pdfSelect = document.getElementById('pdf-name');
        
        jsonInput.value = JSON.stringify(this.exampleJSON, null, 2);
        pdfSelect.value = this.pdfNames[0]; // Select first PDF as example
        
        this.validateAndProcessJSON();
    }

    clearJSONInput() {
        const jsonInput = document.getElementById('json-input');
        const resultsSection = document.getElementById('results-section');
        
        jsonInput.value = '';
        resultsSection.classList.add('hidden');
        
        this.updateValidationStatus('');
        this.clearMappingPreview();
        this.updateStatistics(0, 0, 0);
        this.updateInsertButtonState();
        
        // Clear saved data
        localStorage.removeItem('jsonMapperData');
    }

    validateAndProcessJSON() {
        const jsonInput = document.getElementById('json-input');
        const jsonText = jsonInput.value.trim();

        if (!jsonText) {
            this.updateValidationStatus('');
            this.clearMappingPreview();
            this.updateStatistics(0, 0, 0);
            this.updateInsertButtonState();
            return;
        }

        try {
            const jsonData = JSON.parse(jsonText);
            this.updateValidationStatus('✓ Valid JSON', true);
            this.flattenedJSON = this.flattenObject(jsonData);
            this.updateMappings();
        } catch (error) {
            this.updateValidationStatus('✗ Invalid JSON', false);
            this.clearMappingPreview();
            this.updateStatistics(0, 0, 0);
            this.updateInsertButtonState();
        }
    }

    updateValidationStatus(message, isValid = null) {
        const statusElement = document.getElementById('json-status');
        statusElement.textContent = message;
        statusElement.className = 'validation-status';
        
        if (isValid === true) {
            statusElement.classList.add('valid');
        } else if (isValid === false) {
            statusElement.classList.add('invalid');
        }
    }

    flattenObject(obj, prefix = '') {
        const flattened = {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    Object.assign(flattened, this.flattenObject(value, newKey));
                } else {
                    // For flattened keys, prefer the final key name for matching
                    const finalKey = newKey.split('.').pop();
                    flattened[finalKey] = value;
                }
            }
        }
        
        return flattened;
    }

    updateMappings() {
        if (Object.keys(this.flattenedJSON).length === 0) {
            return;
        }

        const exactMatch = document.getElementById('exact-match').checked;
        const partialMatch = document.getElementById('partial-match').checked;
        const caseInsensitive = document.getElementById('case-insensitive').checked;

        this.currentMappings = this.generateMappings(exactMatch, partialMatch, caseInsensitive);
        this.displayMappingPreview();
        this.updateStatistics();
        this.updateInsertButtonState();
    }

    generateMappings(exactMatch, partialMatch, caseInsensitive) {
        const mappings = [];
        const jsonFields = Object.keys(this.flattenedJSON);

        jsonFields.forEach(jsonField => {
            let bestMatch = null;
            let matchType = 'none';

            // Try exact match first
            if (exactMatch) {
                const exactMatches = this.spreadsheetColumns.filter(col => {
                    return caseInsensitive ? 
                        col.toLowerCase() === jsonField.toLowerCase() : 
                        col === jsonField;
                });

                if (exactMatches.length > 0) {
                    bestMatch = exactMatches[0];
                    matchType = 'exact';
                }
            }

            // Try partial match if no exact match found
            if (!bestMatch && partialMatch) {
                const partialMatches = this.spreadsheetColumns.filter(col => {
                    const colToCheck = caseInsensitive ? col.toLowerCase() : col;
                    const fieldToCheck = caseInsensitive ? jsonField.toLowerCase() : jsonField;
                    
                    return colToCheck.includes(fieldToCheck) || fieldToCheck.includes(colToCheck);
                });

                if (partialMatches.length > 0) {
                    bestMatch = partialMatches[0];
                    matchType = 'partial';
                }
            }

            mappings.push({
                jsonField,
                spreadsheetColumn: bestMatch,
                matchType,
                value: this.flattenedJSON[jsonField]
            });
        });

        return mappings;
    }

    displayMappingPreview() {
        const previewContainer = document.getElementById('mapping-preview');
        
        if (this.currentMappings.length === 0) {
            previewContainer.innerHTML = '<div class="no-data-message">Enter JSON data to see field mappings</div>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'mapping-table';

        // Create header
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>JSON Field</th>
            <th>Spreadsheet Column</th>
            <th>Match Type</th>
            <th>Sample Value</th>
        `;
        table.appendChild(headerRow);

        // Create rows for each mapping
        this.currentMappings.forEach(mapping => {
            const row = document.createElement('tr');
            row.className = `mapping-row ${mapping.matchType}-match`;

            const sampleValue = this.truncateText(String(mapping.value), 30);
            const matchTypeClass = mapping.matchType === 'exact' ? 'exact' : 
                                 mapping.matchType === 'partial' ? 'partial' : 'none';

            row.innerHTML = `
                <td class="text-mono">${mapping.jsonField}</td>
                <td>${mapping.spreadsheetColumn || 'No match'}</td>
                <td><span class="match-type ${matchTypeClass}">${mapping.matchType}</span></td>
                <td class="text-truncate" title="${this.escapeHtml(String(mapping.value))}">${sampleValue}</td>
            `;

            table.appendChild(row);
        });

        previewContainer.innerHTML = '';
        previewContainer.appendChild(table);
    }

    updateStatistics(jsonFields, mapped, unmapped) {
        if (arguments.length === 0) {
            jsonFields = this.currentMappings.length;
            mapped = this.currentMappings.filter(m => m.matchType !== 'none').length;
            unmapped = jsonFields - mapped;
        }

        document.getElementById('json-fields-count').textContent = jsonFields;
        document.getElementById('mapped-count').textContent = mapped;
        document.getElementById('unmapped-count').textContent = unmapped;
    }

    clearMappingPreview() {
        const previewContainer = document.getElementById('mapping-preview');
        previewContainer.innerHTML = '<div class="no-data-message">Enter JSON data to see field mappings</div>';
    }

    toggleMappingDetails(button) {
        const detailsSection = document.getElementById('mapping-details');
        const detailsContent = document.getElementById('details-content');

        if (detailsSection.classList.contains('hidden')) {
            // Show details
            const details = this.generateMappingDetails();
            detailsContent.textContent = details;
            detailsSection.classList.remove('hidden');
            button.textContent = 'Hide Mapping Details';
        } else {
            // Hide details
            detailsSection.classList.add('hidden');
            button.textContent = 'Show Mapping Details';
        }
    }

    generateMappingDetails() {
        let details = 'FIELD MAPPING ANALYSIS\n';
        details += '========================\n\n';
        
        details += `Total JSON fields: ${this.currentMappings.length}\n`;
        details += `Mapped fields: ${this.currentMappings.filter(m => m.matchType !== 'none').length}\n`;
        details += `Unmapped fields: ${this.currentMappings.filter(m => m.matchType === 'none').length}\n\n`;

        details += 'MAPPING DETAILS:\n';
        details += '----------------\n';
        
        this.currentMappings.forEach(mapping => {
            details += `${mapping.jsonField} -> ${mapping.spreadsheetColumn || 'NO MATCH'} [${mapping.matchType.toUpperCase()}]\n`;
        });

        details += '\nAVAILABLE SPREADSHEET COLUMNS:\n';
        details += '------------------------------\n';
        details += this.spreadsheetColumns.join(', ');

        return details;
    }

    updateInsertButtonState() {
        const button = document.getElementById('insert-data');
        const pdfName = document.getElementById('pdf-name').value;
        const hasMappings = this.currentMappings.length > 0;
        const hasMappedFields = this.currentMappings.some(m => m.matchType !== 'none');

        const canInsert = pdfName && hasMappings && hasMappedFields;
        button.disabled = !canInsert;
        
        if (canInsert) {
            button.textContent = 'Insert Data into Spreadsheet';
        } else if (!pdfName) {
            button.textContent = 'Select PDF/Study Name';
        } else if (!hasMappings) {
            button.textContent = 'Enter Valid JSON Data';
        } else {
            button.textContent = 'No Fields to Map';
        }
    }

    insertData() {
        const pdfName = document.getElementById('pdf-name').value;
        const mappedFields = this.currentMappings.filter(m => m.matchType !== 'none');
        
        // Simulate processing delay
        const button = document.getElementById('insert-data');
        const originalText = button.textContent;
        button.textContent = 'Processing...';
        button.disabled = true;

        setTimeout(() => {
            // Add row to worksheet
            const newRow = this.addRowToWorksheet(pdfName, mappedFields);
            
            this.showResults(pdfName, mappedFields);
            button.textContent = originalText;
            this.updateInsertButtonState();
            
            // Update spreadsheet view
            this.updateSpreadsheetView();
        }, 1500);
    }

    showResults(pdfName, mappedFields) {
        const resultsSection = document.getElementById('results-section');
        const resultsContent = document.getElementById('results-content');

        const totalFields = this.currentMappings.length;
        const insertedFields = mappedFields.length;
        const skippedFields = totalFields - insertedFields;

        const exactMatches = mappedFields.filter(m => m.matchType === 'exact').length;
        const partialMatches = mappedFields.filter(m => m.matchType === 'partial').length;

        // Store for download
        this.lastExportData = {
            pdfName: pdfName,
            mappedFields: mappedFields
        };
        
        // Save to history
        this.saveToHistory(pdfName, mappedFields);

        const successMessage = `
            <div class="result-message success">
                ✓ Successfully processed data for ${pdfName}
            </div>
            
            <div class="result-summary">
                <div class="result-stat">
                    <span class="result-stat-value">${insertedFields}</span>
                    <div class="result-stat-label">Fields Inserted</div>
                </div>
                <div class="result-stat">
                    <span class="result-stat-value">${exactMatches}</span>
                    <div class="result-stat-label">Exact Matches</div>
                </div>
                <div class="result-stat">
                    <span class="result-stat-value">${partialMatches}</span>
                    <div class="result-stat-label">Partial Matches</div>
                </div>
                <div class="result-stat">
                    <span class="result-stat-value">${skippedFields}</span>
                    <div class="result-stat-label">Skipped Fields</div>
                </div>
            </div>
            
            <div class="download-section">
                <h3>Download Options:</h3>
                <div class="download-buttons">
                    <button type="button" class="btn btn--primary btn--sm" onclick="mapper.downloadCSV()">
                        📥 Download as CSV
                    </button>
                    <button type="button" class="btn btn--secondary btn--sm" onclick="mapper.downloadJSON()">
                        📄 Download as JSON
                    </button>
                    <button type="button" class="btn btn--secondary btn--sm" onclick="mapper.copyToClipboard()">
                        📋 Copy to Clipboard
                    </button>
                </div>
            </div>
            
            <h3>Inserted Field Mappings:</h3>
            <div class="details-content">
${mappedFields.map(field => `${field.jsonField} -> ${field.spreadsheetColumn} (${field.matchType} match)`).join('\n')}
            </div>
        `;

        resultsContent.innerHTML = successMessage;
        resultsSection.classList.remove('hidden');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    downloadCSV() {
        const worksheet = this.worksheets[this.currentWorksheet];
        
        // Create CSV header
        const headers = this.spreadsheetColumns;
        
        // Create data rows
        const rows = worksheet.data.map(row => {
            return this.spreadsheetColumns.map(col => {
                const value = row[col] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });
        
        // Combine header and data
        const csvContent = [
            headers.join(','),
            ...rows
        ].join('\n');
        
        // Download
        const filename = `${worksheet.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');
    }
    
    downloadCurrentRowCSV() {
        if (!this.lastExportData) return;
        
        const { pdfName, mappedFields } = this.lastExportData;
        
        // Create CSV header
        const headers = ['PDF_Name', ...this.spreadsheetColumns];
        
        // Create data row
        const rowData = [pdfName];
        this.spreadsheetColumns.forEach(col => {
            const mapping = mappedFields.find(m => m.spreadsheetColumn === col);
            rowData.push(mapping ? String(mapping.value) : '');
        });
        
        // Combine header and data
        const csvContent = [
            headers.join(','),
            rowData.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ].join('\n');
        
        // Download
        this.downloadFile(csvContent, `${pdfName.replace('.pdf', '')}_single_row.csv`, 'text/csv');
    }
    
    downloadJSON() {
        if (!this.lastExportData) return;
        
        const { pdfName, mappedFields } = this.lastExportData;
        
        // Create structured JSON
        const jsonData = {
            pdfName: pdfName,
            exportDate: new Date().toISOString(),
            mappedData: {}
        };
        
        // Add PDF_Name to mapped data
        jsonData.mappedData['PDF_Name'] = pdfName;
        
        // Add all mapped fields
        mappedFields.forEach(field => {
            jsonData.mappedData[field.spreadsheetColumn] = field.value;
        });
        
        // Download
        const jsonContent = JSON.stringify(jsonData, null, 2);
        this.downloadFile(jsonContent, `${pdfName.replace('.pdf', '')}_mapped_data.json`, 'application/json');
    }
    
    copyToClipboard() {
        if (!this.lastExportData) return;
        
        const { pdfName, mappedFields } = this.lastExportData;
        
        // Create tab-separated values for easy paste into Excel/Google Sheets
        const headers = ['PDF_Name', ...mappedFields.map(f => f.spreadsheetColumn)];
        const values = [pdfName, ...mappedFields.map(f => f.value)];
        
        const clipboardText = headers.join('\t') + '\n' + values.join('\t');
        
        navigator.clipboard.writeText(clipboardText).then(() => {
            // Show success message
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '✓ Copied!';
            button.classList.add('btn--success');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('btn--success');
            }, 2000);
        }).catch(err => {
            alert('Failed to copy to clipboard');
        });
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    truncateText(text, maxLength) {
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // History Management
    saveToHistory(pdfName, mappedFields) {
        let history = JSON.parse(localStorage.getItem('jsonMapperHistory') || '[]');
        
        const historyEntry = {
            id: Date.now(),
            pdfName: pdfName,
            mappedFields: mappedFields,
            timestamp: new Date().toISOString(),
            fieldCount: mappedFields.length
        };
        
        // Add to beginning of history
        history.unshift(historyEntry);
        
        // Keep only last 20 entries
        history = history.slice(0, 20);
        
        localStorage.setItem('jsonMapperHistory', JSON.stringify(history));
    }
    
    getHistory() {
        return JSON.parse(localStorage.getItem('jsonMapperHistory') || '[]');
    }
    
    loadFromHistory(historyId) {
        const history = this.getHistory();
        const entry = history.find(h => h.id === historyId);
        
        if (entry) {
            // Create JSON object from mapped fields
            const jsonObject = {};
            entry.mappedFields.forEach(field => {
                jsonObject[field.jsonField] = field.value;
            });
            
            // Set the JSON input
            document.getElementById('json-input').value = JSON.stringify(jsonObject, null, 2);
            document.getElementById('pdf-name').value = entry.pdfName;
            
            // Process the JSON
            this.validateAndProcessJSON();
        }
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all mapping history?')) {
            localStorage.removeItem('jsonMapperHistory');
            alert('History cleared successfully');
        }
    }
}

// Initialize the application when DOM is loaded
let mapper; // Global reference for button onclick handlers
document.addEventListener('DOMContentLoaded', () => {
    mapper = new JSONSpreadsheetMapper();
});