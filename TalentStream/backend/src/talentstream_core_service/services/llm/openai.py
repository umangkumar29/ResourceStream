import json
from typing import Dict, Any, List, Optional
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from pydantic import BaseModel, Field
from langsmith import traceable
from langsmith.wrappers import wrap_openai
from talentstream_core_service.configs.config import settings
from .base import BaseLLM

# --- STRICT SCHEMAS FOR LLM EXTRACTION ---
class WorkExperienceExtract(BaseModel):
    role: str = Field(default="")
    company: str = Field(default="")
    duration: str = Field(default="")
    technologies: List[str] = Field(default_factory=list)
    key_achievements: List[str] = Field(default_factory=list)

class KeyProjectExtract(BaseModel):
    project_name: str = Field(default="")
    role_played: str = Field(default="")
    technologies_used: List[str] = Field(default_factory=list)
    description: str = Field(default="")

class CandidateExtract(BaseModel):
    name: str = Field(default="Unknown")
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    total_experience_years: float = Field(default=0.0)
    professional_summary: str = Field(default="")
    skills: List[str] = Field(default_factory=list)
    domain_expertise: List[str] = Field(default_factory=list)
    work_experience: List[WorkExperienceExtract] = Field(default_factory=list)
    key_projects: List[KeyProjectExtract] = Field(default_factory=list)
    education_and_certifications: List[str] = Field(default_factory=list)

class ResumeParseResponse(BaseModel):
    candidate: CandidateExtract


# --- STRUCTURED MATCH EXPLANATION SCHEMA ---
class MatchExplanation(BaseModel):
    """Structured, evidence-backed explanation for why a candidate was matched."""
    matched_skills: List[str] = Field(
        default_factory=list,
        description="Exact skills from the candidate that match the JD requirements."
    )
    matched_experience: List[str] = Field(
        default_factory=list,
        description="Specific experience bullet points from the resume that align with the JD."
    )
    notable_gaps: List[str] = Field(
        default_factory=list,
        description="Skills or experience mentioned in the JD that the candidate appears to lack."
    )
    ai_summary: str = Field(
        default="",
        description="One concise sentence summarizing the overall match quality."
    )


