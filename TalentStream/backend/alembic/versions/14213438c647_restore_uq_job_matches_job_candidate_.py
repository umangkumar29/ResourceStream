"""restore uq_job_matches_job_candidate constraint

Revision ID: 14213438c647
Revises: bc0300d9b761
Create Date: 2026-07-12 11:53:58.423861

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '14213438c647'
down_revision: Union[str, Sequence[str], None] = 'bc0300d9b761'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: constraint uq_job_matches_job_candidate already exists in the database."""
    pass


def downgrade() -> None:
    """No-op."""
    pass
