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

        this.pdfNames = [
            "Lindeskog2018.pdf", "Champeaux2019.pdf", "Chen1992.pdf", "Fernandes2022.pdf",
            "Hernandez-Duranetal..pdf", "HernandezDuran2023.pdf", "Hornig1994.pdf", "Jauss1999.pdf",
            "Kim2016.pdf", "Kudo2007(1).pdf", "Kwon2021.pdf", "Lee2019.pdf", "Mattar2021.pdf",
            "Pfefferkorn2009.pdf", "Raco2003.pdf", "Taylor2020.pdf", "Tsitsopoulos2011_2.pdf",
            "Tsitsopoulos2011.pdf", "Wang2022.pdf", "Winslow2023.pdf", "Won2023.pdf",
            "wonetal..pdf", "Won2024.pdf", "Wu2023.pdf"
        ];

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

    initializeApp() {
        this.populatePDFDropdown();
        this.bindEventListeners();
        this.loadExampleData();
    }

    populatePDFDropdown() {
        const select = document.getElementById('pdf-name');
        this.pdfNames.forEach(pdfName => {
            const option = document.createElement('option');
            option.value = pdfName;
            option.textContent = pdfName;
            select.appendChild(option);
        });
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
        document.getElementById('pdf-name').addEventListener('change', () => {
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
            this.showResults(pdfName, mappedFields);
            button.textContent = originalText;
            this.updateInsertButtonState();
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
        this.downloadFile(csvContent, `${pdfName.replace('.pdf', '')}_mapped_data.csv`, 'text/csv');
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
}

// Initialize the application when DOM is loaded
let mapper; // Global reference for button onclick handlers
document.addEventListener('DOMContentLoaded', () => {
    mapper = new JSONSpreadsheetMapper();
});