class OpenAILLM(BaseLLM):
    """
    OpenAI implementation for Generative LLM tasks.
    """

    def __init__(self):
        # wrap_openai auto-instruments all calls made by this client to LangSmith
        self._client = (
            wrap_openai(OpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL if settings.OPENAI_BASE_URL else None,
            ))
            if settings.OPENAI_API_KEY
            else None
        )

    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def generate_match_justification(
        self, job_description: str, resume_text: str
    ) -> str:
        """Legacy single-string justification, kept for backward compatibility."""
        if not self._client:
            return "Mock justification: OpenAI API key not configured."

        system_prompt = (
            "You are an expert technical recruiter. Given a job description and a candidate's "
            "resume, produce a concise 2–3 sentence 'Match Justification' that highlights key "
            "matching strengths and any notable gaps. Be specific and factual."
        )
        user_prompt = (
            f"### Job Description\n{job_description}\n\n"
            f"### Candidate Resume\n{resume_text}\n\n"
            "### Match Justification:"
        )

        response = self._client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=256,
        )
        return response.choices[0].message.content.strip()

    @traceable(name="Generate Structured Match Explanation", run_type="chain")
    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def generate_structured_explanation(
        self, job_description: str, candidate_resume_text: str
    ) -> MatchExplanation:
        """
        Uses OpenAI with Pydantic structured outputs to extract a defensible,
        evidence-backed explanation of why a candidate was matched to a job.
        Returns a MatchExplanation object containing matched_skills, matched_experience,
        notable_gaps, and an ai_summary. Fails loudly to trigger Tenacity retries.
        """
        if not self._client:
            # Return a safe default if no API key is configured (e.g., dev/test mode)
            return MatchExplanation(ai_summary="OpenAI API key not configured.")

        prompt = (
            f"### Job Description\n{job_description}\n\n"
            f"### Candidate Resume\n{candidate_resume_text}\n\n"
            "Analyse the candidate against the job description and return a JSON with:\n"
            "- matched_skills: list of exact skills the candidate has that appear in the JD\n"
            "- matched_experience: list of 1-line experience matches (role + tech + years)\n"
            "- notable_gaps: list of things the JD requires that the candidate lacks\n"
            "- ai_summary: one concise sentence summarising the overall match quality\n"
            "Return ONLY the JSON object, no markdown."
        )

        response = self._client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert technical recruiter. Respond only in JSON."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        raw_json = json.loads(response.choices[0].message.content)
        # Pydantic validation — if keys are missing or wrong types, ValidationError
        # bubbles up and triggers the @retry decorator automatically
        return MatchExplanation.model_validate(raw_json)

    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def generate_jd_from_keywords(self, keywords: str, role_title: str) -> str:
        if not self._client:
            return f"Mock JD for {role_title}: OpenAI API key not configured."

        system_prompt = (
            "You are an expert technical writer and recruiter. Create a professional, clear, and "
            "compelling job description based on the provided role title and keywords. "
            "Include sections for 'Role Overview', 'Key Responsibilities', and 'Required Technical Skills'.\n\n"
            "IMPORTANT:\n"
            "- Do not use bold (**) or heading (###) markdown, keep headers as plain text on their own line.\n"
            "- YOU MUST USE the hyphen character '-' for bullet points in the Responsibilities and Skills sections.\n"
            "- Keep formatting clean and suitable for rendering.\n\n"
            "Structure:\n"
            "Job Title\n"
            "Role Overview\n"
            "Key Responsibilities\n"
            "Required Skills\n\n"
            "Keep the tone professional and concise."
        )
        user_prompt = f"Role: {role_title}\nKeywords: {keywords}\n\nGenerate JD:"

        response = self._client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1000,
        )
        return response.choices[0].message.content.strip()

    @traceable(name="Extract Resume JSON", run_type="chain")
    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def parse_resume_to_json(
        self, resume_text: str, base64_images: list[str] = None
    ) -> Dict[str, Any]:
        """
        Parses a raw resume text (and optional base64 images) into the agreed structured JSON schema.
        Using base64 images activates GPT-4o Vision to handle complex layouts (columns, tables).
        """
        fallback_json = {
            "candidate": {
                "name": "Unknown",
                "total_experience_years": 0.0,
                "professional_summary": "AI extraction failed or not configured.",
                "skills": [],
                "domain_expertise": [],
                "work_experience": [],
                "key_projects": [],
                "education_and_certifications": [],
            }
        }

        if not self._client:
            return fallback_json

        system_prompt = (
            "You are an expert resume parser. Use both the extracted text and the resume images together."
            "The images are the primary source for understanding layout, reading order, tables, and visual elements."
            "The extracted text should be used to supplement or verify information that may not be clearly visible in the images"
            "When conflicts occur, prefer the interpretation that best matches the visual layout of the resume. "
            "and return ONLY a valid JSON object — no markdown, no extra text, no code fences.\n\n"
            "The JSON must strictly follow this schema:\n"
            "{\n"
            '  "candidate": {\n'
            '    "name": "string",\n'
            '    "email": "string or null",\n'
            '    "phone": "string or null",\n'
            '    "total_experience_years": number,\n'
            '    "professional_summary": "1-2 sentence summary",\n'
            '    "skills": ["skill1", "skill2", ...],\n'
            '    "domain_expertise": ["domain1", ...],\n'
            '    "work_experience": [\n'
            "      {\n"
            '        "role": "string",\n'
            '        "company": "string",\n'
            '        "duration": "string",\n'
            '        "technologies": ["string"],\n'
            '        "key_achievements": ["string"]\n'
            "      }\n"
            "    ],\n"
            '    "key_projects": [\n'
            "      {\n"
            '        "project_name": "string",\n'
            '        "role_played": "string",\n'
            '        "technologies_used": ["string"],\n'
            '        "description": "string"\n'
            "      }\n"
            "    ],\n"
            '    "education_and_certifications": ["string"]\n'
            "  }\n"
            "}\n\n"
            "Rules:\n"
            "- skills: flat list of ALL skills (technical + soft), no nesting\n"
            "- total_experience_years: numeric only (e.g. 6.5)\n"
            "- email: extract email address if present, else null\n"
            "- phone: extract phone number if present, else null\n"
            "- If a field has no data, use an empty list [] or 0 or null\n"
            "- Return ONLY the JSON, nothing else"
        )
        if base64_images:
            user_content = [
                {
                    "type": "text",
                    "text": f"Extract JSON from the following resume images. Here is a raw text hint (may contain layout errors) as a fallback:\n{resume_text}",
                }
            ]
            for img in base64_images:
                user_content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{img}"},
                    }
                )
        else:
            user_content = f"Resume Text:\n{resume_text}\n\nExtract JSON:"

        response = self._client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        content = response.choices[0].message.content
        if not content:
            return fallback_json

        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        # Parse raw JSON. If it fails, json.JSONDecodeError is raised and triggers @retry
        raw_json = json.loads(content.strip())
        
        # STRICT VALIDATION: Pass through Pydantic to ensure all keys/types are correct.
        # If the LLM missed a required field or hallucinates types, ValidationError is raised and triggers @retry
        validated_data = ResumeParseResponse.model_validate(raw_json)
        
        # Return as standard dict for the rest of the app
        return validated_data.model_dump()
