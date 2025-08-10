
# Quick Usage Example for JSON to Spreadsheet Tool

from json_to_spreadsheet_tool import JSONToSpreadsheetTool

# 1. Initialize the tool with your spreadsheet
tool = JSONToSpreadsheetTool("pdf_data_extraction_spreadsheet.xlsx")

# 2. Prepare your JSON data (can be nested!)
my_data = {
    "study_design": "Retrospective analysis of patient outcomes",
    "patient_info": {
        "total_patients": 25,
        "age_info": "Mean age 58.3 ± 11.2 years",
        "gender_distribution": "15 male, 10 female"
    },
    "outcomes": {
        "mortality_rates": "5/25 (20%) 30-day mortality",
        "functional_outcomes": "Good outcome (mRS 0-2) in 18/25 (72%)"
    }
}

# 3. Insert the data (specify which PDF/study this belongs to)
result = tool.insert_data(my_data, pdf_name="YourStudy2023.pdf")

# 4. Save the updated spreadsheet
if result["success"]:
    tool.save_spreadsheet("updated_spreadsheet.xlsx")
    print(f"Successfully processed {result['fields_mapped']} fields!")
