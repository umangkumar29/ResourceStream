import json
import uuid
from typing import List, Dict, Any

def create_semantic_chunks_from_json(candidate_id: str, resume_json: dict) -> List[Dict[str, Any]]:
    """
    Dynamically generates chunks from the structured resume JSON.
    Iterates through top-level keys to create specific chunks (e.g., 'summary', 'skills')
    or iterates through lists of objects (e.g., 'work_experience') to create individual chunks.
    
    Args:
        candidate_id (str): The UUID of the candidate.
        resume_json (dict): The structured JSON extracted via LLM.
        
    Returns:
        List[Dict]: A list of chunk objects containing text and metadata.
    """
    chunks = []
    section_counter = 0
    
    # Ensure we are working with the inner candidate dict if it exists
    data = resume_json.get("candidate", resume_json)
    
    for section_key, section_data in data.items():
        # Skip empty sections or irrelevant top-level string fields
        if not section_data or section_key in ["name", "email", "phone", "total_experience_years"]:
            continue

        section_counter += 1

        base_metadata = {
            "chunk_id": str(uuid.uuid4()),
            "candidate_id": candidate_id,
            "document_type": "resume",
            "section": section_key,
            "section_name": section_key.replace('_', ' ').title(),
            "section_order": section_counter
        }
            
        # Handle lists of strings (e.g., "skills", "domain_expertise", "education_and_certifications")
        if isinstance(section_data, list) and all(isinstance(item, str) for item in section_data):
            valid_items = [item.strip() for item in section_data if item and str(item).strip()]
            if not valid_items:
                continue
                
            chunk_text = f"{base_metadata['section_name']}:\n" + "\n".join(f"- {item}" for item in valid_items)
            
            metadata = base_metadata.copy()
            metadata["items_count"] = len(valid_items)
            
            chunks.append({
                "candidate_id": candidate_id,
                "chunk_type": section_key,
                "chunk_text": chunk_text,
                "metadata": metadata
            })
            
        # Handle lists of dictionaries (e.g., "work_experience", "key_projects")
        elif isinstance(section_data, list) and all(isinstance(item, dict) for item in section_data):
            for i, entry in enumerate(section_data):
                # Convert the dictionary entry into a highly readable, natural-language mini-document
                chunk_lines = [f"{base_metadata['section_name']}\n"]
                added_fields = 0
                
                for k, v in entry.items():
                    if not v:
                        continue
                        
                    formatted_k = k.replace('_', ' ').title()
                    
                    if isinstance(v, list):
                        valid_list_items = [str(item).strip() for item in v if str(item).strip() and str(item).strip().lower() not in ["n/a", "none", "null"]]
                        if not valid_list_items:
                            continue
                            
                        chunk_lines.append(f"{formatted_k}:")
                        # Use bullet points for descriptive lists, standard lines for shorter items like technologies
                        if any(keyword in formatted_k.lower() for keyword in ["achievement", "responsibilit", "project", "dut"]):
                            for item in valid_list_items:
                                chunk_lines.append(f"• {item}")
                        else:
                            for item in valid_list_items:
                                chunk_lines.append(item)
                        chunk_lines.append("") # Blank line spacer
                        added_fields += 1
                        
                    else:
                        if str(v).strip().lower() not in ["", "n/a", "none", "null"]:
                            chunk_lines.append(f"{formatted_k}: {v}\n")
                            added_fields += 1
                
                # Skip if no meaningful fields were actually added
                if added_fields == 0:
                    continue
                    
                chunk_text = "\n".join(chunk_lines).strip()
                
                # Regenerate a new UUID for each item in a list of dicts, keeping the base candidate metadata
                metadata = base_metadata.copy()
                metadata["chunk_id"] = str(uuid.uuid4())
                
                metadata.update({
                    "entry_index": i,
                    "total_entries": len(section_data),
                    "company_name": entry.get("company"),
                    "job_title": entry.get("role"),
                    "duration": entry.get("duration"),
                    "skills_mentioned": entry.get("technologies", entry.get("technologies_used", []))
                })
                
                # Clean up metadata (remove None values)
                metadata = {k: v for k, v in metadata.items() if v is not None}
                
                chunks.append({
                    "candidate_id": candidate_id,
                    "chunk_type": section_key, # e.g., "work_experience"
                    "chunk_text": chunk_text,
                    "metadata": metadata
                })
                
        # Handle simple string sections (e.g., "professional_summary")
        elif isinstance(section_data, str):
            clean_text = section_data.strip()
            # Skip if the text is too short to be meaningful or is just a placeholder
            if len(clean_text) < 10 or clean_text.lower() in ["n/a", "none", "null", "missing"]:
                continue
                
            chunk_text = f"{base_metadata['section_name']}:\n{clean_text}"
            chunks.append({
                "candidate_id": candidate_id,
                "chunk_type": section_key,
                "chunk_text": chunk_text,
                "metadata": base_metadata.copy()
            })
            
    return chunks
