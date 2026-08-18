import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

# TODO: Import agent function
from app.langgraph.agents.scraper_agent import (
    scrap_single_fleet,
    map_csv_headers,
    TARGET_LLM_FIELDS,
    TARGET_CUSTOM_FIELDS,
    ALL_TARGET_FIELDS
) 

router = APIRouter()

@router.post("/add")
async def add_fleet(
    file: Optional[UploadFile] = File(None),
    text_prompt: Optional[str] = Form(None)
):
    if not file and not text_prompt:
        raise HTTPException(status_code=400, detail="Must send CSV/Excel file or Filling Query Prompt")

    raw_data = []

    # If using Importing using CSV file
    if file:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="File format not supported")

        # Mapping The Column Using LLM
        original_columns = df.columns.tolist()
        mapped_headers = map_csv_headers(original_columns)
        valid_mapping = {k: v for k, v in mapped_headers.items() if v is not None}

        # Renaming & Filter Column
        df = df.rename(columns=valid_mapping)
        available_target_columns = [col for col in df.columns if col in ALL_TARGET_FIELDS]
        df_filtered = df[available_target_columns]
        
        df_filtered = df_filtered.where(pd.notnull(df_filtered), None)
        raw_data = df_filtered.to_dict(orient="records")

    # If using text prompt
    elif text_prompt:
        raw_data.append({
            "nama_kendaraan": text_prompt
        })

    processed_data = []

    for fleet in raw_data:
        try:
            # Split the data
            llm_payload = {k: v for k, v in fleet.items() if k in TARGET_LLM_FIELDS}
            custom_payload = {k: v for k, v in fleet.items() if k in TARGET_CUSTOM_FIELDS}
            
            # Keeping Vihecle name
            if "nama_kendaraan" not in llm_payload or not llm_payload["nama_kendaraan"]:
                llm_payload["nama_kendaraan"] = "Kendaraan Tidak Diketahui"
            
            # Process To Scrap agent
            enriched_llm_dict = scrap_single_fleet(llm_payload)

            # Merge the data
            final_fleet_dict = {**enriched_llm_dict, **custom_payload}
            
            processed_data.append(final_fleet_dict)
            
        except Exception as e:
            processed_data.append({"error": str(e), "original_data": fleet})

    return {
        "status": "success",
        "message": "Successfully gathered required data",
        "data": processed_data
    }