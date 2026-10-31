"""SQLite Database management and repository for RealityCheck AI."""
import sqlite3
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
from contextlib import contextmanager

from app.config import settings
from app.schemas import AnalysisResponse, AnalysisSummaryItem

logger = logging.getLogger(__name__)

def get_db_path() -> Path:
    return settings.resolved_db_path

@contextmanager
def get_connection(db_path: Optional[Path] = None):
    path = db_path or get_db_path()
    conn = sqlite3.connect(str(path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        # Enable foreign keys and WAL mode for high performance
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db(db_path: Optional[Path] = None):
    """Initialize database tables and indexes."""
    path = db_path or get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    
    with get_connection(path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                claim TEXT NOT NULL,
                context TEXT,
                provider_used TEXT NOT NULL,
                model_used TEXT NOT NULL,
                initial_verdict TEXT NOT NULL,
                final_verdict TEXT NOT NULL,
                assessment_confidence REAL NOT NULL,
                summary TEXT NOT NULL,
                what_changed TEXT NOT NULL,
                full_data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id TEXT NOT NULL,
                step_name TEXT NOT NULL,
                input_data TEXT,
                output_data TEXT,
                duration_ms INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (analysis_id) REFERENCES analyses (id) ON DELETE CASCADE
            );
        """)

        # Indexes for fast querying
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analysis_steps_analysis_id ON analysis_steps(analysis_id);")
        logger.info(f"Initialized SQLite database at {path}")

def save_analysis(analysis: AnalysisResponse, db_path: Optional[Path] = None) -> None:
    """Save an analysis response and its audit steps into SQLite."""
    # Ensure tables exist
    init_db(db_path)
    with get_connection(db_path) as conn:
        full_json = analysis.model_dump_json()
        
        conn.execute("""
            INSERT INTO analyses (
                id, claim, context, provider_used, model_used,
                initial_verdict, final_verdict, assessment_confidence,
                summary, what_changed, full_data_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            analysis.id,
            analysis.claim,
            analysis.context,
            analysis.provider_used,
            analysis.model_used,
            analysis.initial_assessment.initial_verdict,
            analysis.final_judgment.verdict,
            analysis.final_judgment.assessment_confidence,
            analysis.final_judgment.summary,
            analysis.final_judgment.what_changed,
            full_json,
            analysis.created_at
        ))
        
        for step in analysis.audit_steps:
            conn.execute("""
                INSERT INTO analysis_steps (
                    analysis_id, step_name, input_data, output_data, duration_ms, created_at
                ) VALUES (?, ?, ?, ?, ?, ?);
            """, (
                analysis.id,
                step.step_name,
                json.dumps(step.input_summary, ensure_ascii=False),
                json.dumps(step.output_data, ensure_ascii=False),
                step.duration_ms,
                analysis.created_at
            ))

def get_analysis_by_id(analysis_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve full analysis by ID."""
    with get_connection(db_path) as conn:
        cursor = conn.execute("SELECT full_data_json FROM analyses WHERE id = ?;", (analysis_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return json.loads(row["full_data_json"])

def list_analyses(limit: int = 50, offset: int = 0, db_path: Optional[Path] = None) -> List[AnalysisSummaryItem]:
    """Retrieve recent analyses summaries."""
    with get_connection(db_path) as conn:
        cursor = conn.execute("""
            SELECT id, claim, initial_verdict, final_verdict, assessment_confidence,
                   provider_used, model_used, summary, what_changed, full_data_json, created_at
            FROM analyses
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?;
        """, (limit, offset))
        
        rows = cursor.fetchall()
        summaries = []
        for row in rows:
            has_img = False
            try:
                has_img = json.loads(row["full_data_json"]).get("has_image", False)
            except Exception:
                pass
            summaries.append(
                AnalysisSummaryItem(
                    id=row["id"],
                    claim=row["claim"],
                    has_image=has_img,
                    initial_verdict=row["initial_verdict"],
                    final_verdict=row["final_verdict"],
                    assessment_confidence=row["assessment_confidence"],
                    provider_used=row["provider_used"],
                    model_used=row["model_used"],
                    summary=row["summary"],
                    what_changed=row["what_changed"],
                    created_at=row["created_at"]
                )
            )
        return summaries

def delete_analysis_by_id(analysis_id: str, db_path: Optional[Path] = None) -> bool:
    """Delete an analysis and cascaded steps."""
    with get_connection(db_path) as conn:
        cursor = conn.execute("DELETE FROM analyses WHERE id = ?;", (analysis_id,))
        return cursor.rowcount > 0
