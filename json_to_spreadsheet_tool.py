
import pandas as pd
import json
from typing import Dict, Any, List, Optional

class JSONToSpreadsheetTool:
    """
    Tool that takes JSON data (including nested structures) and maps it to 
    spreadsheet columns, automatically handling the field-to-column matching.

    Perfect for extracting structured data from LLMs and organizing it in spreadsheets.
    """

    def __init__(self, spreadsheet_path: str):
        """Initialize with path to Excel spreadsheet"""
        self.spreadsheet_path = spreadsheet_path
        self.df = None
        self.load_spreadsheet()

    def load_spreadsheet(self) -> bool:
        """Load the Excel spreadsheet"""
        try:
            self.df = pd.read_excel(self.spreadsheet_path)
            # Convert columns to object type to handle mixed data types
            for col in self.df.columns:
                if col != 'PDF_Name':
                    self.df[col] = self.df[col].astype('object')
            print(f"✅ Loaded spreadsheet: {self.df.shape[0]} rows, {self.df.shape[1]} columns")
            return True
        except Exception as e:
            print(f"❌ Error loading spreadsheet: {e}")
            return False

    def flatten_json(self, data: Dict, parent_key: str = '', separator: str = '_') -> Dict:
        """
        Flatten nested JSON data into a single-level dictionary

        Args:
            data: The nested JSON/dictionary to flatten
            parent_key: Current parent key for nested items
            separator: Separator to use between nested keys

        Returns:
            Flattened dictionary
        """
        flattened = {}

        for key, value in data.items():
            new_key = f"{parent_key}{separator}{key}" if parent_key else key

            if isinstance(value, dict):
                # Recursively flatten nested dictionaries
                flattened.update(self.flatten_json(value, new_key, separator))
            else:
                # Convert to string and add to flattened data
                flattened[new_key] = str(value) if value is not None else ""

        return flattened

    def smart_field_mapping(self, json_data: Dict) -> Dict:
        """
        Intelligently map JSON fields to spreadsheet columns

        Args:
            json_data: The JSON data (can be nested)

        Returns:
            Dictionary with spreadsheet column names as keys
        """
        # First, flatten any nested JSON
        flattened = self.flatten_json(json_data)

        # Get available spreadsheet columns
        spreadsheet_columns = list(self.df.columns)

        # Create the final mapped data
        mapped_data = {}

        # Define mapping strategies in order of preference
        mapping_strategies = [
            # 1. Exact match
            lambda field: field if field in spreadsheet_columns else None,

            # 2. Remove prefixes and match the last part
            lambda field: field.split('_')[-1] if field.split('_')[-1] in spreadsheet_columns else None,

            # 3. Remove all underscores and match
            lambda field: field.replace('_', '') if field.replace('_', '') in spreadsheet_columns else None,

            # 4. Case-insensitive exact match
            lambda field: next((col for col in spreadsheet_columns if col.lower() == field.lower()), None),

            # 5. Case-insensitive partial match (last part)
            lambda field: next((col for col in spreadsheet_columns if col.lower() == field.split('_')[-1].lower()), None),
        ]

        # Apply mapping strategies
        for json_field, value in flattened.items():
            matched_column = None

            for strategy in mapping_strategies:
                matched_column = strategy(json_field)
                if matched_column:
                    break

            # If still no match, try advanced pattern matching
            if not matched_column:
                json_parts = json_field.lower().split('_')
                for col in spreadsheet_columns:
                    col_parts = col.lower().split('_')

                    # Check for significant overlapping parts
                    common_parts = set(json_parts) & set(col_parts)
                    if common_parts and any(len(part) > 3 for part in common_parts):
                        matched_column = col
                        break

            # Add to mapped data if we found a match
            if matched_column and value:
                mapped_data[matched_column] = value
                print(f"  ✅ Mapped '{json_field}' -> '{matched_column}'")

        return mapped_data

    def insert_data(self, json_data: Dict, pdf_name: Optional[str] = None) -> Dict:
        """
        Insert JSON data into the appropriate spreadsheet row

        Args:
            json_data: JSON/dictionary with extracted data
            pdf_name: Optional PDF name if not included in json_data

        Returns:
            Dictionary with insertion results
        """
        if not isinstance(json_data, dict):
            return {"success": False, "error": "Input must be a dictionary/JSON object"}

        # Determine the PDF name
        target_pdf = json_data.get('PDF_Name', pdf_name)
        if not target_pdf:
            return {"success": False, "error": "PDF_Name must be provided in JSON data or as parameter"}

        # Find the target row
        target_row_idx = None
        for idx, row in self.df.iterrows():
            if row['PDF_Name'] == target_pdf:
                target_row_idx = idx
                break

        if target_row_idx is None:
            return {"success": False, "error": f"PDF '{target_pdf}' not found in spreadsheet"}

        # Map JSON fields to spreadsheet columns
        print(f"🔄 Mapping fields for {target_pdf}...")
        mapped_data = self.smart_field_mapping(json_data)

        # Ensure PDF_Name is included
        mapped_data['PDF_Name'] = target_pdf

        # Insert data into spreadsheet
        inserted_count = 0
        for column, value in mapped_data.items():
            if column in self.df.columns:
                self.df.at[target_row_idx, column] = value
                inserted_count += 1

        result = {
            "success": True,
            "pdf_name": target_pdf,
            "row_index": target_row_idx + 1,
            "fields_mapped": len(mapped_data),
            "fields_inserted": inserted_count,
            "mapped_fields": list(mapped_data.keys())
        }

        print(f"✅ Successfully inserted {inserted_count} fields for {target_pdf}")
        return result

    def save_spreadsheet(self, output_path: Optional[str] = None) -> bool:
        """Save the updated spreadsheet"""
        save_path = output_path or self.spreadsheet_path
        try:
            self.df.to_excel(save_path, index=False)
            print(f"💾 Spreadsheet saved: {save_path}")
            return True
        except Exception as e:
            print(f"❌ Error saving: {e}")
            return False

    def preview_data(self, pdf_name: str) -> Dict:
        """Preview populated data for a specific PDF"""
        row_data = self.df[self.df['PDF_Name'] == pdf_name]
        if row_data.empty:
            return {}

        row_dict = row_data.iloc[0].to_dict()
        populated = {k: v for k, v in row_dict.items() if pd.notna(v) and str(v).strip()}

        return populated

    def get_population_stats(self) -> Dict:
        """Get statistics about data population across all columns"""
        stats = {}
        total_rows = len(self.df)

        for col in self.df.columns:
            filled = self.df[col].notna().sum()
            stats[col] = {
                'filled': int(filled),
                'empty': int(total_rows - filled),
                'percentage': round((filled / total_rows) * 100, 1)
            }

        return stats

# Example usage
if __name__ == "__main__":
    # Initialize the tool
    tool = JSONToSpreadsheetTool("your_spreadsheet.xlsx")

    # Example nested JSON data from LLM extraction
    extracted_data = {
        "study_design": "Retrospective cohort study",
        "patient_data": {
            "total_patients": 42,
            "age_info": "Mean age 65.2 ± 12.1 years",
            "gender_distribution": "25 male (59.5%), 17 female (40.5%)"
        },
        "outcomes": {
            "mortality_rates": "18/42 (42.9%) poor prognosis at discharge",
            "functional_outcomes": "Good outcome in 60% of patients"
        }
    }

    # Insert the data (will automatically map nested fields to columns)
    result = tool.insert_data(extracted_data, pdf_name="Study2023.pdf")

    if result["success"]:
        print(f"Mapped {result['fields_mapped']} fields")

        # Save the updated spreadsheet
        tool.save_spreadsheet("updated_spreadsheet.xlsx")

        # Preview the results
        preview = tool.preview_data("Study2023.pdf")
        print(f"Populated {len(preview)} fields for Study2023.pdf")
